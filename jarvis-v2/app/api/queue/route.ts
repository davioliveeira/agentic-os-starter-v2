import { sameOrigin } from "@/lib/preview";
import {serverBridge as bridge} from '@/lib/bridge-server';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:"Origem não permitida."}, {status:403});
  try { const body=await request.json(); return Response.json(await bridge('/queue',{skill:body.skill,args:body.args||{}})); }
  catch (error) { return Response.json({error: error instanceof Error ? error.message : "Não foi possível colocar o fluxo na fila."}, {status:400}); }
}
