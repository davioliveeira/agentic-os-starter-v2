import test from 'node:test';
import assert from 'node:assert/strict';
import {createJiti} from 'jiti';
const {parseBrief}=await createJiti(import.meta.url).import('../src/lib/morningBrief.ts');
const {parseHeadlines,parseIntelOutlierTable}=await createJiti(import.meta.url).import('../src/lib/reports.ts');
const parse=body=>parseBrief('inbox/research/morning-intel/2026-09-15-intel.md',body);

test('ranked opportunity titles retain their order without counting nested supporting fields',()=>{
 const report=parse(`## So What — Content Plan
A short introduction before the platform sections.
### YouTube (ranked)
1. **"First useful idea." (A comparison)**
   - **Hook:** A spoken opening.
   - **Rides:** Supporting story.
   - **Franchise:** Existing series.
   - **Urgency:** This week.
2. **"Second useful idea"**
   - **Hook:** Another opening.
   - **Evidence:** More detail.
3. **"Third useful idea"**
   - **Format:** A demonstration.
4. **"Fourth useful idea"** Extra context.
5. **"Fifth useful idea"**
### LinkedIn
1. **A separate LinkedIn adaptation**
### Shorts / carousels
- **Short:** An excerpt.
## Source Status
- **A source label**
`);
 assert.deepEqual(report.contentOpportunities,['First useful idea. (A comparison)','Second useful idea','Third useful idea','Fourth useful idea','Fifth useful idea']);
 assert.deepEqual(report.contentOpportunities.slice(0,3),['First useful idea. (A comparison)','Second useful idea','Third useful idea']);
});

test('legacy bulleted opportunities ignore deeper numbered explanations and generic bold field labels',()=>{
 const report=parse(`## Content Opportunities
- **[A useful walkthrough](https://example.com/a)** — More description.
  1. **A supporting step**
  2. **Another step**
- **Why now:** Evidence for the preceding idea.
- **Second useful walkthrough** — More description.
  - **Hook:** An opening.
- **Third useful walkthrough**
`);
 assert.deepEqual(report.contentOpportunities,['A useful walkthrough','Second useful walkthrough','Third useful walkthrough']);
});

test('plain ranked titles, parenthesis numbering, quoted bullets and duplicates stay readable',()=>{
 assert.deepEqual(parse('## Content Opportunities\n1) First idea\n2) [Second idea](https://example.com)\n3) Third idea').contentOpportunities,['First idea','Second idea','Third idea']);
 assert.deepEqual(parse('## Content Opportunities\n- “First idea”\n- "Second idea"\n- “First idea”').contentOpportunities,['First idea','Second idea']);
});

test('flush-left supporting bullets are not promoted over a ranked list',()=>{
 assert.deepEqual(parse('## Content Opportunities\n1. **First idea**\n- **Hook:** Example\n2. **Second idea**\n- **Rides:** Source\n3. **Third idea**').contentOpportunities,['First idea','Second idea','Third idea']);
});

test('fenced examples are ignored and an absent idea list remains empty',()=>{
 assert.deepEqual(parse('## Content Opportunities\n```md\n1. **An example, not an idea**\n```\n1. **Actual idea**').contentOpportunities,['Actual idea']);
 assert.deepEqual(parse('## Content Opportunities\nNo supported opportunities today.').contentOpportunities,[]);
});

test('BOM and CRLF briefs retain metadata and remove display-only Markdown from the top story',()=>{
 const report=parse('\uFEFF---\r\ndate: 2026-09-15\r\n---\r\n## Top Story\r\n**The main story.** Read [the source](https://example.com).\r\n\r\nMore detail.\r\n## Content Opportunities\r\n1. **Useful idea**\r\n');
 assert.equal(report.date,'2026-09-15');assert.equal(report.topStory,'The main story. Read the source.');assert.deepEqual(report.contentOpportunities,['Useful idea']);
});

