import { GoogleGenAI, ThinkingLevel } from "@google/genai";

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
  headers?: Record<string, string | string[] | undefined>;
}
interface Res {
  status(codigo: number): Res;
  json(corpo: unknown): void;
  setHeader(nome: string, valor: string): void;
}

/**
 * Modelos em ordem de preferência.
 *
 * O código apontava para gemini-1.5-flash, aposentado pelo Google: toda
 * chamada voltava 404 e o assistente de voz não funcionava. Versão fixa
 * quebra na aposentadoria seguinte, e só o apelido não basta — no nível
 * gratuito ele responde 503 em horário cheio, medido aqui. Com dois, uma
 * saturação passageira do primeiro não derruba o recurso.
 */
//
// Velocidade: cada comando levava 9 s em média e até 26 s, medido em
// produção. O Flash pensa no nível médio por padrão, e o reserva de então
// (gemini-3-flash-preview) no alto — para classificar uma frase curta isso só
// atrasa. E a cota gratuita diária do Flash é pequena: depois de umas vinte
// chamadas ele passa o resto do dia respondendo 429. O Flash-Lite pensa no
// mínimo por padrão, acertou 9 de 10 comandos de teste (a décima foi prazo
// estourado) e respondeu entre 0,9 e 4 s. Ele vai na frente; o Flash, no
// nível baixo de pensamento, fica de reserva.
type Modelo = { nome: string; pensamento?: ThinkingLevel };
const MODELOS: Modelo[] = [
  { nome: "gemini-flash-lite-latest" },
  { nome: "gemini-flash-latest", pensamento: ThinkingLevel.LOW },
];

// Espera antes de cada rodada pelos modelos. Com fila cheia num deles, o
// outro é tentado na hora; só depois de os dois falharem é que se espera.
// Uma chamada lenta do Flash-Lite costuma sair rápido na repetição.
const ESPERAS_MS = [0, 500, 1000];

// Prazo de cada tentativa. Uma chamada empacada passa para o próximo modelo
// em vez de segurar a pessoa até o limite da função: seis tentativas cabem
// nos 30 s porque o Flash sem cota responde 429 em 0,2 s.
const PRAZO_TENTATIVA_MS = 6000;
const ehPassageiro = (erro: unknown) => {
  const status = (erro as { status?: number })?.status;
  return status === 429 || status === 503;
};

/**
 * Chama o Gemini repetindo em fila cheia (429) e indisponibilidade
 * momentânea (503), e passando para o próximo modelo quando o primeiro
 * continua indisponível. Uma tentativa só transformava um tropeço de
 * segundos em erro na tela.
 */
