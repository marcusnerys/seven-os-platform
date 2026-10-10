/**
 * Google Agenda (v3): conexão OAuth e envio dos agendamentos.
 *
 * Rotas (publicada com verify_jwt = false: a volta do Google e o gatilho do
 * banco não trazem token do Supabase; as rotas da pessoa conferem o token
 * aqui dentro):
 *   POST /status       → { configurado, conectado, email }
 *   POST /iniciar      → { url } da tela de permissão do Google
 *   GET  /callback     ← o Google volta aqui; grava a conexão e redireciona
 *   POST /evento       ← gatilho do banco (migration 0020) a cada mudança
 *   POST /sincronizar  → manda os agendamentos futuros de uma vez
 *   POST /desconectar  → revoga a permissão e apaga a conexão
 *
 * Chaves nos secrets do Supabase: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 * Sem elas, /status responde configurado: false e o app mostra a integração
 * como "ainda não ativada".
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const APP_URL = 'https://leshanotos.vercel.app';
// Só a agenda que o próprio app cria: nada dos outros compromissos da pessoa.
const ESCOPOS = 'openid email https://www.googleapis.com/auth/calendar.app.created';
const ESTADO_VALIDADE_MS = 15 * 60_000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const REDIRECT = `${SUPABASE_URL}/functions/v1/google-agenda/callback`;

// ─── Banco com a chave de serviço (só aqui no servidor) ─────────────────

const comoServico = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };
async function rest(caminho: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, { ...init, headers: { ...comoServico, ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`Banco ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const texto = await r.text();
  return texto ? JSON.parse(texto) : null;
}

/** Quem está chamando, pelo token do app. */
async function quemChama(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return (await r.json()).id ?? null;
}

// ─── Google ──────────────────────────────────────────────────────────────

type Conexao = { empresa_id: string; refresh_token: string; calendario_id: string; email: string | null };

async function tokenDeAcesso(refresh: string): Promise<string> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' }),
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(`Google recusou a renovação: ${d.error ?? r.status}`);
  return d.access_token;
}

