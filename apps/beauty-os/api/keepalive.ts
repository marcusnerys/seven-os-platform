/**
 * Mantém o projeto Supabase acordado.
 *
 * O plano free do Supabase pausa o banco depois de 7 dias sem atividade, e
 * quando isso acontece o app inteiro para: login, agenda, financeiro e a
 * página pública de agendamento. Já aconteceu uma vez, depois de 10 dias sem
 * uso, e só foi descoberto ao testar.
 *
 * A Vercel chama esta função uma vez por dia (ver "crons" em vercel.json).
 * Ela faz uma consulta boba ao banco — o que conta como atividade é a consulta
 * chegar ao Postgres, não bater no gateway. Por isso chama uma função do banco
 * em vez de só pedir a raiz da API.
 *
 * Usa a assinatura (req, res) do runtime Node da Vercel. A assinatura de
 * Request/Response da Web API não funciona neste projeto.
 */

// Tipagem mínima: @vercel/node não está nas dependências, e puxar o pacote só
// para dois campos não se paga.
interface Req {
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  status(codigo: number): Res;
  json(corpo: unknown): void;
}

// UUID que não existe de propósito: a resposta vem vazia, e é isso que se quer.
// O objetivo é a consulta acontecer, não o resultado dela.
const UUID_INEXISTENTE = '00000000-0000-0000-0000-000000000000';
const LIMITE_MS = 20_000;

export default async function handler(req: Req, res: Res): Promise<void> {
  const segredo = process.env.CRON_SECRET;
  if (segredo) {
    const autorizacao = req.headers['authorization'];
    if (autorizacao !== `Bearer ${segredo}`) {
      res.status(401).json({ erro: 'nao autorizado' });
      return;
    }
  }

  const url = process.env.VITE_SUPABASE_URL;
  const chave = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !chave) {
    res.status(500).json({ ok: false, erro: 'faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY' });
    return;
  }

  const inicio = Date.now();

  try {
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), LIMITE_MS);

    const resposta = await fetch(`${url}/rest/v1/rpc/beautyos_public_settings`, {
      method: 'POST',
      headers: { apikey: chave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_empresa_id: UUID_INEXISTENTE }),
      signal: controle.signal,
    });

    clearTimeout(limite);
    const levou = Date.now() - inicio;

    if (!resposta.ok) {
      // 500 faz a execução aparecer como falha no painel da Vercel, que é o
      // sinal de que o banco pode estar pausado.
      res.status(500).json({ ok: false, status: resposta.status, levou_ms: levou });
      return;
    }

    res.status(200).json({ ok: true, levou_ms: levou, em: new Date().toISOString() });
  } catch (erro) {
    res.status(500).json({
      ok: false,
      erro: erro instanceof Error ? erro.message : 'falha desconhecida',
      levou_ms: Date.now() - inicio,
    });
  }
}
