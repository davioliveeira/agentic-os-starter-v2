"""
GitHub Trending fetcher.

Pulls repos created in the last 7 / 30 days, ranked by stars, PLUS a third
"fastest growing" metric (star velocity over active AI/dev repos regardless of
creation date), classifies AI/dev relevance, writes a markdown file at:

    <VAULT>/inbox/research/github-trending/YYYY-MM-DD-trending.md

Format mirrors legacy capture so chase-command-center's parseTrendingRepos()
keeps rendering. Frozen schema — see skill.md.

The velocity metric needs cross-run state: each run snapshots star counts of an
active AI/dev pool into velocity-state.json next to the output, and ranks by
stars-gained-per-day vs the prior snapshot. First run = baseline only (no prior
snapshot to diff against), so the section renders a placeholder until run 2.

Direct-exec from the agentic-os runner. No AI in the loop.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

# --- config

# Report dates follow the computer's own time zone.
CT = datetime.now().astimezone().tzinfo
TOP_WEEK = 10
TOP_MONTH = 5
TOP_VELOCITY = 10
# "Fastest growing" = github.com/trending — GitHub's own stars-gained ranking.
# Unlike the week/month metrics (which filter on created:<date> and so can only
# ever see brand-new repos), this surfaces a repo of ANY age that is suddenly
# ripping — including mid-size sleepers that a stars-sorted API query can't reach
# (the top of that list is all mega-repos). The page gives stars-gained directly,
# so no cross-run state is needed; we enrich the top AI/dev picks with one API
# call each for created_at + topics.
# Two windows: ?since=daily (last 24h — be on top of same-day spikes) and
# ?since=monthly (last 30d — the durable breakouts).
TRENDING_URL_TMPL = "https://github.com/trending?since={since}"
# (since, heading-label, growth-suffix)
VELOCITY_WINDOWS = [
    ("daily", "24h", "today"),
    ("monthly", "30d", "this month"),
]
USER_AGENT = "agentic-os-github-trending/1.0"

AI_KEYWORDS = [
    "ai", "ai-", "llm", "gpt", "claude", "anthropic", "agent", "mcp",
    "prompt", "embedding", "rag", "deepseek", "kimi", "gemini", "openai",
    "copilot", "codex", "fine-tun", "transformer", "ollama", "langchain",
    "chatgpt",
]


def vault_root() -> Path:
    """Mirror runner.js path resolution."""
    env = os.environ.get("AGENTIC_OS_VAULT")
    if env:
        return Path(env)
    # Best-effort ~/.claude/.env parse
    dotenv = Path.home() / ".claude" / ".env"
    if dotenv.exists():
        for line in dotenv.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            if k.strip() == "AGENTIC_OS_VAULT":
                return Path(v.strip().strip('"').strip("'"))
    return Path.home() / "the-vault"


def gh_search(created_since: str, per_page: int) -> list[dict]:
    """GitHub Search API — repos created since date, sorted by stars."""
    url = (
        "https://api.github.com/search/repositories"
        f"?q=created:%3E{created_since}&sort=stars&order=desc&per_page={per_page}"
    )
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", USER_AGENT)
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8"))
            return data.get("items", []) or []
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"github http {e.code}: {e.read().decode('utf-8', 'ignore')[:300]}\n")
        raise
    except urllib.error.URLError as e:
        sys.stderr.write(f"github url error: {e.reason}\n")
        raise


_ARTICLE_RE = '<article class="Box-row">'
_NAME_RE = __import__("re").compile(r'<h2[^>]*>\s*<a[^>]*href="/([^"?]+)"', __import__("re").S)
_GROWTH_RE = __import__("re").compile(r'([\d,]+)\s*stars (?:this month|today|this week)')


def fetch_trending(since: str) -> list[dict]:
    """Scrape github.com/trending?since=<since> for {full_name, _growth_stars}.
    The page lacks reliable stars/desc/topics markup, so those come from the API
    enrichment step. Page order IS the growth ranking. Returns in that order."""
    req = urllib.request.Request(TRENDING_URL_TMPL.format(since=since))
    req.add_header("User-Agent", USER_AGENT)
    req.add_header("Accept", "text/html")
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8")

    out: list[dict] = []
    for blk in html.split(_ARTICLE_RE)[1:]:
        nm = _NAME_RE.search(blk)
        if not nm:
            continue
        full = nm.group(1).strip().strip("/")
        if full.count("/") != 1:
            continue
        growth_m = _GROWTH_RE.search(blk)
        out.append({
            "full_name": full,
            "_growth_stars": int(growth_m.group(1).replace(",", "")) if growth_m else 0,
        })
    return out


def gh_repo(full: str) -> dict:
    """Fetch a single repo for stars + created_at + topics + description (the
    trending HTML lacks them). Best-effort — returns {} on any error."""
    url = f"https://api.github.com/repos/{full}"
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", USER_AGENT)
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError) as e:
        sys.stderr.write(f"enrich {full} failed: {e}\n")
        return {}


def compute_velocity(since: str) -> list[dict]:
    """Top AI/dev repos by star growth over <since> window. Enriches EACH
    candidate via the API first (stars/desc/topics/created) so is_ai_dev can judge
    it, then keeps the first TOP_VELOCITY that pass. Returns [] if the scrape fails
    (the rest of the report still renders without it)."""
    try:
        trending = fetch_trending(since)
    except (urllib.error.HTTPError, urllib.error.URLError, UnicodeDecodeError) as e:
        sys.stderr.write(f"trending scrape ({since}) failed: {e}\n")
        return []
    picks: list[dict] = []
    for t in trending:
        if len(picks) >= TOP_VELOCITY:
            break
        meta = gh_repo(t["full_name"])
        if not meta:
            continue
        repo = {
            "full_name": meta.get("full_name") or t["full_name"],
            "html_url": meta.get("html_url") or f"https://github.com/{t['full_name']}",
            "stargazers_count": meta.get("stargazers_count", 0),
            "language": meta.get("language"),
            "description": meta.get("description") or "",
            "topics": meta.get("topics") or [],
            "created_at": meta.get("created_at") or "",
            "_growth_stars": t["_growth_stars"],
        }
        if is_ai_dev(repo):
            picks.append(repo)
    # Candidates are gathered in page order (already growth-weighted by GitHub);
    # sort the captured set by the raw growth number so the rendered list is
    # monotonic and the "ranked by stars gained" label holds true.
    picks.sort(key=lambda r: r.get("_growth_stars", 0), reverse=True)
    return picks


def is_ai_dev(repo: dict) -> bool:
    topics = [t.lower() for t in (repo.get("topics") or [])]
    desc = (repo.get("description") or "").lower()
    haystack = " ".join(topics) + " " + desc
    return any(kw in haystack for kw in AI_KEYWORDS)


def fmt_repo(rank: int, repo: dict) -> str:
    name = repo.get("name", "")
    owner = (repo.get("owner") or {}).get("login", "")
    full = repo.get("full_name") or f"{owner}/{name}"
    url = repo.get("html_url", f"https://github.com/{full}")
    stars = repo.get("stargazers_count", 0)
    language = repo.get("language") or "—"
    created_iso = (repo.get("created_at") or "")[:10]
    topics = repo.get("topics") or []
    desc = repo.get("description") or ""
    ai_tag = " **[AI/DEV]**" if is_ai_dev(repo) else ""
    topics_str = ", ".join(topics[:5]) if topics else "nenhum"

    return (
        f"### {rank}. [{full}]({url}){ai_tag}\n"
        f"- **Estrelas:** {stars:,} | **Linguagem:** {language}\n"
        f"- **Criado em:** {created_iso}\n"
        f"- **Tópicos:** {topics_str}\n"
        f"- **Descrição:** {desc}\n"
    )


def fmt_velocity_repo(rank: int, repo: dict, growth_suffix: str) -> str:
    """Same block shape as fmt_repo (so the cockpit parser keeps working) plus a
    Growth line and the all-important Created date — surfacing that a repo born
    months ago is the one ripping now. growth_suffix is e.g. 'today' / 'this
    month'."""
    full = repo.get("full_name") or ""
    url = repo.get("html_url", f"https://github.com/{full}")
    stars = repo.get("stargazers_count", 0)
    language = repo.get("language") or "—"
    created_iso = (repo.get("created_at") or "")[:10]
    topics = repo.get("topics") or []
    desc = repo.get("description") or ""
    ai_tag = " **[AI/DEV]**" if is_ai_dev(repo) else ""
    topics_str = ", ".join(topics[:5]) if topics else "nenhum"
    growth = repo.get("_growth_stars", 0)
    created_note = f" (criado em {created_iso})" if created_iso else ""

    return (
        f"### {rank}. [{full}]({url}){ai_tag}\n"
        f"- **Crescimento:** +{growth:,} estrelas {growth_suffix}{created_note}\n"
        f"- **Estrelas:** {stars:,} | **Linguagem:** {language}\n"
        f"- **Criado em:** {created_iso or 'sem data'}\n"
        f"- **Tópicos:** {topics_str}\n"
        f"- **Descrição:** {desc}\n"
    )


