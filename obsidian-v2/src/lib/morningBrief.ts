import type { App } from "obsidian";
import { BRIEF_HEADINGS, BRIEF_HEADING_PATTERNS } from "../../shared/report-headings.mjs";
import { reviewPlainText, reviewTables } from "./ytReview";

export interface YtTrendingRow {
	title: string;
	creator: string;
	views: string;
	posted: string;
}

export interface MorningBrief {
	path: string;
	date: string;
	headlines: string[];
	/** intel's ## Top Story lead paragraph (empty for legacy formats) */
	topStory: string;
	ytTrending: YtTrendingRow[];
	xVoices: string[];
	contentOpportunities: string[];
	webCount: number;
	xVoicesCount: number;
	hnCount: number;
	repoCount: number;
}

// converged 2026-08-14: interactive /morning-intel writes research/morning-intel
// natively and the runner now matches; reports/morning stays as legacy fallback
export const MORNING_DIRS = [
	"inbox/research/morning-intel",
	"inbox/reports/morning",
];

export async function findLatestBrief(app: App): Promise<string | null> {
	const mds: string[] = [];
	for (const dir of MORNING_DIRS) {
		if (!(await app.vault.adapter.exists(dir))) continue;
		const listing = await app.vault.adapter.list(dir);
		for (const f of listing.files) {
			if (f.endsWith(".md") && !f.endsWith("_index.md")) mds.push(f);
		}
	}
	if (mds.length === 0) return null;
	// morning-intel is THE morning source — among the newest date's files,
	// prefer the -intel deliverable over legacy morning-report/routine
	const dateOf = (p: string) => p.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
	mds.sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
	const newest = mds[mds.length - 1]!;
	const newestDate = dateOf(newest);
	const intel = mds
		.filter((f) => dateOf(f) === newestDate && /-intel/.test(f))
		.pop();
	return intel ?? newest;
}

export async function readLatestBrief(app: App): Promise<MorningBrief | null> {
	const path = await findLatestBrief(app);
	if (!path) return null;
	const raw = await app.vault.adapter.read(path);
	return parseBrief(path, raw);
}

export function briefMarkdown(raw: string): string {
	let fence = "";
	return raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n")
		.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, "")
		.split("\n")
		.map(line => {
			const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
			const marker = delimiter?.[1];
			if (fence) {
				if (marker && marker[0] === fence[0] && marker.length >= fence.length && !delimiter?.[2]?.trim()) fence = "";
				return "";
			}
			if (!marker) return line;
			fence = marker;
			return "";
		})
		.join("\n")
		.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
}

