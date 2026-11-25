import {serverBridge as bridge} from '@/lib/bridge-server';
import {sameOrigin} from '@/lib/preview';
export async function GET(){try{return Response.json(await bridge('/voice/transcript'))}catch{return Response.json({error:'Ponte de voz indisponível'},{status:503})}}
export async function DELETE(req:Request){if(!sameOrigin(req))return new Response(null,{status:403});try{return Response.json(await bridge('/voice/transcript',undefined,5000,'DELETE'))}catch(e){return Response.json({error:e instanceof Error?e.message:'Ponte de voz indisponível'},{status:503})}}
