// The Live call greets the user by name once, with varied wording (2026-11-22).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {userName,pickGreeting,greetingOptions,liveGreeting} from '../runner/live/greeting.mjs';

test('the name comes from About me in the usual ways', () => {
 assert.equal(userName("I'm Chase. I run Chase AI."), 'Chase');
 assert.equal(userName('My name is Dana and I coach runners.'), 'Dana');
 assert.equal(userName('Name: Priya'), 'Priya');
 assert.equal(userName('Meu nome é João.'), 'João');
 assert.equal(userName('Me chamo Lívia e faço consultoria.'), 'Lívia');
 assert.equal(userName('Sou Davi. Trabalho com tecnologia.'), 'Davi');
 assert.equal(userName('Sou desenvolvedor com experiência.'), null);
 assert.equal(userName("I'm building a studio."), null, 'a lowercase word is not a name');
 assert.equal(userName("I'm a designer."), null);
 assert.equal(userName(''), null);
});

test('greetings use the name, or none, and never repeat back to back', () => {
 const morning = new Date(2026, 10, 23, 9, 0);
 let previous = null;
 for (let i = 0; i < 40; i++) {
  const line = pickGreeting({name: 'Chase', now: morning, previous, random: () => (i * 0.37) % 1});
  assert.match(line, /Chase/);
  assert.notEqual(line, previous);
  previous = line;
 }
 assert.doesNotMatch(pickGreeting({name: null, now: morning, random: () => 0}), /,\s*[,.?]|undefined|null/);
});

test('there are several options, and time-of-day ones only at the right time', () => {
 const at = hour => greetingOptions(new Date(2026, 10, 23, hour)).map(make => make(', Chase'));
 assert.ok(at(9).length >= 6);
 assert.ok(at(9).some(line => /^Bom dia/.test(line)));
 assert.ok(at(15).some(line => /^Boa tarde/.test(line)));
 assert.ok(!at(15).some(line => /^(?:Bom dia|Boa noite)/.test(line)));
 assert.ok(at(20).some(line => /^Boa noite/.test(line)));
 assert.ok(!at(20).some(line => /^Bom dia/.test(line)));
});

test('liveGreeting reads the vault About me', t => {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aos-greet-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root, 'AGENTS.md'), "# Vault\n\n## About me\n\nI'm Sam. I make furniture.\n\n## Vault conventions\n");
 assert.match(liveGreeting(root, {random: () => 0}), /Sam/);
 fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Cofre\n\n## Sobre mim\n\nMeu nome é Lívia.\n\n## Convenções do cofre\n');
 assert.match(liveGreeting(root, {random: () => 0}), /^(?:Oi|Olá), Lívia[.!]/);
 fs.unlinkSync(path.join(root,'AGENTS.md'));
 assert.doesNotMatch(liveGreeting(root, {random: () => 0}), /undefined|null/);
});