def render(
    weekly: list[dict],
    monthly: list[dict],
    velocity_day: list[dict],
    velocity_month: list[dict],
    now_ct: datetime,
) -> str:
    date_str = now_ct.strftime("%Y-%m-%d")
    weekday = ("segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo")[now_ct.weekday()]
    time_str = now_ct.strftime("%H:%M")

    weekly_blocks = "\n".join(fmt_repo(i + 1, r) for i, r in enumerate(weekly[:TOP_WEEK]))
    monthly_blocks = "\n".join(fmt_repo(i + 1, r) for i, r in enumerate(monthly[:TOP_MONTH]))
    def velocity_section(items: list[dict], suffix: str) -> str:
        if items:
            return "\n".join(
                fmt_velocity_repo(i + 1, r, suffix)
                for i, r in enumerate(items[:TOP_VELOCITY])
            )
        return "_A lista de tendências ficou indisponível nesta execução._\n"

    velocity_day_blocks = velocity_section(velocity_day, "hoje")
    velocity_month_blocks = velocity_section(velocity_month, "neste mês")

    ai_count = sum(1 for r in weekly[:TOP_WEEK] if is_ai_dev(r))
    top_ai = next((r for r in weekly[:TOP_WEEK] if is_ai_dev(r)), None)
    if top_ai:
        top_full = top_ai.get("full_name", "")
        top_url = top_ai.get("html_url", "")
        top_stars = f"{top_ai.get('stargazers_count', 0):,}"
        top_desc = top_ai.get("description") or "(sem descrição)"
        radar_block = (
            f"- **Repositórios de IA e desenvolvimento:** {ai_count} de {TOP_WEEK}\n"
            f"- **Destaque de IA:** [{top_full}]({top_url}) - {top_stars} estrelas\n"
            f"- **Por que vale conferir:** {top_desc}\n"
        )
    else:
        radar_block = (
            f"- **Repositórios de IA e desenvolvimento:** {ai_count} de {TOP_WEEK}\n"
            f"- **Destaque de IA:** nenhum identificado\n"
            f"- **Por que vale conferir:** —\n"
        )

    return (
        f"# Repositórios em alta no GitHub - {date_str} ({weekday})\n\n"
        f"## {TOP_WEEK} repositórios em alta na semana\n"
        f"_Repositórios criados nos últimos sete dias, ordenados por estrelas_\n\n"
        f"{weekly_blocks}\n"
        f"---\n\n"
        f"## {TOP_MONTH} repositórios em alta no mês\n"
        f"_Repositórios criados nos últimos 30 dias, ordenados por estrelas_\n\n"
        f"{monthly_blocks}\n"
        f"---\n\n"
        f"## {TOP_VELOCITY} em maior crescimento (24h)\n"
        f"_Repositórios de IA e desenvolvimento de qualquer época, "
        f"ordenados pelas estrelas ganhas hoje na lista diária do GitHub_\n\n"
        f"{velocity_day_blocks}\n"
        f"---\n\n"
        f"## {TOP_VELOCITY} em maior crescimento (30d)\n"
        f"_Repositórios de IA e desenvolvimento de qualquer época, "
        f"ordenados pelas estrelas ganhas no mês na lista mensal do GitHub_\n\n"
        f"{velocity_month_blocks}\n"
        f"---\n\n"
        f"## Radar de conteúdo\n"
        f"{radar_block}\n"
        f"_Gerado automaticamente em {date_str} às {time_str}_\n"
    )


