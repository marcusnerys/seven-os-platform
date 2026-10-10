import { supabase } from '../lib/supabase';
import type { Segmento } from '../../api/_lib/assistant-tools';

export type MensagemAssistente = { role: 'user' | 'assistant'; text: string };
export type CampanhaRascunho = { segmento: Segmento; dias?: number; mensagem: string; clientIds: string[]; total: number };
export type RespostaAssistente = { reply: string; campanha?: CampanhaRascunho };

const TEMPO_LIMITE_MS = 35_000;
const MAX_MENSAGENS = 12;
const MAX_TEXTO = 1000;
const MAX_CORPO_BYTES = 30_000;
const ERRO_GENERICO = 'Não consegui falar com a IA agora. Tente de novo.';
const STATUS_COM_FRASE_PROPRIA = [400, 401, 429, 500, 503];

function montarCorpo(messages: MensagemAssistente[]): string {
  let historico = messages
    .map(m => ({ role: m.role, text: m.text.trim().slice(0, MAX_TEXTO) }))
    .filter(m => m.text)
    .slice(-MAX_MENSAGENS);
  let corpo = JSON.stringify({ messages: historico });
  // Acentos e emojis ocupam mais de um byte: corta as mais antigas até caber no limite do servidor.
  while (historico.length > 1 && new TextEncoder().encode(corpo).length > MAX_CORPO_BYTES) {
    historico = historico.slice(1);
    corpo = JSON.stringify({ messages: historico });
  }
  return corpo;
}

const SEGMENTOS: Segmento[] = ['inativas', 'hoje', 'amanha', 'todas'];

function lerCampanha(c: any): CampanhaRascunho | undefined {
  if (!c || !SEGMENTOS.includes(c.segmento) || typeof c.mensagem !== 'string' || !Array.isArray(c.clientIds)) return undefined;
  const clientIds = c.clientIds.filter((id: unknown): id is string => typeof id === 'string');
  return {
    segmento: c.segmento,
    dias: typeof c.dias === 'number' ? c.dias : undefined,
    mensagem: c.mensagem,
    clientIds,
    total: typeof c.total === 'number' ? c.total : clientIds.length,
  };
}

async function postar(corpo: string, cancelamento?: AbortSignal): Promise<Response> {
  const { data: sessao } = await supabase.auth.getSession();
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (sessao.session?.access_token) headers.set('Authorization', `Bearer ${sessao.session.access_token}`);
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  const cancelar = () => controle.abort();
  if (cancelamento?.aborted) cancelar();
  cancelamento?.addEventListener('abort', cancelar);
  try {
    return await fetch('/api/assistant/chat', { method: 'POST', headers, body: corpo, signal: controle.signal });
  } catch (erro) {
    if (cancelamento?.aborted) throw erro;
    throw new Error(erro instanceof DOMException && erro.name === 'AbortError'
      ? 'A IA demorou demais para responder. Tente de novo.'
      : 'Sem conexão com o servidor. Verifique a internet e tente de novo.');
  } finally {
    clearTimeout(prazo);
    cancelamento?.removeEventListener('abort', cancelar);
  }
}

export async function enviarPerguntaAssistente(
  messages: MensagemAssistente[], cancelamento?: AbortSignal,
): Promise<RespostaAssistente> {
  const resposta = await postar(montarCorpo(messages), cancelamento);
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const doServidor = STATUS_COM_FRASE_PROPRIA.includes(resposta.status) && typeof dados?.error === 'string' ? dados.error : null;
    throw new Error(doServidor || ERRO_GENERICO);
  }
  if (typeof dados?.reply !== 'string') throw new Error(ERRO_GENERICO);
  return { reply: dados.reply, campanha: lerCampanha(dados.campanha) };
}
