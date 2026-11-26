import test from 'node:test';
import assert from 'node:assert/strict';
import {callWisprWithCodex} from '../runner/wispr-mcp.mjs';

test('uses the configured MCP connection directly through Codex without starting a model turn',async()=>{
 const calls=[];
 const rpc=async(_root,_signal,run)=>run(async(method,params)=>{
  calls.push({method,params});
  if(method==='thread/start')return {thread:{id:'temporary'}};
  return {content:[{type:'text',text:'{"meetings":[]}'}]};
 });
 const args={page_size:1};
 assert.deepEqual(await callWisprWithCodex('/vault','wispr','search_meetings',args,undefined,rpc),{meetings:[]});
 assert.deepEqual(calls,[{method:'thread/start',params:{cwd:'/vault',ephemeral:true,approvalPolicy:'never',sandbox:'read-only'}},
  {method:'mcpServer/tool/call',params:{threadId:'temporary',server:'wispr',tool:'search_meetings',arguments:args}}]);
});
