import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readMorningReport, readVaultMarkdown, setVaultRoot } from '../lib/vault';
import { TIME_ZONE } from '../../obsidian-v2/shared/timezone.mjs';

const date = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
const intel = `inbox/research/morning-intel/${date}-intel.md`;
const legacy = `inbox/reports/morning/${date}-morning.md`;

function fixture(t: TestContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-morning-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  setVaultRoot(root);
  return (rel: string, markdown: string) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, markdown);
  };
}

test('morning intel reads the Portuguese summary and inbox from their own sections', (t) => {
  const write = fixture(t);
  const markdown = [
    '\ufeff# Boletim diário de IA',
    '## Resumo das fontes',
    '- Esta lista não é o resumo',
    '```markdown',
    '## Resumo',
    '- Esta manchete está em um exemplo',
    '```',
    '## Resumo',
    '- **[ACME/my_repo ships v2](https://example.com/my_repo)**',
    '* Outra manchete',
    '## Notícia principal',
    '- Este item está fora do resumo',
    '## Caixa de entrada (últimas 24h)',
    '~3 conversas verificadas',
    '### Pendências',
    '- **Resposta necessária** — Re: `client_id`',
    '## Plano de conteúdo',
    '- **Pauta** que não pertence à caixa de entrada',
  ].join('\r\n');
  write(intel, markdown);

  assert.deepEqual(readMorningReport(), {
    rel: intel,
    heads: ['ACME/my_repo ships v2', 'Outra manchete'],
    links: ['https://example.com/my_repo', null],
    inbox: ['~3 conversas verificadas', 'Resposta necessária — Re: client_id'],
  });
  assert.equal(readVaultMarkdown(intel), markdown);
});

test('an explicit Manchetes section can be nested and an Inbox can end at EOF', (t) => {
  const write = fixture(t);
  write(legacy, '## Notícias\n### Manchetes\n- Primeira\n- Segunda\n### Contexto\n- Fora da seção\n' +
    '## Inbox Brief (last 24h)\n- **Reply** — Shipping confirmation');

  assert.deepEqual(readMorningReport(1), {
    rel: legacy,
    heads: ['Primeira'],
    links: [null],
    inbox: ['Reply — Shipping confirmation'],
  });
  assert.deepEqual(readMorningReport()?.heads, ['Primeira', 'Segunda']);
});

test('today’s legacy English intel report takes precedence over a legacy English headlines report', (t) => {
  const write = fixture(t);
  write('inbox/research/morning-intel/2000-01-01-intel.md', '## TL;DR\n- Old story');
  assert.equal(readMorningReport(), null);

  write(legacy, '## News\n### Headlines\n- **Fallback story**\n### More\n- Other story');
  assert.deepEqual(readMorningReport()?.heads, ['Fallback story']);

  write(intel, '## TL;DR\n- Main story\n### Context\n- Other story\n## Inbox (last 24h)\n**Reply**');
  assert.deepEqual(readMorningReport(), {
    rel: intel,
    heads: ['Main story'],
    links: [null],
    inbox: ['Reply'],
  });
});
