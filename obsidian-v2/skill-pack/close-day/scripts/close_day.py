"""
close_day.py — End-of-day write-back to today's daily note.

Updates frontmatter (effort, focus_blocks, posts_shipped, videos_shipped_today,
top3_done) and replaces the body of the daily reflection.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections.abc import Iterator
from datetime import datetime
from pathlib import Path

# The vault: named by the environment when the dashboard starts this, otherwise the folder it is run from.
VAULT_ROOT = Path(os.environ.get("AGENTIC_OS_VAULT") or os.environ.get("AOS_V2_VAULT") or os.getcwd())
DAILY_DIR = VAULT_ROOT / "daily-notes"
PRIORITY_TITLES = ("3 prioridades", "Top 3 Priorities")
REFLECTION_TITLES = ("Reflexão do dia", "EOD Reflection")
SECTION_HEADING = re.compile(r"^ {0,3}(#{1,2})(?:[ \t]+(.*))?$")
CODE_FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
PLATFORMS = ("youtube", "blog", "linkedin", "x", "instagram", "tiktok")


def parse_posts(raw: str | None) -> dict[str, int]:
    out = dict.fromkeys(PLATFORMS, 0)
    if not raw:
        return out
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if "=" not in chunk:
            continue
        k, v = chunk.split("=", 1)
        k = k.strip().lower()
        try:
            out[k] = int(v.strip())
        except (ValueError, KeyError):
            continue
    return out


def split_frontmatter(raw: str) -> tuple[str, str, str]:
    """Return the YAML, the text after the closing delimiter, and the line ending."""
    opening = re.match(r"---(\r?\n)", raw)
    if opening is None:
        raise ValueError("a abertura do frontmatter falta no começo do arquivo")
    closing = re.compile(r"^---(?=\r?$)", re.MULTILINE).search(raw, opening.end())
    if closing is None:
        raise ValueError("falta o fechamento do frontmatter")
    return raw[opening.end() : closing.start()], raw[closing.end() :], opening[1]


def markdown_lines(body: str) -> Iterator[tuple[str, int, int]]:
    """Yield lines outside fenced code with their original offsets."""
    fence = ""
    offset = 0
    for raw_line in body.splitlines(keepends=True):
        end = offset + len(raw_line)
        line = raw_line.rstrip("\r\n")
        match = CODE_FENCE.match(line)
        if match:
            marker, info = match.groups()
            if not fence:
                fence = marker
            elif marker.startswith(fence) and not info.strip():
                fence = ""
        elif not fence:
            yield line, offset, end
        offset = end


def section_bounds(body: str, titles: tuple[str, ...]) -> tuple[int, int] | None:
    """Find the body of the first matching level-two heading."""
    content_start = None
    for line, start, end in markdown_lines(body):
        match = SECTION_HEADING.match(line.rstrip())
        if not match:
            continue
        if content_start is not None:
            return content_start, start
        level, title = match.groups()
        title = re.sub(r"[ \t]+#+$", "", title or "").strip()
        if level == "##" and title in titles:
            content_start = end
    if content_start is not None:
        return content_start, len(body)
    return None


def parse_top3_done_from_body(body: str) -> list[bool]:
    """Read the numbered priority checkboxes in the daily note."""
    out = [False, False, False]
    bounds = section_bounds(body, PRIORITY_TITLES)
    if bounds is None:
        return out
    start, end = bounds
    for line, _, _ in markdown_lines(body[start:end]):
        m = re.match(r"^\s*(\d+)\.\s+\[([ xX])\]\s+", line)
        if m:
            idx = int(m.group(1)) - 1
            if 0 <= idx < 3:
                out[idx] = m.group(2).lower() == "x"
    return out


def update_frontmatter(
    fm: str,
    effort: int | None,
    blocks: int | None,
    posts: dict[str, int],
    videos: int | None,
    top3_done: list[bool],
    newline: str,
) -> str:
    """Crude line-based YAML edit. Schema is small + flat so this is safer than
    a full YAML round-trip (which may reorder + reflow user-edited keys)."""
    out: list[str] = []
    in_posts_block = False
    posts_start = None
    posts_indent = None
    for line in fm.splitlines():
        stripped = line.lstrip()
        if in_posts_block and stripped and not stripped.startswith("#"):
            if line == stripped:
                in_posts_block = False
            else:
                indent = line[: -len(stripped)]
                if posts_indent is None:
                    posts_indent = indent
                if indent == posts_indent and stripped.partition(":")[0] in PLATFORMS:
                    continue

        if line.startswith("effort:") and effort is not None:
            out.append(f"effort: {effort}")
        elif line.startswith("focus_blocks:") and blocks is not None:
            out.append(f"focus_blocks: {blocks}")
        elif line.startswith("videos_shipped_today:") and videos is not None:
            out.append(f"videos_shipped_today: {videos}")
        elif line.startswith("top3_done:"):
            done_lit = (
                "[" + ", ".join("true" if v else "false" for v in top3_done) + "]"
            )
            out.append(f"top3_done: {done_lit}")
        elif line.startswith("posts_shipped:"):
            out.append("posts_shipped:")
            in_posts_block = True
            posts_start = len(out)
        else:
            out.append(line)

    if posts_start is None and any(posts.values()):
        out.append("posts_shipped:")
        posts_start = len(out)
    if posts_start is not None:
        indent = posts_indent or "  "
        out[posts_start:posts_start] = [f"{indent}{k}: {posts.get(k, 0)}" for k in PLATFORMS]

    return newline.join(out) + newline if out else ""


def replace_eod_section(body: str, text: str, newline: str) -> str:
    reflection = newline.join(text.strip().splitlines())
    bounds = section_bounds(body, REFLECTION_TITLES)
    if bounds is None:
        separator = ""
        if not body.endswith(newline * 2):
            separator = newline if body.endswith(newline) else newline * 2
        return f"{body}{separator}## {REFLECTION_TITLES[0]}{newline * 2}{reflection}{newline}"

    start, end = bounds
    before, after = body[:start], body[end:]
    if not before.endswith("\n"):
        before += newline
    separator = newline if after else ""
    return f"{before}{newline}{reflection}{newline}{separator}{after}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--effort", type=int, default=None)
    ap.add_argument("--blocks", type=int, default=None)
    ap.add_argument(
        "--posts", default=None, help='por exemplo: "youtube=1,linkedin=2,x=1"'
    )
    ap.add_argument("--videos", type=int, default=None)
    ap.add_argument("--text", default="", help="texto da reflexão")
    ap.add_argument("--date", default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    date = args.date or datetime.now().strftime("%Y-%m-%d")
    path = DAILY_DIR / f"{date}.md"

    if not path.exists():
        print(
            json.dumps(
                {
                    "status": "missing",
                    "path": str(path),
                    "message": "A nota diária dessa data ainda não existe. Execute /today primeiro.",
                },
                indent=2,
            )
        )
        return 1

    raw = path.read_bytes().decode("utf-8")
    fm, body, newline = split_frontmatter(raw)
    posts = parse_posts(args.posts)
    top3_done = parse_top3_done_from_body(body)

    # videos_shipped_today is independent of posts_shipped (YouTube video uploads,
    # not generic post counts). Only update if --videos explicitly given.
    fm_new = update_frontmatter(
        fm,
        effort=args.effort,
        blocks=args.blocks,
        posts=posts,
        videos=args.videos,
        top3_done=top3_done,
        newline=newline,
    )
    body_new = replace_eod_section(body, args.text, newline)

    rebuilt = f"---{newline}{fm_new}---{body_new}"

    if args.dry_run:
        print(
            json.dumps(
                {
                    "status": "dry-run",
                    "path": str(path),
                    "top3_done": top3_done,
                    "posts": posts,
                    "effort": args.effort,
                    "blocks": args.blocks,
                    "videos": args.videos,
                    "preview": rebuilt,
                },
                indent=2,
            )
        )
        return 0

    path.write_bytes(rebuilt.encode("utf-8"))
    print(
        json.dumps(
            {
                "status": "updated",
                "path": str(path),
                "effort": args.effort,
                "blocks": args.blocks,
                "posts": posts,
                "videos_shipped_today": args.videos,
                "top3_done": top3_done,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
