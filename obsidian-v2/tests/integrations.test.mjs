import test from 'node:test';
import assert from 'node:assert/strict';
import {createIntegrationInventory,parseIntegrations} from '../runner/integrations.mjs';

test('lists Claude account and Codex MCP connections without transport secrets',async()=>{
 const inventory=createIntegrationInventory('/vault',{invoke:async(_root,provider)=>provider==='claude'?
  'Checking MCP server health…\n\nclaude.ai Wispr Flow: https://api.wisprflow.ai/mcp?token=example-secret - ✔ Connected\nUnapproved: https://example.com/mcp - ⏸ Pending approval':
  JSON.stringify([{name:'docs',enabled:true,auth_status:'oauth',transport:{type:'streamable_http',url:'https://example.com/mcp?token=example-secret'}}])});
 const [codex,claude]=await inventory.list();
 assert.equal(codex.connections[0].status,'conectada');
 assert.equal(claude.connections[0].wispr,true);
 assert.equal(claude.connections[0].scope,'Conta Claude');
 assert.equal(claude.connections[1].status,'aguarda aprovação');
 assert.doesNotMatch(JSON.stringify([codex,claude]),/example-secret|example\.com/);
});

test('only connection actions advertised by the native inventory can execute',async()=>{
 const calls=[];
 const inventory=createIntegrationInventory('/vault',{invoke:async(_root,provider,args)=>{
  calls.push([provider,...args]);
  return '[{"name":"docs","enabled":true,"auth_status":"oauth","transport":{"type":"streamable_http","url":"https://example.com"}}]';
 }});
 await assert.rejects(inventory.change({provider:'codex',name:'--help',action:'logout'}));
 await assert.rejects(inventory.change({provider:'codex',name:'docs',action:'login'}));
 await inventory.change({provider:'codex',name:'docs',action:'logout'});
 assert.deepEqual(calls.at(-1),['codex','mcp','logout','docs']);
 assert.equal(parseIntegrations('claude','Nothing configured').length,0);
});
