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

test('adds the official Wispr endpoint only when there is no existing Codex connection',async()=>{
 const calls=[];
 let existing=false;
 const inventory=createIntegrationInventory('/vault',{invoke:async(_root,provider,args)=>{
  calls.push([provider,...args]);
  if(args.includes('list'))return existing?'[{"name":"other","transport":{"type":"streamable_http","url":"https://api.wisprflow.ai/connect/mcp"}}]':'[]';
  existing=true;
  return '';
 }});
 await inventory.connectWispr();
 assert.deepEqual(calls.at(-1),['codex','mcp','add','wispr-flow','--url','https://api.wisprflow.ai/connect/mcp']);
 await assert.rejects(inventory.connectWispr(),/já foi adicionado/);
 assert.equal(calls.filter(args=>args.includes('add')).length,1);
});

test('surfaces the already installed Codex app and reuses its authenticated Wispr tools',async()=>{
 const inventory=createIntegrationInventory('/vault',{
  invoke:async(_root,provider)=>provider==='codex'?'[]':'',
  readApps:async()=>[
   {id:'app_wispr',runtimeName:'Wispr Flow',enabled:true,callable:true},
   {id:'app_disabled',runtimeName:'Calendar',enabled:false,callable:false}
  ]
 });
 const [codex]=await inventory.list();
 const wispr=codex.connections.find(row=>row.wispr);
 assert.equal(wispr.name,'Wispr Flow');
 assert.equal(wispr.server,'app:app_wispr');
 assert.equal(wispr.status,'conectada');
 assert.equal(wispr.scope,'Conta Codex');
 assert.equal(codex.connections[1].status,'desativada');
 await assert.rejects(inventory.connectWispr(),/já está disponível/);
});

test('Claude removals resolve their actual scope and leave account connections managed by Claude',async()=>{
 const calls=[];
 const inventory=createIntegrationInventory('/vault',{invoke:async(_root,provider,args)=>{
  calls.push([provider,...args]);
  if(args[1]==='get')return 'docs:\n  Scope: User config (available in all your projects)\n  Status: ✔ Connected';
  return 'docs: https://example.com/mcp - ✔ Connected\nclaude.ai Wispr Flow: https://api.wisprflow.ai/connect/mcp - ✔ Connected';
 }});
 await inventory.change({provider:'claude',name:'docs',action:'remove'});
 assert.deepEqual(calls.at(-1),['claude','mcp','remove','--scope','user','docs']);
 await assert.rejects(inventory.change({provider:'claude',name:'claude.ai Wispr Flow',action:'remove'}));
});
