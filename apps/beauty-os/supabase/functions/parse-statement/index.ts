/**
 * Lê um extrato bancário ou anotação de gastos e devolve as transações.
 *
 * Roda no servidor de propósito: a chave do Gemini fica em GEMINI_API_KEY,
 * um secret do Supabase, e nunca chega ao navegador.
 *
 * Em segundo plano (migration 0018): a leitura de um PDF leva de 20 s a mais
 * de um minuto, e o app ficava travado esperando — trocar de app no meio
 * perdia tudo. Agora a função cria uma linha em beautyos_importacoes,
 * responde na hora com o id e continua lendo depois da resposta
 * (EdgeRuntime.waitUntil). Enquanto o Gemini escreve, a contagem de
 * lançamentos encontrados vai para a linha; no fim, as transações. O app
 * acompanha pelo realtime, e cada arquivo enviado vira uma linha própria.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Tipos que o Gemini lê direto. O PDF estava de fora: um extrato em PDF
 * seguia rotulado como image/jpeg e a importação falhava sempre.
 */
const TIPOS_ACEITOS = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];

/**
 * Modelos em ordem de preferência. Um PDF de uma página levava 59 s: o Flash
 * pensa no nível médio, o reserva antigo (gemini-3-flash-preview) no alto, e
 * a cota gratuita diária do Flash acaba depois de umas vinte chamadas. Mesma
 * troca do assistente de voz (api/voice/parse.ts): Flash-Lite na frente, que
 * pensa no mínimo, e o Flash no nível baixo de reserva.
 */
type Modelo = { nome: string; pensamento?: 'LOW' };
const MODELOS: Modelo[] = [
  { nome: 'gemini-flash-lite-latest' },
  { nome: 'gemini-flash-latest', pensamento: 'LOW' },
];
// Espera antes de cada rodada. Com fila cheia num modelo, o outro é tentado
// na hora; só depois de os dois falharem se espera.
const ESPERAS_MS = [0, 2000, 5000];
// O plano gratuito encerra a função em 150 s, contando o segundo plano. A
// leitura para antes e grava o erro, em vez de ser cortada e deixar a linha
// em "lendo" para sempre.
const PRAZO_TOTAL_MS = 135_000;
// A contagem de encontradas vai ao banco no máximo a cada 1,5 s.
const INTERVALO_PROGRESSO_MS = 1_500;

