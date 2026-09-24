/**
 * Lê um extrato bancário ou anotação de gastos e devolve as transações.
 *
 * Roda no servidor de propósito: a chave do Gemini fica em GEMINI_API_KEY,
 * um secret do Supabase, e nunca chega ao navegador. A alternativa —
 * chamar o Gemini direto do front com VITE_GEMINI_API_KEY — publica a
 * chave dentro do bundle, onde qualquer visitante consegue extraí-la.
 *
 * Se esta função falhar por qualquer motivo, o app cai para o OCR local
 * (src/lib/ocr.ts), que não depende de chave nenhuma.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Tipos que o Gemini lê direto. O PDF estava de fora: o código só deixava
 * passar mime que começasse com "image", então um extrato em PDF — que a
 * tela oferece no seletor de arquivos — seguia com os bytes do PDF
 * rotulados como image/jpeg. O Gemini recebia um JPEG corrompido e a
 * importação falhava sempre, para todo mundo, desde o início.
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
 * Modelos em ordem de preferência. O código apontava para gemini-2.0-flash,
 * aposentado pelo Google: toda chamada voltava 404. Versão fixa quebra na
 * aposentadoria seguinte, e só o apelido não basta — no nível gratuito ele
 * responde 503 em horário cheio, medido contra a API. Com dois, uma
 * saturação passageira do primeiro não derruba a leitura.
 */
const MODELOS = ['gemini-flash-latest', 'gemini-3-flash-preview'];
const ESPERAS_MS = [800, 2000];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return json({ error: 'GEMINI_API_KEY não configurada no projeto' }, 500);
    }

    // Só quem está logado no app. Antes a chave pública — que está no bundle
    // de qualquer visitante — bastava para chamar esta função, e a cota
    // gratuita do Gemini é uma só para todos os negócios: esgotada por um
    // terceiro, a leitura de extrato parava para todo mundo.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: 'Entre no app para ler extratos.' }, 401);
    }
    const quem = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!quem.ok) {
      return json({ error: 'Sessão expirada. Entre de novo.' }, 401);
    }

    // Cota por pessoa e por hora (migration 0016). Criar conta é livre, então
    // só o login não impedia uma conta descartável de esgotar o Gemini de
    // todos. Falha na contagem deixa passar: proteção, não cobrança.
    const uso = await fetch(`${SUPABASE_URL}/rest/v1/rpc/beautyos_registrar_uso_ia`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: '{}',
    }).then(r => (r.ok ? r.json() : true)).catch(() => true);
    if (uso === false) {
      return json({ error: 'Limite de leituras desta hora atingido. Tente de novo mais tarde.' }, 429);
    }

    const { fileBase64, mimeType } = await req.json();
    if (!fileBase64 || !mimeType) {
      return json({ error: 'fileBase64 e mimeType são obrigatórios' }, 400);
    }
    // ~20 MB de arquivo. É o que a função aguenta com folga na memória; o
    // app confere o tamanho antes de enviar e avisa quem passar disso.
    if (String(fileBase64).length > 27_000_000) {
      return json({ error: 'Arquivo grande demais. Envie até 20 MB.' }, 413);
    }

    // Data de hoje em São Paulo, não em UTC. A função roda num servidor em
    // UTC, então toISOString() devolvia o dia seguinte a partir das 21h no
    // Brasil — e é justo à noite que se fotografa a anotação do dia. Toda
    // transação sem data na imagem entrava com a data errada.
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const prompt = `Você é um assistente financeiro especializado em extratos bancários e anotações de gastos.
Analise esta imagem e extraia TODAS as transações financeiras visíveis.

Retorne SOMENTE um JSON válido neste formato, sem markdown, sem explicações adicionais:
{"transactions":[{"date":"YYYY-MM-DD","description":"Descrição","amount":99.90,"type":"revenue","category":"categoria"}]}

Regras:
- Entradas/depósitos/créditos = type "revenue"
- Saídas/débitos/gastos = type "expense"
- Valores sempre positivos
- Se a data não aparecer, use: ${today}
- Categorize de forma inteligente (Aluguel, Produtos, Serviço, Alimentação, Transporte, etc)
- Retorne JSON puro sem nenhum texto antes ou depois`;

    // Toda chave do AI Studio vai na query string, inclusive as de prefixo
    // AQ., que o AI Studio passou a emitir. O código presumia que AQ. era
    // token OAuth e mandava no header Authorization: o Gemini respondia
    // "Expected OAuth 2 access token" em toda chamada. Verificado contra a
    // API com a chave do projeto: 401 como Bearer, 200 como ?key=.
    const urlDo = (modelo: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}` +
      `:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    const corpo = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: TIPOS_ACEITOS.includes(mimeType) ? mimeType : 'image/jpeg',
              data: fileBase64,
            },
          },
        ],
      }],
      // 4096 cortava o JSON de extratos mensais com muitas linhas: a resposta
      // chegava truncada, não parseava, e o PDF inteiro falhava.
      generationConfig: { temperature: 0.1, maxOutputTokens: 16384 },
    });

    // Repete em fila cheia (429) e indisponibilidade momentânea (503), e
    // passa ao modelo seguinte se o primeiro continuar fora. O app trata
    // qualquer falha daqui caindo para o OCR local, que recusa PDF — então
    // um 503 de alguns segundos virava "tire uma foto do extrato" para quem
    // mandou um PDF perfeitamente legível. Aconteceu no teste.
    let geminiRes!: Response;
    for (const modelo of MODELOS) {
      for (let tentativa = 0; tentativa <= ESPERAS_MS.length; tentativa++) {
        geminiRes = await fetch(urlDo(modelo), { method: 'POST', headers, body: corpo });
        if (geminiRes.status !== 429 && geminiRes.status !== 503) break;
        if (tentativa < ESPERAS_MS.length) {
          await new Promise(r => setTimeout(r, ESPERAS_MS[tentativa]));
        }
      }
      if (geminiRes.status !== 429 && geminiRes.status !== 503) break;
    }

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini recusou:', geminiRes.status, JSON.stringify(geminiData));
      return json({ error: `Gemini ${geminiRes.status}: ${geminiData?.error?.message ?? 'erro desconhecido'}` }, 502);
    }

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!rawText) {
      console.error('Gemini respondeu sem texto:', JSON.stringify(geminiData));
      return json({ error: 'Gemini respondeu vazio' }, 502);
    }

    // O modelo às vezes embrulha o JSON em bloco de código, apesar da instrução.
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return json(JSON.parse(cleaned));
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return json(JSON.parse(match[0]));
        } catch { /* cai no retorno de erro abaixo */ }
      }
      console.error('Resposta não era JSON:', rawText.slice(0, 500));
      return json({ error: 'Gemini devolveu um formato inesperado' }, 422);
    }
  } catch (err) {
    console.error('Falha na função:', err);
    return json({ error: 'Erro interno ao ler o extrato' }, 500);
  }
});
