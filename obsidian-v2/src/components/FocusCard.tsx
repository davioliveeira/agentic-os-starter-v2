import { h } from "preact";

interface Props {
	focus: string;
}

export function FocusCard({ focus }: Props) {
	return (
		<div className="aos-v2-cc-panel">
			<div className="aos-v2-cc-panel-head">
				<span className="aos-v2-cc-panel-label">Foco atual</span>
			</div>
			<div className="aos-v2-cc-panel-body">
				{focus ? (
					<p className="aos-v2-cc-focus-text">{focus}</p>
				) : (
					<p className="aos-v2-cc-mono aos-v2-cc-dim">
						&gt; nenhum foco definido para hoje
					</p>
				)}
			</div>
		</div>
	);
}