type Transacao = { date: string; description: string; amount: number; type: 'revenue' | 'expense'; category: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Uma transação por linha, num array curto:
 *   ["2026-09-01","PIX recebido Maria",150.00,"r","Vendas"]
 * O formato antigo, um objeto com nomes de campo por transação, gerava quase
 * o dobro de texto — e no nível gratuito o Gemini escreve devagar: era a
 * maior parte da espera.
 */
function lerLinha(linha: string): Transacao | null {
  const limpa = linha.trim().replace(/,$/, '');
  if (!limpa.startsWith('[') || !limpa.endsWith(']')) return null;
  try {
    const [date, description, amount, tipo, category] = JSON.parse(limpa);
    const valor = Math.abs(Number(amount));
    if (typeof date !== 'string' || !Number.isFinite(valor) || valor === 0) return null;
    return {
      date,
      description: String(description ?? '').trim() || 'Sem descrição',
      amount: valor,
      type: tipo === 'r' ? 'revenue' : 'expense',
      category: String(category ?? '').trim() || 'Outros',
    };
  } catch {
    return null;
  }
}

/** Lê o texto completo. Aceita também um array de arrays numa linha só. */
function lerTexto(texto: string): Transacao[] {
  const limpo = texto.replace(/```[a-z]*\n?/gi, '').trim();
  const porLinha = limpo.split('\n').map(lerLinha).filter((t): t is Transacao => t !== null);
  if (porLinha.length) return porLinha;
  try {
    const tudo = JSON.parse(limpo);
    const linhas = Array.isArray(tudo) ? tudo : [];
    return linhas
      .map((l: unknown) => (Array.isArray(l) ? lerLinha(JSON.stringify(l)) : null))
      .filter((t: Transacao | null): t is Transacao => t !== null);
  } catch {
    return [];
  }
}

/** Quantas linhas completas já chegaram (a última pode estar pela metade). */
function contarProntas(texto: string): number {
  const linhas = texto.split('\n');
  linhas.pop();
  return linhas.filter(l => lerLinha(l) !== null).length;
}

/**
 * Chama o Gemini em streaming e devolve as transações. A cada pedaço que
 * chega, conta as linhas completas e avisa o progresso.
 */
async function lerComGemini(
  chave: string,
  partes: unknown[],
  aoProgredir: (encontradas: number) => void,
  tentativas: string[],
): Promise<Transacao[]> {
  const inicio = Date.now();
  let ultimoErro = 'A leitura com IA está ocupada agora. Tente de novo em alguns minutos.';

  for (const espera of ESPERAS_MS) {
    if (espera) await new Promise(r => setTimeout(r, espera));
    for (const modelo of MODELOS) {
      const restante = PRAZO_TOTAL_MS - (Date.now() - inicio);
      if (restante < 5_000) throw new Error('A leitura demorou demais. Envie um período menor ou uma foto de cada página.');
      const sinal = AbortSignal.timeout(restante);
      const t0 = Date.now();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo.nome}` +
        `:streamGenerateContent?alt=sse&key=${encodeURIComponent(chave)}`;
      try {
        const resposta = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: sinal,
          body: JSON.stringify({
            contents: [{ parts: partes }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 16384,
              ...(modelo.pensamento ? { thinkingConfig: { thinkingLevel: modelo.pensamento } } : {}),
            },
          }),
        });
        if (resposta.status === 429 || resposta.status === 503) {
          tentativas.push(`${modelo.nome} ${resposta.status} ${Date.now() - t0}ms`);
          continue;
        }
        if (!resposta.ok || !resposta.body) {
          const corpo = await resposta.text();
          tentativas.push(`${modelo.nome} ${resposta.status} ${Date.now() - t0}ms`);
          console.error('Gemini recusou:', resposta.status, corpo.slice(0, 500));
          ultimoErro = 'A IA não conseguiu abrir o arquivo. Se o PDF tem senha, envie uma foto ou um print do extrato.';
          continue;
        }

        // Server-sent events: "data: {...}" por pedaço de texto gerado.
        const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader();
        let pendente = '';
        let texto = '';
        let contadas = 0;
        for (;;) {
          const { value, done } = await leitor.read();
          if (done) break;
          pendente += value;
          const eventos = pendente.split('\n');
          pendente = eventos.pop() ?? '';
          for (const evento of eventos) {
            if (!evento.startsWith('data:')) continue;
            try {
              const dado = JSON.parse(evento.slice(5));
              for (const parte of dado?.candidates?.[0]?.content?.parts ?? []) {
                if (typeof parte?.text === 'string' && !parte.thought) texto += parte.text;
              }
            } catch { /* evento incompleto: chega inteiro no próximo pedaço */ }
          }
          const prontas = contarProntas(texto);
          if (prontas !== contadas) {
            contadas = prontas;
            aoProgredir(prontas);
          }
        }

        const transacoes = lerTexto(texto);
        tentativas.push(`${modelo.nome} ok ${Date.now() - t0}ms`);
        if (!transacoes.length) console.error('Resposta sem transações:', texto.slice(0, 500));
        return transacoes;
      } catch (erro) {
        tentativas.push(`${modelo.nome} ${sinal.aborted ? 'prazo' : 'rede'} ${Date.now() - t0}ms`);
        console.error('Falha ao chamar o Gemini:', erro);
      }
    }
  }
  throw new Error(ultimoErro);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY não configurada no projeto' }, 500);
    }

    // Só quem está logado no app: a cota gratuita do Gemini é uma só para
    // todos os negócios.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: 'Entre no app para ler extratos.' }, 401);
    }
    const comoUsuario = { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    const quem = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: comoUsuario });
    if (!quem.ok) {
      return json({ error: 'Sessão expirada. Entre de novo.' }, 401);
    }

    // Cota por pessoa e por hora (migration 0016). Falha na contagem deixa
    // passar: proteção, não cobrança.
    const uso = await fetch(`${SUPABASE_URL}/rest/v1/rpc/beautyos_registrar_uso_ia`, {
      method: 'POST',
      headers: comoUsuario,
      body: '{}',
    }).then(r => (r.ok ? r.json() : true)).catch(() => true);
    if (uso === false) {
      return json({ error: 'Limite de leituras desta hora atingido. Tente de novo mais tarde.' }, 429);
    }

    const { fileBase64, mimeType, nome, segundoPlano } = await req.json();
    if (!fileBase64 || !mimeType) {
      return json({ error: 'fileBase64 e mimeType são obrigatórios' }, 400);
    }
    // ~20 MB de arquivo. O app confere o tamanho antes de enviar.
    if (String(fileBase64).length > 27_000_000) {
      return json({ error: 'Arquivo grande demais. Envie até 20 MB.' }, 413);
    }

    // Data de hoje em São Paulo, não em UTC: à noite o servidor já está no
    // dia seguinte.
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());

    const prompt = `Você lê extratos bancários e anotações de gastos. Extraia TODAS as transações do arquivo.

Responda só com linhas, uma transação por linha, cada linha um array JSON:
["AAAA-MM-DD","Descrição curta",valor,"r","Categoria"]

- 4º campo: "r" para entrada, crédito ou depósito; "d" para saída, débito ou gasto.
- Valor positivo, com ponto decimal (1234.56), sem R$.
- Data sem ano no extrato: use o ano de ${today}. Sem data nenhuma: use ${today}.
- Categoria curta: Vendas, Serviço, Aluguel, Produtos, Alimentação, Transporte, Contas, Impostos, Tarifas, Salário, Transferência ou Outros.
- Ignore linhas de saldo, totais, limites e cabeçalhos.
- Nada antes nem depois das linhas.`;

    const partes = [
      { text: prompt },
      { inline_data: { mime_type: TIPOS_ACEITOS.includes(mimeType) ? mimeType : 'image/jpeg', data: fileBase64 } },
    ];

    // App de versão anterior, ainda no cache de algum celular: espera a
    // resposta completa na mesma chamada.
    if (!segundoPlano) {
      const tentativas: string[] = [];
      try {
        const transactions = await lerComGemini(GEMINI_API_KEY, partes, () => {}, tentativas);
        return json({ transactions });
      } catch (erro) {
        return json({ error: (erro as Error).message }, 503);
      } finally {
        console.log('Leitura direta', tentativas.join(', '));
      }
    }

    // A linha da leitura é gravada com o token de quem enviou: a política
    // de dono da tabela vale igual ao resto do app.
    const criada = await fetch(`${SUPABASE_URL}/rest/v1/beautyos_importacoes`, {
      method: 'POST',
      headers: { ...comoUsuario, Prefer: 'return=representation' },
      body: JSON.stringify({ arquivo: String(nome ?? 'extrato').slice(0, 200) }),
    });
    const [linha] = criada.ok ? await criada.json() : [];
    if (!linha?.id) {
      console.error('Não criou a leitura:', criada.status, await criada.text().catch(() => ''));
      return json({ error: 'Não consegui iniciar a leitura. Tente de novo.' }, 500);
    }

    const atualizar = (campos: Record<string, unknown>) =>
      fetch(`${SUPABASE_URL}/rest/v1/beautyos_importacoes?id=eq.${linha.id}`, {
        method: 'PATCH',
        headers: comoUsuario,
        body: JSON.stringify({ ...campos, atualizado_em: new Date().toISOString() }),
      }).catch(erro => console.error('Falha ao gravar o progresso:', erro));

    const tentativas: string[] = [];
    let ultimoAviso = 0;
    const ler = (async () => {
      try {
        const transacoes = await lerComGemini(GEMINI_API_KEY, partes, encontradas => {
          if (Date.now() - ultimoAviso < INTERVALO_PROGRESSO_MS) return;
          ultimoAviso = Date.now();
          atualizar({ encontradas });
        }, tentativas);
        await atualizar(transacoes.length
          ? { status: 'pronto', transacoes, encontradas: transacoes.length, erro: null }
          : { status: 'erro', erro: 'Nenhuma transação encontrada. Tente uma foto mais nítida.' });
      } catch (erro) {
        await atualizar({ status: 'erro', erro: (erro as Error).message || 'Erro ao ler o extrato.' });
      } finally {
        console.log('Leitura', linha.id, tentativas.join(', '));
      }
    })();
    EdgeRuntime.waitUntil(ler);

    return json({ id: linha.id }, 202);
  } catch (err) {
    console.error('Falha na função:', err);
    return json({ error: 'Erro interno ao ler o extrato' }, 500);
  }
});
