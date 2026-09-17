import { GoogleGenAI, Type } from "@google/genai";

/**
 * Servidor do assistente de voz.
 *
 * Usa a assinatura (req, res) do runtime Node da Vercel. A assinatura de
 * Request/Response da Web API não funciona neste projeto: a função nem chega a
 * ser invocada, a requisição fica pendurada e o navegador só sai disso no
 * timeout — que o front não tinha.
 *
 * O cliente do Gemini é criado sob demanda, não no carregamento do módulo.
 * Criá-lo no topo com uma chave vazia derrubava a função inteira quando
 * GEMINI_API_KEY não estava configurada, em vez de devolver um erro explicando
 * o que falta.
 */

// Tipagem mínima: @vercel/node não está nas dependências.
interface Req {
  method?: string;
  body?: any;
}
interface Res {
  status(codigo: number): Res;
  json(corpo: unknown): void;
}

const MODELO = "gemini-1.5-flash";

/** Data de hoje no fuso de Brasília. A função roda em UTC, então `new Date()`
 *  sozinho vira o dia seguinte a partir das 21h no horário local. */
function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // 503 e não 500: o serviço está indisponível por falta de configuração,
    // não por defeito. O front cai na resposta alternativa dele.
    res.status(503).json({ error: 'GEMINI_API_KEY não configurada no projeto' });
    return;
  }

  const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { mode, text, context, storeSnapshot } = corpo;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const todayString = hojeEmBrasilia();

    // --- INSIGHT MODE: proactive routine briefing ---
    if (mode === 'insight') {
      const { todayAppointments = [], inactiveClients = [], recentRevenue = 0, recentExpenses = 0, totalClients = 0 } = storeSnapshot || {};

      const prompt = `Você é a IA operacional do Leshanot Studio — um sistema de gestão de beleza.
Hoje é ${todayString}.

DADOS DO NEGÓCIO HOJE:
- Agendamentos de hoje: ${JSON.stringify(todayAppointments)}
- Clientes sem visita há mais de 30 dias: ${inactiveClients.length} (nomes: ${inactiveClients.slice(0, 3).join(', ')}${inactiveClients.length > 3 ? '...' : ''})
- Receita nos últimos 7 dias: R$ ${Number(recentRevenue).toFixed(2)}
- Despesas nos últimos 7 dias: R$ ${Number(recentExpenses).toFixed(2)}
- Total de clientes cadastrados: ${totalClients}

TAREFA: Gere um briefing de boas-vindas personalizado e proativo. Seja direto, caloroso e útil. Use até 3 frases. Mencione os agendamentos do dia se houver, alerte sobre clientes inativos se relevante, e destaque o resultado financeiro se positivo. Termine com uma pergunta ou sugestão de ação concreta dentro do sistema (agendar, enviar mensagem, ver relatório). Responda em português do Brasil.`;

      const response = await ai.models.generateContent({
        model: MODELO,
        contents: prompt,
      });

      res.status(200).json({ insight: response.text?.trim() || 'Olá! Pronto para mais um dia produtivo.' });
      return;
    }

    // --- COMMAND MODE: parse voice command ---
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const response = await ai.models.generateContent({
      model: MODELO,
      contents: `Você é o assistente operacional (AI) do Leshanot Studio. O sistema é voltado para gestão de estética.
Comando: "${text}"
Contexto: ${JSON.stringify(context || {})}
Hoje: ${todayString}

Ações Suportadas:
- create_appointment: {clientName, service, date, time}
- cancel_appointment: {clientName, date, time}
- create_client: {name, phone?}
- create_revenue: {amount, description?}
- create_expense: {amount, description, category?}
- update_client_notes: {clientName, notes}
- update_client_vip: {clientName, isVIP}
- create_service: {name, price, duration?}
- get_daily_summary: {}
- show_dashboard_summary: {}
- search_client: {clientName?}
- send_whatsapp: {clientName}
- show_financial_summary: {}
- list_inactive_clients: {}
- unknown: {}

Regras:
1. Retorne JSON estruturado.
2. Identifique nomes de clientes e serviços no contexto se possível.
3. Se faltar dado vital (ex: valor da despesa ou hora do agendamento), use status 'incomplete'.
4. 'message' deve ser uma resposta curta e profissional confirmando a ação ou pedindo o que falta.

JSON:
{
  "action": "...",
  "data": { ... },
  "message": "...",
  "status": "complete" | "incomplete"
}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            data: { type: Type.OBJECT },
            message: { type: Type.STRING },
            status: { type: Type.STRING },
          },
          required: ["action", "message", "status"],
        },
      },
    });

    res.status(200).json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to process voice command" });
  }
}