async function google(acesso: string, metodo: string, caminho: string, corpo?: unknown) {
  return fetch(`https://www.googleapis.com/calendar/v3/${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

/** Fim do atendimento em horário de Brasília (sem horário de verão desde 2019). */
function fimDoAtendimento(data: string, hora: string, minutos: number) {
  const [a, m, d] = data.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d, h, mi + (minutos || 60)));
  return t.toISOString().slice(0, 16) + ':00';
}

type Agendamento = {
  id: string; empresa_id: string; client_id: string | null; client_name: string | null; service: string;
  date: string; time: string; duration: number; status: string; notes: string | null; google_evento_id: string | null;
};

function eventoDo(a: Agendamento, cliente: string) {
  return {
    summary: `${a.service} — ${cliente}`,
    description: [a.notes, 'Agendado pelo Leshanot OS'].filter(Boolean).join('\n\n'),
    start: { dateTime: `${a.date}T${a.time}:00`, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: fimDoAtendimento(a.date, a.time, a.duration), timeZone: 'America/Sao_Paulo' },
    status: a.status === 'Pendente' ? 'tentative' : 'confirmed',
    extendedProperties: { private: { leshanotId: a.id } },
  };
}

/** Leva um agendamento ao Google: cria, atualiza ou apaga o evento. */
async function enviar(con: Conexao, acesso: string, a: Agendamento | null, eventoAntigo: string | null) {
  const cal = encodeURIComponent(con.calendario_id);
  if (!a || a.status === 'Cancelado') {
    const id = a?.google_evento_id ?? eventoAntigo;
    if (id) {
      const r = await google(acesso, 'DELETE', `calendars/${cal}/events/${encodeURIComponent(id)}`);
      if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error(`Google ${r.status} ao apagar`);
    }
    if (a?.google_evento_id) {
      await rest(`beautyos_appointments?id=eq.${a.id}`, { method: 'PATCH', body: JSON.stringify({ google_evento_id: null }) });
    }
    return;
  }

  let cliente = a.client_name || 'Cliente';
  if (a.client_id) {
    const [c] = await rest(`beautyos_clients?id=eq.${a.client_id}&select=name`);
    if (c?.name) cliente = c.name;
  }
  const evento = eventoDo(a, cliente);

  if (a.google_evento_id) {
    const r = await google(acesso, 'PATCH', `calendars/${cal}/events/${encodeURIComponent(a.google_evento_id)}`, evento);
    if (r.ok) return;
    // Apagado à mão no Google: cria de novo.
    if (r.status !== 404 && r.status !== 410) throw new Error(`Google ${r.status} ao atualizar`);
  }
  const r = await google(acesso, 'POST', `calendars/${cal}/events`, evento);
  if (!r.ok) throw new Error(`Google ${r.status} ao criar: ${(await r.text()).slice(0, 200)}`);
  const criado = await r.json();
  await rest(`beautyos_appointments?id=eq.${a.id}`, { method: 'PATCH', body: JSON.stringify({ google_evento_id: criado.id }) });
}

async function conexaoDe(empresa: string): Promise<Conexao | null> {
  const [c] = await rest(`beautyos_google?empresa_id=eq.${empresa}&select=empresa_id,refresh_token,calendario_id,email`);
  return c ?? null;
}

async function registrarErro(empresa: string, erro: unknown) {
  const msg = (erro as Error)?.message ?? String(erro);
  console.error('google-agenda', empresa, msg);
  await rest(`beautyos_google?empresa_id=eq.${empresa}`, { method: 'PATCH', body: JSON.stringify({ ultimo_erro: msg.slice(0, 300) }) }).catch(() => {});
}

/** Agendamentos de hoje em diante, não cancelados. */
async function sincronizarTudo(con: Conexao) {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  // Próximos 6 meses, até 300: cabe no tempo da função (150 s).
  const limite = new Date(Date.now() + 183 * 86_400_000).toISOString().slice(0, 10);
  const lista: Agendamento[] = await rest(
    `beautyos_appointments?empresa_id=eq.${con.empresa_id}&date=gte.${hoje}&date=lte.${limite}&status=neq.Cancelado&order=date,time&limit=300` +
    '&select=id,empresa_id,client_id,client_name,service,date,time,duration,status,notes,google_evento_id',
  );
  const acesso = await tokenDeAcesso(con.refresh_token);
  let enviados = 0;
  for (const a of lista) {
    await enviar(con, acesso, a, null);
    enviados++;
  }
  await rest(`beautyos_google?empresa_id=eq.${con.empresa_id}`, { method: 'PATCH', body: JSON.stringify({ ultimo_erro: null }) });
  return enviados;
}

// ─── Rotas ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const rota = new URL(req.url).pathname.split('/').pop();
  const configurado = Boolean(CLIENT_ID && CLIENT_SECRET);

  try {
    if (rota === 'callback') return await callback(new URL(req.url));

    if (rota === 'evento') {
      // Vem do gatilho do banco. Não confia no corpo: relê o agendamento.
      if (!configurado) return json({ ok: true, ignorado: 'não configurado' });
      const { id, empresa_id, apagado, evento } = await req.json();
      if (typeof id !== 'string' || typeof empresa_id !== 'string') return json({ error: 'corpo inválido' }, 400);
      const con = await conexaoDe(empresa_id);
      if (!con) return json({ ok: true, ignorado: 'sem conexão' });
      const [a] = apagado ? [null] : await rest(
        `beautyos_appointments?id=eq.${id}&empresa_id=eq.${empresa_id}` +
        '&select=id,empresa_id,client_id,client_name,service,date,time,duration,status,notes,google_evento_id',
      );
      try {
        await enviar(con, await tokenDeAcesso(con.refresh_token), a ?? null, typeof evento === 'string' ? evento : null);
      } catch (erro) {
        await registrarErro(empresa_id, erro);
      }
      return json({ ok: true });
    }

    const empresa = await quemChama(req);
    if (!empresa) return json({ error: 'Entre no app de novo.' }, 401);

    if (rota === 'status') {
      const con = await conexaoDe(empresa);
      const [extra] = con ? await rest(`beautyos_google?empresa_id=eq.${empresa}&select=ultimo_erro`) : [null];
      return json({ configurado, conectado: Boolean(con), email: con?.email ?? null, erro: extra?.ultimo_erro ?? null });
    }

    if (!configurado) return json({ error: 'A integração com o Google ainda não foi ativada.' }, 503);

    if (rota === 'iniciar') {
      const estado = crypto.randomUUID();
      await rest('beautyos_google_estados', { method: 'POST', body: JSON.stringify({ estado, empresa_id: empresa }) });
      const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code', scope: ESCOPOS,
        access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: estado,
      });
      return json({ url });
    }

    if (rota === 'sincronizar') {
      const con = await conexaoDe(empresa);
      if (!con) return json({ error: 'Google Agenda não conectado.' }, 400);
      try {
        return json({ enviados: await sincronizarTudo(con) });
      } catch (erro) {
        await registrarErro(empresa, erro);
        return json({ error: 'O Google não respondeu. Tente de novo em instantes.' }, 502);
      }
    }

    if (rota === 'desconectar') {
      const con = await conexaoDe(empresa);
      if (con) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(con.refresh_token)}`, { method: 'POST' }).catch(() => {});
        await rest(`beautyos_google?empresa_id=eq.${empresa}`, { method: 'DELETE' });
        await rest(`beautyos_appointments?empresa_id=eq.${empresa}&google_evento_id=not.is.null`, { method: 'PATCH', body: JSON.stringify({ google_evento_id: null }) });
      }
      return json({ ok: true });
    }

    return json({ error: 'rota desconhecida' }, 404);
  } catch (erro) {
    console.error('google-agenda falhou:', erro);
    return json({ error: 'Erro interno na integração com o Google.' }, 500);
  }
});