test('reads Portuguese morning intelligence cards and prefers explicit headlines',()=>{
 const raw=`## Resumo
- Prazo de cobrança privado.
## Manchetes
- **Saiu um modelo novo.** — Há pesos abertos.
## Notícia principal
**O modelo chegou hoje.** Veja [a documentação](https://example.com).

## Notícias de IA (últimas 24h)
- Uma ferramenta foi lançada.
## Radar do Hacker News
| Notícia | Pontos | Comentários | Relevância |
|---|---:|---:|---|
| Novo modelo | 88 | 12 | Pesos abertos |
## Radar do YouTube
| Vídeo | Canal | Inscritos | Visualizações | Motivo |
|---|---|---:|---:|---|
| Um vídeo | Um canal | 12.000 | 45.000 | Um exemplo |
### Destaques de canais pequenos (últimas 24h)
| Vídeo | Canal (inscritos) | Visualizações e idade | Multiplicador | Origem |
|---|---|---|---|---|
| [Especial](https://example.com/yt) | Canal novo (2.300) | 12.000 / 6h | 12,3× | Busca |
## Radar do GitHub
- Lançamento de \`org/projeto\`.
## Caixa de entrada (últimas 24h)
- Um e-mail privado.
## Plano de conteúdo
### Pautas de YouTube
1. **Testar o modelo**
   - **Gancho:** Use um caso real.
### LinkedIn
1. **Uma adaptação**
## Situação das fontes
- YouTube consultado.
`;
 const report=parse(raw);
 assert.deepEqual(report.headlines,['**Saiu um modelo novo.** — Há pesos abertos.']);
 assert.equal(report.topStory,'O modelo chegou hoje. Veja a documentação.');
 assert.equal(report.webCount,1);
 assert.equal(report.hnCount,1);
 assert.equal(report.repoCount,1);
 assert.deepEqual(report.ytTrending,[{title:'Um vídeo',creator:'Um canal',views:'45.000',posted:''}]);
 assert.deepEqual(report.contentOpportunities,['Testar o modelo']);
 assert.deepEqual(parseHeadlines(raw),[{bold:'Saiu um modelo novo.',body:'Há pesos abertos.'}]);
 assert.deepEqual(parseIntelOutlierTable(raw),[{
  title:'Especial',url:'https://example.com/yt',mult:'12,3×',viewsAge:'12.000 / 6h',channel:'Canal novo',subs:'2.300',via:'Busca',
 }]);
});

test('reads the separate Portuguese morning report and retains English fallbacks',()=>{
 const raw=`## Manchetes
- Saiu um modelo novo.
## Em alta no YouTube
| Vídeo | Canal | Visualizações | Publicado |
|---|---|---|---|
| Um vídeo | Um canal | 45 mil | Ontem |
## Notícias e artigos na web
- Uma notícia.
## Conversa no X e Twitter
- **Vozes em destaque:**
  - **Um autor:** Um anúncio.
- **Dúvidas:** Falta um teste.
## Atividade de desenvolvimento no GitHub
- Um repositório.
## Oportunidades de conteúdo
1. **Explorar o lançamento**
`;
 const report=parse(raw);
 assert.deepEqual(report.headlines,['Saiu um modelo novo.']);
 assert.deepEqual(report.ytTrending,[{title:'Um vídeo',creator:'Um canal',views:'45 mil',posted:'Ontem'}]);
 assert.equal(report.webCount,1);
 assert.deepEqual(report.xVoices,['Um autor: Um anúncio.']);
 assert.equal(report.repoCount,1);
 assert.deepEqual(report.contentOpportunities,['Explorar o lançamento']);
 assert.deepEqual(parseHeadlines('## TL;DR\n- English summary\n## Headlines\n- Another headline'),[{bold:'English summary',body:''}]);
 assert.deepEqual(parse('## Resumo\n- Resumo sem manchetes próprias.').headlines,['Resumo sem manchetes próprias.']);
});

test('ignores example headings in private fenced Markdown and respects an empty explicit Manchetes section',()=>{
 const raw=`## Resumo
- Uma cobrança privada.
## Manchetes
## Caixa de entrada (últimas 24h)
~~~markdown
## Notícia principal
O conteúdo particular de um e-mail.
## Manchetes
- Reproduzindo um exemplo privado.
~~~
`;
 assert.deepEqual(parse(raw).headlines,[]);
 assert.equal(parse(raw).topStory,'');
 assert.deepEqual(parseHeadlines(raw),[]);
});

test('does not use nested inbox content as the lead of an empty Portuguese section',()=>{
 const raw=`## Notícia principal
### Caixa de entrada (últimas 24h)
- Um e-mail privado.
## Resumo
### Caixa de entrada (últimas 24h)
- Outra mensagem privada.
`;
 assert.equal(parse(raw).topStory,'');
 assert.deepEqual(parse(raw).headlines,[]);
 assert.deepEqual(parseHeadlines(raw),[]);
});