export function parseBrief(path: string, raw: string): MorningBrief {
	raw = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
	// Date — try frontmatter, then **Date:** line, then filename prefix
	let date = "";
	const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
	if (fmMatch) {
		const dm = fmMatch[1]!.match(/^date:\s*(.+)$/m);
		if (dm) date = dm[1]!.trim();
	}
	if (!date) {
		const dm = raw.match(/\*\*(?:Date|Data):\*\*\s*(\S+)/);
		if (dm) date = dm[1]!.trim();
	}
	if (!date) {
		const fileM = path.match(/(\d{4}-\d{2}-\d{2})/);
		if (fileM) date = fileM[1]!;
	}

	const body = briefMarkdown(raw);

	// two section views:
	//   flat — every ##/### heading is its own bucket (routine nests
	//          "### Headlines" under "## 📡 …")
	//   deep — ## buckets INCLUDE their ### children (intel nests
	//          "### YouTube video ideas" under "## So What — Content Plan")
	// findSection prefers a non-empty flat hit, then falls back to deep.
	const flat = new Map<string, string>();
	const deep = new Map<string, string>();
	{
		let curFlat = "_pre";
		let curDeep = "_pre";
		let bufFlat: string[] = [];
		let bufDeep: string[] = [];
		for (const line of body.split("\n")) {
			const m = line.match(/^(#{1,3})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/);
			if (m) {
				flat.set(curFlat, bufFlat.join("\n").trim());
				curFlat = m[1] === "#" ? "_pre" : m[2]!;
				bufFlat = [];
				if (m[1] !== "###") {
					deep.set(curDeep, bufDeep.join("\n").trim());
					curDeep = curFlat;
					bufDeep = [];
					continue;
				}
			}
			if (!m) bufFlat.push(line);
			bufDeep.push(line);
		}
		flat.set(curFlat, bufFlat.join("\n").trim());
		deep.set(curDeep, bufDeep.join("\n").trim());
	}

	const findIn = (map: Map<string, string>, needle: string | RegExp, exact = false): string | undefined => {
		for (const [k, v] of map.entries()) {
			if (needle instanceof RegExp ? needle.test(k)
				: exact ? k.toLowerCase() === needle.toLowerCase()
				: k.toLowerCase().includes(needle.toLowerCase())) return v;
		}
		return undefined;
	};
	const findSection = (needle: string | RegExp, exact = false) =>
		findIn(flat, needle, exact) || findIn(deep, needle, exact);

	// A dedicated Portuguese headline section takes precedence over the summary.
	const headlines = extractBullets(
		findIn(flat, BRIEF_HEADINGS.headlines, true) ??
		findIn(flat, BRIEF_HEADINGS.summary, true) ??
		(findIn(flat, "TL;DR") || findIn(flat, "Headlines") || ""),
	);

	const oppsBody = findIn(deep, BRIEF_HEADING_PATTERNS.plan) || findIn(deep, "So What") ||
		findIn(deep, BRIEF_HEADINGS.opportunities, true) || findSection(BRIEF_HEADINGS.opportunities, true) ||
		findIn(deep, "Content Opportunities") || findSection("Content Opportunities") || "";
	const contentOpportunities = extractOpportunities(oppsBody);

	const ytBody = findSection(BRIEF_HEADING_PATTERNS.youtube) ||
		findSection(BRIEF_HEADINGS.youtubeTrending, true);
	const ytTrending = parseYtTable(ytBody || findSection("YouTube") || "");

	const xBody = findSection(BRIEF_HEADINGS.x, true) || findSection("X / Twitter") || findSection("X — ") || "";
	const xVoices = extractXVoices(xBody);

	const webCount =
		countBullets(findSection(BRIEF_HEADING_PATTERNS.ai) || findSection("AI News")) ||
		countBullets(findSection(BRIEF_HEADINGS.web, true)) ||
		countBullets(findSection("Web —")) ||
		countBullets(findSection("Web "));
	const xVoicesCount = xVoices.length || countBullets(xBody);
	const hnBody = findSection(BRIEF_HEADINGS.hn, true);
	const hnTable = [...reviewTables(hnBody || "")].find(({ labels }) =>
		labels.some(label => /^(?:notícia|story|title)$/.test(label)) &&
		labels.some(label => /^(?:pontos|points|pts)$/.test(label)) &&
		labels.some(label => /^(?:comentários|comments)$/.test(label)));
	const hnCount = hnTable?.rows.length || countBullets(hnBody || findSection("Hacker News"));
	const repoCount = countRepos(
		findSection(BRIEF_HEADING_PATTERNS.github) ||
		findSection(BRIEF_HEADINGS.githubActivity, true) || findSection("GitHub") || "",
	);

	// intel's Top Story lead — first non-empty paragraph, links stripped
	const topStory = reviewPlainText((findIn(flat, BRIEF_HEADING_PATTERNS.topStory) ?? findIn(flat, "Top Story") ?? "")
		.split(/\n\s*\n/)[0]!)
		.replace(/https?:\/\/\S+/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 320);

	return {
		path,
		date,
		headlines,
		topStory,
		ytTrending,
		xVoices,
		contentOpportunities,
		webCount,
		xVoicesCount,
		hnCount,
		repoCount,
	};
}

function parseYtTable(body: string): YtTrendingRow[] {
	const out: YtTrendingRow[] = [];
	for (const { labels, rows } of reviewTables(body)) {
		const column = (...names: string[]) => labels.findIndex(label => names.includes(label));
		const title = column("video", "title", "vídeo", "título");
		const creator = column("creator", "channel", "canal", "criador");
		const views = column("views", "visualizações");
		const posted = column("posted", "published", "publicado", "publicação", "idade");
		if (title < 0 || creator < 0 || views < 0) continue;
		for (const cells of rows) {
			out.push({
				title: cells[title]!,
				creator: cells[creator]!,
				views: cells[views]!,
				posted: cells[posted] ?? "",
			});
		}
	}
	return out;
}

function extractXVoices(body: string): string[] {
	// Look for the "Top voices:" sub-bullet group first
	const lines = body.split("\n");
	const voices: string[] = [];
	let inVoices = false;
	for (const raw of lines) {
		const line = raw.trim();
		if (/^[-*]\s+\*\*(?:Top voices|Vozes em destaque|Principais vozes):?\*\*/i.test(line)) {
			inVoices = true;
			continue;
		}
		if (inVoices) {
			if (/^[-*]\s+\*\*[A-Z]/.test(line)) {
				// next top-level bullet — stop
				if (!raw.startsWith("  ") && !raw.startsWith("\t")) break;
			}
			// nested bullet ("  - " or "    - ")
			const nested = line.match(
				/^\s*[-*]\s+\*\*([^*]+):?\*\*\s*[:—-]?\s*["“]?([^"”]*)["”]?\s*$/,
			);
			if (nested) {
				const who = nested[1]!.replace(/:$/, "").trim();
				const what = nested[2]!.trim();
				voices.push(what ? `${who}: ${what}` : who);
			}
		}
	}
	if (voices.length > 0) return voices;
	// Fallback: take top bullets in section
	return extractBullets(body)
		.slice(0, 3)
		.map((b) => b.replace(/\*\*([^*]+)\*\*/g, "$1").trim());
}

function extractBullets(body: string): string[] {
	return body
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => /^[-*]\s+/.test(l))
		.map((l) => l.replace(/^[-*]\s+/, ""));
}

function countBullets(body: string | undefined): number {
	return extractBullets(body || "").length;
}

function countRepos(body: string): number {
	// Best-effort — counts inline code-fenced repo refs like `owner/name` or bullets
	const ticks = body.match(/`[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+`/g);
	return ticks ? ticks.length : countBullets(body);
}

/** Read ranked idea titles, preserving list hierarchy instead of promoting
 * each nested supporting field into a separate opportunity. */
function extractOpportunities(body: string): string[] {
	let lines = body.split("\n");
	// The content plan can also include LinkedIn posts and short-form spin-offs.
	// Its ranked YouTube list is the dashboard's primary opportunity list.
	const youtube = lines.findIndex(line => /^#{3,6}\s+.*\byoutube\b/i.test(line));
	if (youtube >= 0) {
		const depth = lines[youtube]!.match(/^#+/)![0].length;
		const end = lines.findIndex((line, index) => index > youtube && /^(#{2,6})\s/.test(line) && line.match(/^#+/)![0].length <= depth);
		lines = lines.slice(youtube + 1, end < 0 ? undefined : end);
	}
	const entries: { indent: number; text: string; numbered: boolean }[] = [];
	let fenced = false;
	for (const line of lines) {
		if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; continue; }
		if (fenced) continue;
		const entry = /^([ \t]*)([-*+]|\d+[.)])\s+(.+)$/.exec(line);
		if (entry) entries.push({ indent: entry[1]!.replace(/\t/g, "    ").length, text: entry[3]!, numbered: /^\d/.test(entry[2]!) });
	}
	const indent = Math.min(...entries.map(entry => entry.indent));
	const topLevel = entries.filter(entry => entry.indent === indent);
	const numbered = topLevel.filter(entry => entry.numbered);
	const candidates = numbered.length ? numbered : topLevel;
	const titles = candidates.map(entry => {
		const bold = /^(?:\*\*([^*]+)\*\*|__([^_]+)__)/.exec(entry.text);
		const title = (bold?.[1] ?? bold?.[2] ?? entry.text).trim();
		// A bold field label such as "Hook:" is supporting metadata, not a title.
		if (bold && /:\s*$/.test(title)) return "";
		return reviewPlainText(title).replace(/^["“]([^"”]+)["”](?=\s*(?:\(|$))/, "$1").trim();
	}).filter(Boolean);
	return [...new Set(titles)];
}
