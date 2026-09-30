/**
 * Agenda no formato iCalendar, para o calendário do celular assinar.
 *
 * GET /api/agenda?t=<segredo do negócio>. O iPhone assina pelo link webcal://
 * e o Google Agenda pelo "Adicionar por URL"; os dois voltam aqui de tempos em
 * tempos e pegam o que mudou. O segredo mora em beautyos_settings.agenda_token
 * (migration 0017) e é conferido no banco pela função
 * beautyos_agenda_calendario, chamada com a chave pública.
 */

interface Req {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}
interface Res {
  status(codigo: number): Res;
  setHeader(nome: string, valor: string): void;
  send(corpo: string): void;
}

export type LinhaDaAgenda = {
  id: string;
  data: string;      // YYYY-MM-DD, horário de Brasília
  hora: string;      // HH:MM
  duracao: number;   // minutos
  servico: string;
  cliente: string;
  status: string;
  observacao: string | null;
  negocio: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Escapa texto para o iCalendar (RFC 5545 §3.3.11). */
function escapar(valor: string): string {
  return valor.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/**
 * Horário de Brasília para UTC no formato do iCalendar. O Brasil não tem
 * horário de verão desde 2019, então é sempre +3 h. Em UTC o evento aparece
 * certo em qualquer calendário, sem depender de bloco de fuso.
 */
function emUtc(data: string, hora: string, somarMin = 0): string {
  const [a, m, d] = data.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d, h + 3, min + somarMin));
  return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Linhas longas dobradas em 75 octetos, como a RFC pede. */
function dobrar(linha: string): string {
  const bytes = new TextEncoder().encode(linha);
  if (bytes.length <= 75) return linha;
  const partes: string[] = [];
  let atual = '';
  let tamanho = 0;
  for (const ch of linha) {
    const n = new TextEncoder().encode(ch).length;
    if (tamanho + n > (partes.length ? 74 : 75)) {
      partes.push(atual);
      atual = '';
      tamanho = 0;
    }
    atual += ch;
    tamanho += n;
  }
  partes.push(atual);
  return partes.join('\r\n ');
}

export function montarCalendario(linhas: LinhaDaAgenda[], nomeDoNegocio: string, agora: Date): string {
  const carimbo = agora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const eventos = linhas
    .filter(l => /^\d{4}-\d{2}-\d{2}$/.test(l.data) && /^\d{2}:\d{2}$/.test(l.hora))
    .flatMap(l => [
      'BEGIN:VEVENT',
      `UID:${l.id}@leshanot`,
      `DTSTAMP:${carimbo}`,
      `DTSTART:${emUtc(l.data, l.hora)}`,
      `DTEND:${emUtc(l.data, l.hora, l.duracao || 60)}`,
      `SUMMARY:${escapar(`${l.servico} - ${l.cliente}`)}`,
      ...(l.observacao ? [`DESCRIPTION:${escapar(l.observacao)}`] : []),
      `STATUS:${l.status === 'Pendente' ? 'TENTATIVE' : 'CONFIRMED'}`,
      'END:VEVENT',
    ]);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leshanot OS//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapar(nomeDoNegocio || 'Leshanot')}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    // Pede ao calendário para buscar de novo a cada hora. O iPhone respeita;
    // o Google Agenda decide sozinho (costuma levar algumas horas).
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...eventos,
    'END:VCALENDAR',
  ].map(dobrar).join('\r\n') + '\r\n';
}

export default async function handler(req: Req, res: Res): Promise<void> {
  const token = String(req.query?.t ?? '');
  if (!UUID.test(token)) {
    res.status(404).send('Link de agenda inválido.');
    return;
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    res.status(503).send('Agenda indisponível no momento.');
    return;
  }

  const resposta = await fetch(`${url}/rest/v1/rpc/beautyos_agenda_calendario`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
  }).catch(() => null);
  if (!resposta?.ok) {
    res.status(503).send('Agenda indisponível no momento.');
    return;
  }

  const linhas = (await resposta.json()) as LinhaDaAgenda[];
  // Segredo que não existe e negócio sem agendamento devolvem a mesma lista
  // vazia: o calendário simplesmente fica vazio, sem revelar se o link vale.
  const nome = linhas[0]?.negocio ?? 'Leshanot';
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(200).send(montarCalendario(linhas, nome, new Date()));
}
