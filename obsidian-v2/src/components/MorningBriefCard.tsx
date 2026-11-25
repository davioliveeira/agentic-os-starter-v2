import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Notice } from "obsidian";
import type { App } from "obsidian";
import { writeIntent } from "../lib/queue";
import {
	MORNING_DIRS,
	readLatestBrief,
	type MorningBrief,
} from "../lib/morningBrief";

interface Props {
	app: App;
}

export function MorningBriefCard({ app }: Props) {
	const [brief, setBrief] = useState<MorningBrief | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const refresh = async () => {
			const b = await readLatestBrief(app);
			if (!cancelled) setBrief(b);
		};
		void refresh();
		const handler = (file: { path: string }) => {
			if (MORNING_DIRS.some((f) => file.path.startsWith(f))) void refresh();
		};
		app.vault.on("modify", handler);
		app.vault.on("create", handler);
		return () => {
			cancelled = true;
			app.vault.off("modify", handler);
			app.vault.off("create", handler);
		};
	}, [app]);

	const runNew = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await writeIntent(app, "morning-intel", {});
		} catch (e) {
			new Notice(`Não foi possível iniciar o fluxo: ${e}`);
		} finally {
			setBusy(false);
		}
	};

	const openFull = () => {
		if (!brief) return;
		void app.workspace.openLinkText(brief.path, "", true);
	};

	if (!brief) {
		return (
			<section className="aos-v2-cc-morning aos-v2-cc-morning--empty">
				<header className="aos-v2-cc-morning-head">
					<span className="aos-v2-cc-morning-title">§ BOLETIM DE IA</span>
					<span className="aos-v2-cc-morning-meta aos-v2-cc-dim">
						nenhum boletim
					</span>
					<button
						type="button"
						className="aos-v2-cc-yt-review-btn"
						onClick={() => void runNew()}
						disabled={busy}
					>
						GERAR NOVO ↻
					</button>
				</header>
				<p className="aos-v2-cc-morning-empty-msg aos-v2-cc-mono aos-v2-cc-dim">
					&gt; clique em GERAR NOVO para preparar o boletim de hoje
				</p>
			</section>
		);
	}

	return (
		<section className="aos-v2-cc-morning">
			<header className="aos-v2-cc-morning-head">
				<span className="aos-v2-cc-morning-title">§ BOLETIM DE IA</span>
				<span className="aos-v2-cc-morning-window">{brief.date}</span>
				<span className="aos-v2-cc-morning-chips">
					<span className="aos-v2-cc-morning-chip">
						<span className="aos-v2-cc-morning-chip-count">
							{brief.headlines.length}
						</span>
						MANCHETES
					</span>
					<span className="aos-v2-cc-morning-chip">
						<span className="aos-v2-cc-morning-chip-count">{brief.webCount}</span>
						ARTIGOS
					</span>
					{brief.xVoicesCount > 0 ? (
						<span className="aos-v2-cc-morning-chip">
							<span className="aos-v2-cc-morning-chip-count">
								{brief.xVoicesCount}
							</span>
							NO X
						</span>
					) : (
						<span className="aos-v2-cc-morning-chip">
							<span className="aos-v2-cc-morning-chip-count">
								{brief.hnCount}
							</span>
							HN
						</span>
					)}
					<span className="aos-v2-cc-morning-chip">
						<span className="aos-v2-cc-morning-chip-count">{brief.repoCount}</span>
						REPOSITÓRIOS
					</span>
					<span className="aos-v2-cc-morning-chip aos-v2-cc-morning-chip--opp">
						<span className="aos-v2-cc-morning-chip-count">
							{brief.contentOpportunities.length}
						</span>
						OPORTUNIDADES
					</span>
				</span>
				<span className="aos-v2-cc-morning-actions">
					<button
						type="button"
						className="aos-v2-cc-yt-review-btn"
						onClick={openFull}
						title="abrir relatório completo"
					>
						COMPLETO ↗
					</button>
					<button
						type="button"
						className="aos-v2-cc-yt-review-btn"
						onClick={() => void runNew()}
						disabled={busy}
						title="Executar fluxo"
					>
						↻
					</button>
				</span>
			</header>

			<div className="aos-v2-cc-morning-body">
				<div className="aos-v2-cc-morning-col">
					<div className="aos-v2-cc-morning-col-label">▸ MANCHETES</div>
					{brief.headlines.length === 0 ? (
						<p className="aos-v2-cc-morning-col-empty aos-v2-cc-dim">
							nenhuma manchete encontrada
						</p>
					) : (
						<ul className="aos-v2-cc-morning-bullets">
							{brief.headlines.slice(0, 3).map((h, i) => (
								<li key={i} className="aos-v2-cc-morning-bullet">
									{stripMd(h)}
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="aos-v2-cc-morning-col aos-v2-cc-morning-col--yt">
					<div className="aos-v2-cc-morning-col-label">▶ EM ALTA NO YOUTUBE</div>
					{brief.ytTrending.length === 0 ? (
						<p className="aos-v2-cc-morning-col-empty aos-v2-cc-dim">
							nenhum dado do YouTube encontrado
						</p>
					) : (
						<ul className="aos-v2-cc-morning-yt-list">
							{brief.ytTrending.slice(0, 3).map((v, i) => (
								<li key={i} className="aos-v2-cc-morning-yt-item">
									<span className="aos-v2-cc-morning-yt-title">
										{stripMd(v.title)}
									</span>
									<span className="aos-v2-cc-morning-yt-meta">
										<span className="aos-v2-cc-morning-yt-creator">
											{stripMd(v.creator)}
										</span>
										<span className="aos-v2-cc-morning-yt-views">
											{v.views}
										</span>
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
				{/* intel folds X into AI News and leads with a Top Story —
				    show that; the X column only renders for legacy briefs */}
				{brief.topStory ? (
					<div className="aos-v2-cc-morning-col aos-v2-cc-morning-col--x">
						<div className="aos-v2-cc-morning-col-label">◆ NOTÍCIA PRINCIPAL</div>
						<p className="aos-v2-cc-morning-topstory">{brief.topStory}</p>
					</div>
				) : (
					<div className="aos-v2-cc-morning-col aos-v2-cc-morning-col--x">
						<div className="aos-v2-cc-morning-col-label">𝕏 DISCUSSÃO</div>
						{brief.xVoices.length === 0 ? (
							<p className="aos-v2-cc-morning-col-empty aos-v2-cc-dim">
								nenhuma discussão do X encontrada
							</p>
						) : (
							<ul className="aos-v2-cc-morning-x-list">
								{brief.xVoices.slice(0, 3).map((v, i) => (
									<li key={i} className="aos-v2-cc-morning-x-item">
										{stripMd(v)}
									</li>
								))}
							</ul>
						)}
					</div>
				)}
				<div className="aos-v2-cc-morning-col aos-v2-cc-morning-col--opp">
					<div className="aos-v2-cc-morning-col-label">★ OPORTUNIDADES DE CONTEÚDO</div>
					{brief.contentOpportunities.length === 0 ? (
						<p className="aos-v2-cc-morning-col-empty aos-v2-cc-dim">
							nenhuma oportunidade encontrada
						</p>
					) : (
						<ol className="aos-v2-cc-morning-opps">
							{brief.contentOpportunities.slice(0, 3).map((o, i) => (
								<li key={i} className="aos-v2-cc-morning-opp">
									<span className="aos-v2-cc-morning-opp-num">{i + 1}</span>
									<span className="aos-v2-cc-morning-opp-text">{o}</span>
								</li>
							))}
						</ol>
					)}
				</div>
			</div>
		</section>
	);
}

function stripMd(s: string): string {
	return s
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
