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

    const { fileBase64, mimeType } = await req.json();
    if (!fileBase64 || !mimeType) {
      return json({ error: 'fileBase64 e mimeType são obrigatórios' }, 400);
    }

    const today = new Date().toISOString().split('T')[0];
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

    // Chaves AQ. são tokens OAuth e vão no header Authorization;
    // chaves AIza são API keys e vão na query string.
    const isOAuthToken = GEMINI_API_KEY.startsWith('AQ.');
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const url = isOAuthToken ? endpoint : `${endpoint}?key=${GEMINI_API_KEY}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isOAuthToken) headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType.startsWith('image') ? mimeType : 'image/jpeg',
                data: fileBase64,
              },
            },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    });

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
