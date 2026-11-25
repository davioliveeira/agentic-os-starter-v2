import type { App, TFile } from "obsidian";
import { dailySections } from "../../shared/daily-note.mjs";

export const SUPPORTED_SCHEMA_VERSION = 1;

export interface DailyNoteFrontmatter {
	date: string;
	schema_version: number;
	focus?: string;
	top3?: string[];
	top3_done?: boolean[];
	effort?: number | null;
	focus_blocks?: number | null;
	posts_shipped?: Record<string, number>;
	videos_shipped_today?: number;
}

export interface Top3Item {
	text: string;
	done: boolean;
}

export interface ScheduleEntry {
	time: string;
	title: string;
}

export interface DriverItem {
	text: string;
	done: boolean;
}

export interface DailyNoteRead {
	path: string;
	date: string;
	schemaVersion: number;
	supported: boolean;
	focus: string;
	top3: Top3Item[];
	schedule: ScheduleEntry[];
	drivers: DriverItem[];
	activityLog: string;
	notes: string;
	eodReflection: string;
}

export function todayIso(): string {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function todayPath(): string {
	return `daily-notes/${todayIso()}.md`;
}

function parseTop3(section: string, doneFromFm: boolean[] | undefined): Top3Item[] {
	const items: Top3Item[] = [];
	for (const line of section.split(/\r?\n/)) {
		const m = line.match(/^\s*\d+\.\s+\[([ xX])\]\s+(.*)$/);
		if (m) {
			items.push({
				text: m[2]!.trim(),
				done: m[1]!.toLowerCase() === "x",
			});
		}
	}
	// Preserve completion recorded by /close-day in `top3_done`.
	if (doneFromFm) {
		for (let i = 0; i < items.length && i < doneFromFm.length; i++) {
			const flag = doneFromFm[i];
			if (flag !== undefined) {
				items[i]!.done = items[i]!.done || flag;
			}
		}
	}
	return items;
}

function parseSchedule(section: string): ScheduleEntry[] {
	const out: ScheduleEntry[] = [];
	for (const line of section.split(/\r?\n/)) {
		const m = line.match(/^\s*-\s+(\d{2}:\d{2})\s+[—\-–]\s+(.+)$/);
		if (m) out.push({ time: m[1]!, title: m[2]!.trim() });
	}
	return out;
}

function parseDrivers(section: string): DriverItem[] {
	const out: DriverItem[] = [];
	for (const line of section.split(/\r?\n/)) {
		const m = line.match(/^\s*-\s+\[([ xX])\]\s+(.*)$/);
		if (m) out.push({ text: m[2]!.trim(), done: m[1]!.toLowerCase() === "x" });
	}
	return out;
}

export async function readDailyNote(
	app: App,
	path: string = todayPath(),
): Promise<DailyNoteRead | null> {
	const file = app.vault.getAbstractFileByPath(path);
	if (!file || !("extension" in file)) return null;
	const tfile = file as TFile;

	const fmCache = app.metadataCache.getFileCache(tfile)?.frontmatter as
		| DailyNoteFrontmatter
		| undefined;

	const raw = await app.vault.cachedRead(tfile);
	const sections = new Map<string, string>();
	for (const { key, bodyStart, end } of dailySections(raw)) {
		if (key && !sections.has(key)) {
			sections.set(key, raw.slice(bodyStart, end).replace(/\r\n/g, "\n").trim());
		}
	}

	const schemaVersion = fmCache?.schema_version ?? 0;
	const supported = schemaVersion === SUPPORTED_SCHEMA_VERSION;

	return {
		path,
		date: fmCache?.date ?? path.replace(/^.*\//, "").replace(/\.md$/, ""),
		schemaVersion,
		supported,
		focus: (fmCache?.focus || sections.get("focus") || "").trim(),
		top3: parseTop3(sections.get("priorities") ?? "", fmCache?.top3_done),
		schedule: parseSchedule(sections.get("schedule") ?? ""),
		drivers: parseDrivers(sections.get("drivers") ?? ""),
		activityLog: sections.get("activity") ?? "",
		notes: sections.get("notes") ?? "",
		eodReflection: sections.get("reflection") ?? "",
	};
}
