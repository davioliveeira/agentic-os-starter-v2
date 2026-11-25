import { sameOrigin } from "@/lib/preview";
import {serverBridge as bridge} from '@/lib/bridge-server';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:"Origem não permitida."}, {status:403});
  try { const {provider}=await request.json();return Response.json(await bridge('/selection',{provider,model:provider==='codex'?'astra':'opus'})); }
  catch { return Response.json({error:"Não foi possível salvar a seleção do provedor."}, {status:400}); }
}
