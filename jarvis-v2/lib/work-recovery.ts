import { readDraft, saveDraft, type DraftStorage } from '../../obsidian-v2/shared/drafts';

export type RecoverySelection = { provider: 'codex' | 'claude'; model: string };
export type SavedRequest = { prompt: string; title: string; selection: RecoverySelection; skill?: string; args?: Record<string, unknown> };
export type RecoveredDraft = { selection: RecoverySelection; title: string; prompt: string; skill?: string; args?: Record<string, unknown> };
const metadataKey = (key: string) => key + ':recovery';

export function readRecoveredDraft(storage: DraftStorage, key: string): RecoveredDraft | null {
  try {
    const value = JSON.parse(storage.getItem(metadataKey(key)) || 'null');
    return value && ['codex', 'claude'].includes(value.selection?.provider) && typeof value.selection?.model === 'string' && typeof value.title === 'string' && typeof value.prompt === 'string' && value.prompt.trim() && readDraft(storage,key) === value.prompt ? value : null;
  } catch { return null; }
}

export function clearRecoveredDraft(storage: DraftStorage, key: string): boolean {
  try { storage.removeItem(metadataKey(key)); return true; } catch { return false; }
}

export function stageRecoveredDraft(storage: DraftStorage, key: string, request: SavedRequest): RecoveredDraft {
  const prompt = request.skill ? `Fluxo: ${request.skill}\n\nArgumentos:\n${JSON.stringify(request.args || {}, null, 2)}` : request.prompt;
  const existing = readDraft(storage, key);
  if (existing && existing !== prompt) throw new Error('Já existe um rascunho de nova tarefa. Abra Novo terminal e salve ou limpe o rascunho antes de recuperar esta solicitação.');
  const metadata = { selection: request.selection, title: request.title, prompt, ...(request.skill ? {skill:request.skill,args:request.args||{}} : {}) };
  try {
    storage.setItem(metadataKey(key), JSON.stringify(metadata));
    if (!saveDraft(storage, key, prompt)) throw new Error('Não foi possível salvar o rascunho');
  } catch { throw new Error('Não foi possível salvar a solicitação recuperada neste dispositivo. A original continua salva com a tarefa.'); }
  return metadata;
}

// This is an explicit copy to a new composer, never a retry of expired work.
// Retain the old draft even if the new composer is occupied or storage fails.
export function stageExpiredTaskDraft(storage: DraftStorage, sourceKey: string, destinationKey: string, text: string, task: { title: string; provider: 'codex' | 'claude'; model: string }): RecoveredDraft {
  if (!text.trim()) throw new Error('Não há rascunho para copiar.');
  if (!saveDraft(storage, sourceKey, text)) throw new Error('Não foi possível salvar o rascunho neste dispositivo. Copie-o antes de sair desta tarefa.');
  if (readDraft(storage, destinationKey) || readRecoveredDraft(storage, destinationKey)) throw new Error('Já existe um rascunho de nova tarefa. Abra Novo terminal e salve ou limpe o rascunho existente antes de copiar este.');
  return stageRecoveredDraft(storage, destinationKey, { prompt: text, title: `Rascunho da tarefa ${task.title}`, selection: { provider: task.provider, model: task.model } });
}

export function updateRecoveryText(storage: DraftStorage, key: string, metadata: RecoveredDraft | null, text: string): RecoveredDraft | null {
  if (!saveDraft(storage, key, text)) throw new Error('Não foi possível salvar o rascunho neste dispositivo. Copie-o antes de recarregar.');
  if (!metadata || !text.trim()) {
    if (!clearRecoveredDraft(storage, key)) throw new Error('Não foi possível limpar os dados de recuperação do rascunho.');
    return null;
  }
  const next = { ...metadata, prompt: text };
  try { storage.setItem(metadataKey(key), JSON.stringify(next)); }
  catch { throw new Error('O rascunho foi salvo. Houve uma falha ao salvar o provedor original. Recupere a solicitação novamente antes de enviá-la.'); }
  return next;
}
