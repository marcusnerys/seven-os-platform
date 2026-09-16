import { GoogleGenAI, Type } from "@google/genai";

export const config = { runtime: 'nodejs' };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const body = await req.json();
  const { mode, text, context, storeSnapshot } = body;

  try {
    const todayString = new Date().toISOString().split('T')[0];

    // --- INSIGHT MODE: proactive routine briefing ---
    if (mode === 'insight') {
      const { todayAppointments = [], inactiveClients = [], recentRevenue = 0, recentExpenses = 0, totalClients = 0 } = storeSnapshot || {};

      const prompt = `Você é a IA operacional do Leshanot Studio — um sistema de gestão de beleza.
Hoje é ${todayString}.

DADOS DO NEGÓCIO HOJE:
- Agendamentos de hoje: ${JSON.stringify(todayAppointments)}
- Clientes sem visita há mais de 30 dias: ${inactiveClients.length} (nomes: ${inactiveClients.slice(0, 3).join(', ')}${inactiveClients.length > 3 ? '...' : ''})
- Receita nos últimos 7 dias: R$ ${recentRevenue.toFixed(2)}
- Despesas nos últimos 7 dias: R$ ${recentExpenses.toFixed(2)}
- Total de clientes cadastrados: ${totalClients}

TAREFA: Gere um briefing de boas-vindas personalizado e proativo. Seja direto, caloroso e útil. Use até 3 frases. Mencione os agendamentos do dia se houver, alerte sobre clientes inativos se relevante, e destaque o resultado financeiro se positivo. Termine com uma pergunta ou sugestão de ação concreta dentro do sistema (agendar, enviar mensagem, ver relatório). Responda em português do Brasil.`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      return new Response(
        JSON.stringify({ insight: response.text?.trim() || 'Olá! Pronto para mais um dia produtivo.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- COMMAND MODE: parse voice command ---
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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

    const result = JSON.parse(response.text || "{}");
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Gemini Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process voice command" }), { status: 500 });
  }
}