/** Volta do Google com o código: troca por tokens, cria a agenda e grava. */
async function callback(url: URL): Promise<Response> {
  const voltar = (resultado: string) => Response.redirect(`${APP_URL}/?google=${resultado}`, 302);
  const codigo = url.searchParams.get('code');
  const estado = url.searchParams.get('state');
  if (url.searchParams.get('error') || !codigo || !estado) return voltar('cancelado');

  const [linha] = await rest(`beautyos_google_estados?estado=eq.${encodeURIComponent(estado)}&select=empresa_id,criado_em`);
  await rest(`beautyos_google_estados?estado=eq.${encodeURIComponent(estado)}`, { method: 'DELETE' });
  if (!linha || Date.now() - new Date(linha.criado_em).getTime() > ESTADO_VALIDADE_MS) return voltar('expirado');

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: codigo, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
  });
  const tokens = await r.json();
  if (!r.ok || !tokens.refresh_token) {
    console.error('Troca do código falhou:', tokens.error ?? r.status);
    return voltar('erro');
  }

  // E-mail da conta, só para mostrar no app ("Conectado como ...").
  let email: string | null = null;
  try { email = JSON.parse(atob(tokens.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email ?? null; } catch { /* sem e-mail */ }

  // Uma agenda só do Leshanot: os compromissos pessoais ficam intocados.
  // Reconectando, reaproveita a agenda que já existe, se ainda estiver lá.
  let calendario_id: string | null = null;
  const anterior = await conexaoDe(linha.empresa_id);
  if (anterior?.calendario_id) {
    const r2 = await google(tokens.access_token, 'GET', `calendars/${encodeURIComponent(anterior.calendario_id)}`);
    if (r2.ok) calendario_id = anterior.calendario_id;
  }
  if (!calendario_id) {
    const [config] = await rest(`beautyos_settings?empresa_id=eq.${linha.empresa_id}&select=studio_name`);
    const cal = await google(tokens.access_token, 'POST', 'calendars', {
      summary: `Leshanot — ${config?.studio_name ?? 'Agenda'}`,
      timeZone: 'America/Sao_Paulo',
    });
    if (!cal.ok) {
      console.error('Criar agenda falhou:', cal.status, await cal.text());
      return voltar('erro');
    }
    calendario_id = (await cal.json()).id as string;
  }

  await rest('beautyos_google', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ empresa_id: linha.empresa_id, refresh_token: tokens.refresh_token, calendario_id, email, conectado_em: new Date().toISOString(), ultimo_erro: null }),
  });

  // Os agendamentos que já existem vão em segundo plano: a pessoa volta ao
  // app na hora.
  EdgeRuntime.waitUntil(
    sincronizarTudo({ empresa_id: linha.empresa_id, refresh_token: tokens.refresh_token, calendario_id: calendario_id!, email })
      .catch(erro => registrarErro(linha.empresa_id, erro)),
  );
  return voltar('conectado');
}