async function comRepeticao<T>(
  chamada: (modelo: Modelo, sinal: AbortSignal) => Promise<T>,
  tentativas: string[],
): Promise<{ resposta: T; modelo: string }> {
  let ultimoErro: unknown;

  for (const espera of ESPERAS_MS) {
    if (espera) await new Promise(r => setTimeout(r, espera));
    for (const modelo of MODELOS) {
      const sinal = AbortSignal.timeout(PRAZO_TENTATIVA_MS);
      const inicio = Date.now();
      try {
        const resposta = await chamada(modelo, sinal);
        tentativas.push(`${modelo.nome} ok ${Date.now() - inicio}ms`);
        return { resposta, modelo: modelo.nome };
      } catch (erro) {
        const motivo = sinal.aborted ? 'prazo' : String((erro as { status?: number })?.status ?? 'erro');
        tentativas.push(`${modelo.nome} ${motivo} ${Date.now() - inicio}ms`);
        // Prazo estourado conta como indisponível: a tela diz "ocupado".
        ultimoErro = sinal.aborted ? { status: 503 } : erro;
        if (!sinal.aborted && !ehPassageiro(erro)) throw erro;
      }
    }
  }

  throw ultimoErro;
}

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

  // Só quem está logado no app. A rota era pública: qualquer pessoa na
  // internet podia chamá-la e gastar a cota gratuita do Gemini, que é uma só
  // para todos os negócios — esgotada, o assistente parava para todo mundo.
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const token = String(req.headers?.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token || !supabaseUrl || !supabaseAnon) {
    res.status(401).json({ error: 'Entre no app para usar o assistente.' });
    return;
  }
  // Login e contagem de uso ao mesmo tempo: em sequência eram duas idas ao
  // banco uma depois da outra antes de a IA começar.
  const inicio = Date.now();
  const [quem, uso] = await Promise.all([
    fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnon },
    }),
    // Login sozinho não protege a cota: criar conta é livre, e uma conta
    // descartável em loop esgotava o Gemini de todos os negócios. O uso é
    // contado por pessoa e por hora no banco (migration 0016). Se a contagem
    // falhar por rede, deixa passar — é proteção contra abuso, não cobrança.
    fetch(`${supabaseUrl}/rest/v1/rpc/beautyos_registrar_uso_ia`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnon, 'Content-Type': 'application/json' },
      body: '{}',
    }).then(r => (r.ok ? r.json() : true)).catch(() => true),
  ]);
  const msLogin = Date.now() - inicio;
  if (!quem.ok) {
    res.status(401).json({ error: 'Sessão expirada. Entre de novo.' });
    return;
  }

  if (uso === false) {
    res.status(429).json({ error: 'Você usou o assistente muitas vezes nesta hora. Tente de novo mais tarde.' });
    return;
  }

  const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { text, context } = corpo;
  if (typeof text === 'string' && text.length > 1000) {
    res.status(400).json({ error: 'Comando longo demais.' });
    return;
  }
  // Contexto e retrato do negócio vão inteiros para o prompt; sem teto,
  // uma chamada podia mandar megabytes e gastar a cota de uma vez.
  if (JSON.stringify(corpo).length > 60_000) {
    res.status(413).json({ error: 'Dados demais para o assistente.' });
    return;
  }

  // Cada tentativa (modelo, resultado, tempo) vai num cabeçalho da resposta:
  // mostra onde a demora está sem precisar abrir o log da Vercel.
  const tentativas: string[] = [];
  try {
    const ai = new GoogleGenAI({ apiKey });
    const todayString = hojeEmBrasilia();

    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const inicioIa = Date.now();
    const { resposta: response, modelo } = await comRepeticao((modelo, sinal) => ai.models.generateContent({
      model: modelo.nome,
      contents: `Você é o assistente operacional (AI) do Leshanot OS, um sistema de gestão para pequenos negócios: salões, oficinas, prestadores de serviço. Entenda o vocabulário de qualquer um deles ("troca de óleo", "revisão", "corte", "manicure").
Comando: "${text}"
Contexto: ${JSON.stringify(context || {})}
Hoje: ${todayString}

Ações Suportadas:
- create_appointment: {clientName, service, date, time}
- cancel_appointment: {clientName, date, time}
- create_client: {name, phone?}
- create_revenue: {amount, description?, date?}
- create_expense: {amount, description, category?, date?}
- update_client_notes: {clientName, notes}
- update_client_vip: {clientName, isVIP}
- create_service: {name, price, duration?}
- get_daily_summary: {}
- show_dashboard_summary: {}
- search_client: {clientName?}
- send_whatsapp: {clientName}
- show_financial_summary: {}
- list_inactive_clients: {}
- delete_client: {clientName}
- delete_transaction: {type?: "revenue" | "expense", amount?, description?, date?}
- unknown: {}

Regras:
1. Retorne JSON estruturado.
2. Identifique nomes de clientes e serviços no contexto se possível.
3. Se faltar dado vital (ex: valor da despesa ou hora do agendamento), use status 'incomplete'.
4. 'message' deve ser uma resposta curta e profissional confirmando a ação ou pedindo o que falta.
5. Preencha em 'data' TODOS os campos da ação escolhida. O que estiver só na
   mensagem e não em 'data' é descartado pelo aplicativo, e a pessoa ouve que
   deu certo sem nada ter acontecido.
6. 'date' sempre no formato YYYY-MM-DD, nunca por extenso: resolva "hoje",
   "amanhã", "sexta" e similares contra a data de hoje informada acima.
   'time' sempre no formato HH:MM em 24 horas.
7. Excluir, apagar ou remover um cliente é delete_client. Excluir uma
   receita, despesa, gasto, venda ou lançamento é delete_transaction, com
   o que a pessoa disser para identificar (valor, descrição, data). Excluir
   ou desmarcar um agendamento é cancel_appointment. O aplicativo pede
   confirmação antes de excluir; em 'message' diga só o que vai ser excluído.

Exemplo. Para "agendar corte para a Maria amanhã às 15h", com hoje sendo
2026-03-10, a resposta correta é:
{"action":"create_appointment","data":{"clientName":"Maria","service":"Corte","date":"2026-03-11","time":"15:00"},"message":"Agendamento de corte para Maria confirmado para 11/03 às 15:00.","status":"complete"}
Repare que a data resolvida aparece em 'data', não só na mensagem.

JSON:
{
  "action": "...",
  "data": { ... },
  "message": "...",
  "status": "complete" | "incomplete"
}`,
      config: {
        // Só o tipo da resposta, sem responseSchema. O schema declarava um
        // `data` achatado com os treze campos de todas as catorze ações, e o
        // modelo se perdia: omitia a data resolvida ou a colava dentro de
        // outro campo ("time":"15:00Source: 2026-09-24"). Antes disso o
        // `data` era um OBJECT sem properties, que a saída estruturada do
        // Gemini devolve sempre vazio — o assistente dizia "confirmado" e
        // nada era criado, em todo comando. Sem schema, o modelo segue o
        // formato do prompt e devolve o objeto certo de cada ação; a
        // conferência de campos obrigatórios logo abaixo é a rede.
        responseMimeType: "application/json",
        ...(modelo.pensamento && { thinkingConfig: { thinkingLevel: modelo.pensamento } }),
        abortSignal: sinal,
      },
    }), tentativas);
    const msIa = Date.now() - inicioIa;

    // O modelo às vezes embrulha o JSON em bloco de código.
    const limpo = (response.text || '{}')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let resultado: any;
    try {
      resultado = JSON.parse(limpo);
    } catch {
      const trecho = limpo.match(/\{[\s\S]*\}/);
      resultado = trecho ? JSON.parse(trecho[0]) : {};
    }

    // O modelo às vezes resolve a data na frase ("amanhã, 24/09") e esquece
    // de repetir em 'data'. voiceService descarta o comando sem os campos
    // obrigatórios, e sem esta checagem a pessoa ouviria "confirmado" sem
    // nada ter sido criado. Faltando campo, o comando vira 'incomplete' e o
    // assistente pergunta o que falta.
    const OBRIGATORIOS: Record<string, string[]> = {
      create_appointment: ['clientName', 'date', 'time'],
      cancel_appointment: ['clientName', 'date'],
      create_client: ['name'],
      create_revenue: ['amount'],
      create_expense: ['amount'],
      create_service: ['name', 'price'],
      update_client_notes: ['clientName', 'notes'],
      update_client_vip: ['clientName'],
      send_whatsapp: ['clientName'],
      delete_client: ['clientName'],
    };

    const exigidos = OBRIGATORIOS[resultado?.action] ?? [];
    const faltando = exigidos.filter(campo => {
      const valor = resultado?.data?.[campo];
      return valor === undefined || valor === null || valor === '';
    });

    if (faltando.length) {
      const NOMES: Record<string, string> = {
        clientName: 'o nome', name: 'o nome', date: 'a data', time: 'o horário',
        amount: 'o valor', price: 'o preço', notes: 'a observação',
      };
      const pedidos = faltando.map(c => NOMES[c] ?? c);
      resultado.status = 'incomplete';
      resultado.message = `Faltou ${pedidos.join(' e ')}. Pode repetir incluindo isso?`;
    }

    // Tempo de cada etapa, visível nas ferramentas do navegador: diz se a
    // demora está no login ou na IA sem precisar abrir o log da Vercel.
    res.setHeader('Server-Timing', `login;dur=${msLogin}, ia;dur=${msIa};desc="${modelo}"`);
    res.setHeader('X-Voz-Tentativas', tentativas.join(', '));
    res.status(200).json(resultado);
  } catch (error) {
    res.setHeader('X-Voz-Tentativas', tentativas.join(', '));
    console.error("Gemini Error:", error);
    // Fila cheia ou indisponibilidade do Gemini não é defeito daqui: devolve
    // 503 para o front cair na resposta alternativa em vez de mostrar erro.
    const status = (error as { status?: number })?.status;
    if (status === 429 || status === 503) {
      res.status(503).json({ error: 'Assistente ocupado no momento. Tente de novo em instantes.' });
      return;
    }
    res.status(500).json({ error: 'Não consegui entender o comando agora. Tente de novo.' });
  }
}
