import type { App, TFile } from "obsidian";
import { Notice } from "obsidian";
import { appendDailySectionLine, dailySectionKey, dailySections, findDailySection } from "../../shared/daily-note.mjs";
import { assertVoiceVault, v2VoiceTransport } from "./v2-voice";

async function guardedModify(app: App, file: TFile, before: string, after: string): Promise<boolean> {
	try {
		await assertVoiceVault(app);
		const response = await v2VoiceTransport("/notes/replace", {
			method: "POST",
			body: JSON.stringify({ path: file.path, before, after }),
		});
		if (response.status !== 200) throw new Error(response.json?.error || "Não foi possível editar a nota");
		return true;
	} catch (error) {
		new Notice(String(error));
		return false;
	}
}

function findTaskSection(raw: string, heading: string) {
	const key = dailySectionKey(heading);
	return key ? findDailySection(raw, key) : dailySections(raw).find((section) => section.name === heading.trim());
}

function toggleCheckbox(state: string): string {
	return state.toLowerCase() === "x" ? " " : "x";
}

/** Toggle the first matching checkbox in a bulleted list under `heading`. */
export async function toggleTaskByText(
	app: App,
	path: string,
	heading: string,
	text: string,
): Promise<boolean> {
	const file = app.vault.getAbstractFileByPath(path);
	if (!file || !("extension" in file)) return false;
	const tfile = file as TFile;
	const raw = await app.vault.read(tfile);
	const section = findTaskSection(raw, heading);
	if (!section) return false;

	const target = text.trim();
	const { bodyStart, end } = section;
	const lines = raw.slice(bodyStart, end).split("\n");
	for (const [i, line] of lines.entries()) {
		const m = line.match(/^([ \t]*-[ \t]+\[)([ xX])(\][ \t]+)(.*?)(\r?)$/);
		if (!m || m[4]!.trim() !== target) continue;
		lines[i] = `${m[1]}${toggleCheckbox(m[2]!)}${m[3]}${m[4]}${m[5]}`;
		return guardedModify(app, tfile, raw, raw.slice(0, bodyStart) + lines.join("\n") + raw.slice(end));
	}
	return false;
}

/**
 * Append a new `- [ ] text` line under the section `## <heading>`,
 * just before the next heading or end of file.
 */
export async function addTaskToSection(
	app: App,
	path: string,
	heading: string,
	text: string,
): Promise<boolean> {
	const trimmed = text.trim();
	if (!trimmed) return false;

	const file = app.vault.getAbstractFileByPath(path);
	if (!file || !("extension" in file)) return false;
	const tfile = file as TFile;
	const raw = await app.vault.read(tfile);
	const section = findTaskSection(raw, heading);
	if (!section) return false;
	return guardedModify(app, tfile, raw, appendDailySectionLine(raw, section, `- [ ] ${trimmed}`));
}

function editPriorityLine(
	raw: string,
	section: NonNullable<ReturnType<typeof findDailySection>>,
	index: number,
	edit: (match: RegExpMatchArray) => string,
): string | undefined {
	const { bodyStart, end } = section;
	const lines = raw.slice(bodyStart, end).split("\n");
	for (const [i, line] of lines.entries()) {
		const m = line.match(/^([ \t]*(\d+)\.[ \t]+\[)([ xX])(\][ \t]+)(.*?)(\r?)$/);
		if (!m || Number(m[2]) !== index + 1) continue;
		lines[i] = edit(m);
		return raw.slice(0, bodyStart) + lines.join("\n") + raw.slice(end);
	}
	return undefined;
}

function updateTop3Frontmatter(raw: string, index: number, text: string): string {
	const opening = raw.match(/^\uFEFF?---[ \t]*\r?\n/);
	if (!opening) return raw;
	const start = opening[0].length;
	const rest = raw.slice(start);
	const end = rest.search(/^---[ \t]*\r?$/m);
	if (end < 0) return raw;

	const lines = rest.slice(0, end).split("\n");
	let inTop3 = false;
	let slot = 0;
	for (const [i, line] of lines.entries()) {
		if (/^top3:[ \t]*\r?$/.test(line)) {
			inTop3 = true;
			slot = 0;
		} else if (inTop3 && line.startsWith("  - ")) {
			if (slot++ !== index) continue;
			lines[i] = `  - ${JSON.stringify(text)}${line.endsWith("\r") ? "\r" : ""}`;
			return raw.slice(0, start) + lines.join("\n") + rest.slice(end);
		} else if (inTop3 && /^\S/.test(line)) {
			break;
		}
	}
	return raw;
}

/**
 * Set the text content of a Top 3 slot by index, preserving the checkbox state.
 * If the line for index doesn't exist yet, appends an unchecked entry with the
 * correct number prefix. Also updates frontmatter `top3` array.
 */
export async function setTop3TextByIndex(
	app: App,
	path: string,
	index: number,
	text: string,
): Promise<boolean> {
	if (index < 0 || index > 2) return false;
	const file = app.vault.getAbstractFileByPath(path);
	if (!file || !("extension" in file)) return false;
	const tfile = file as TFile;
	const raw = await app.vault.read(tfile);
	const section = findDailySection(raw, "priorities");
	if (!section) return false;
	const trimmed = text.trim();
	const edited = editPriorityLine(raw, section, index, (m) => `${m[1]}${m[3]}${m[4]}${trimmed}${m[6]}`)
		?? appendDailySectionLine(raw, section, `${index + 1}. [ ] ${trimmed}`);
	return guardedModify(app, tfile, raw, updateTop3Frontmatter(edited, index, trimmed));
}

/**
 * Toggle a numbered Top 3 item by position (0-2).
 * Format on disk: `1. [ ] text` / `1. [x] text`.
 */
export async function toggleTop3ByIndex(
	app: App,
	path: string,
	index: number,
): Promise<boolean> {
	if (index < 0 || index > 2) return false;
	const file = app.vault.getAbstractFileByPath(path);
	if (!file || !("extension" in file)) return false;
	const tfile = file as TFile;
	const raw = await app.vault.read(tfile);
	const section = findDailySection(raw, "priorities");
	if (!section) return false;
	const edited = editPriorityLine(raw, section, index, (m) => `${m[1]}${toggleCheckbox(m[3]!)}${m[4]}${m[5]}${m[6]}`);
	return edited === undefined ? false : guardedModify(app, tfile, raw, edited);
}