def main() -> int:
    vault = vault_root()
    out_dir = vault / "inbox" / "research" / "github-trending"
    out_dir.mkdir(parents=True, exist_ok=True)

    now_ct = datetime.now(CT)
    week_cutoff = (now_ct - timedelta(days=7)).date().isoformat()
    month_cutoff = (now_ct - timedelta(days=30)).date().isoformat()

    weekly = gh_search(week_cutoff, TOP_WEEK)
    monthly = gh_search(month_cutoff, TOP_MONTH)
    # Fastest growing: GitHub's trending feeds (24h + 30d), AI/dev-filtered + enriched.
    velocity_day = compute_velocity("daily")
    velocity_month = compute_velocity("monthly")

    body = render(weekly, monthly, velocity_day, velocity_month, now_ct)
    out_path = out_dir / f"{now_ct.strftime('%Y-%m-%d')}-trending.md"
    out_path.write_text(body, encoding="utf-8")

    # First-line summary for runner log + Activity Feed row
    ai_count = sum(1 for r in weekly[:TOP_WEEK] if is_ai_dev(r))
    print(
        f"Relatório salvo em {out_path.relative_to(vault)}. {len(weekly)} na semana e "
        f"{len(monthly)} no mês, com {ai_count} de IA e desenvolvimento. "
        f"Em maior crescimento: {len(velocity_day)} em 24h e {len(velocity_month)} em 30d."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
