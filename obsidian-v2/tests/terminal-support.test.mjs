// Which Terminal plugin versions may open conversations inside Obsidian.
import test from 'node:test';
import assert from 'node:assert/strict';
import {terminalSupport, untrackedLaunchMessage, VERIFIED_TERMINAL_VERSIONS} from '../shared/terminal-support.mjs';

test('verified, untested, unsupported and missing versions are told apart', () => {
  const expected = {
    verified: ['3.27.1', '3.27.2', '3.27.2+build.1'],
    untested: ['3.27.3', '3.28.0', '3.100.0', '3.28.0+build.7'],
    unsupported: ['3.27.1-beta.1', '3.28.0-beta.1', '3.27.0', '2.99.0', '4.0.0', '3.28.0-..', '03.27.2', ' 3.27.2', '3.27', 'abc', 3],
    missing: ['', '  ', null, undefined],
  };
  for (const [status, versions] of Object.entries(expected))
    for (const version of versions) assert.equal(terminalSupport(version).status, status, `${JSON.stringify(version)} should be ${status}`);
});

test('every message that stops or warns names the Jarvis fallback, and verified says nothing', () => {
  for (const version of ['3.28.0', '3.28.0-beta.1', '3.27.0', '4.0.0', 'abc', null]) assert.match(terminalSupport(version).message, /Jarvis em http:\/\/127\.0\.0\.1:3217/);
  assert.equal(terminalSupport('3.27.2').message, '');
  assert.match(terminalSupport('3.27.0').message, /antigo demais/);
  assert.match(terminalSupport('3.28.0-beta.1').message, /versão preliminar/);
  assert.match(terminalSupport('4.0.0').message, /ainda precisa ser verificado/);
  assert.match(terminalSupport(null).message, /exigem o plugin da comunidade Terminal/);
  assert.match(terminalSupport('3.28.0').message, /mais recente que as versões testadas com o Agentic OS \(3\.27\.1, 3\.27\.2\)/);
  assert.match(untrackedLaunchMessage('3.28.0'), /Terminal 3\.28\.0 abriu esta conversa\. Esta versão do Terminal impede que o Agentic OS acompanhe a sessão/);
});

test('the verified list is ordered, so the newest entry sets the untested boundary', () => {
  assert.deepEqual([...VERIFIED_TERMINAL_VERSIONS], ['3.27.1', '3.27.2']);
  assert.ok(Object.isFrozen(VERIFIED_TERMINAL_VERSIONS));
});
