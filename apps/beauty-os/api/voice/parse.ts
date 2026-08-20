import { GoogleGenAI, Type } from "@google/genai";

export const config = { runtime: 'nodejs20.x' };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { text, context } = await req.json();
  if (!text) {
    return new Response(JSON.stringify({ error: 'Text is required' }), { status: 400 });
  }

  try {
    const todayString = new Date().toISOString().split('T')[0];
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
