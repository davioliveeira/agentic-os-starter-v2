import { sameOrigin } from '@/lib/preview';
import { serverBridge } from '@/lib/bridge-server';

export async function GET(request: Request) {
 if (!sameOrigin(request)) return Response.json({error:'Origem não permitida.'},{status:403});
 const statusOnly=new URL(request.url).searchParams.get('status')==='1';
 try {return Response.json(await serverBridge(statusOnly?'/integrations/status':'/integrations',undefined,statusOnly?5000:35000));}
 catch {return Response.json({error:'Não foi possível consultar as integrações.'},{status:503});}
}

export async function POST(request: Request) {
 if (!sameOrigin(request)) return Response.json({error:'Origem não permitida.'},{status:403});
 try {return Response.json(await serverBridge('/integrations',await request.json(),310000));}
 catch (error) {
  return Response.json({error:error instanceof Error?error.message:'Falha na operação da integração.'},{status:400});
 }
}
