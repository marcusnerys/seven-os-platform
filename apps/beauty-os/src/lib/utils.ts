import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Data no formato YYYY-MM-DD segundo o relógio de quem está usando o app.
 *
 * `toISOString()` converte para UTC antes de formatar. Como o Brasil é UTC-3,
 * das 21h em diante ele devolve o dia seguinte — e salão e oficina costumam
 * estar abertos nesse horário. Todo lugar que decide "que dia é hoje" precisa
 * usar esta função, não `toISOString().split('T')[0]`.
 */
export function dataLocal(d: Date = new Date()): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Escapa um valor de texto para o formato iCalendar (RFC 5545).
 *
 * Barra invertida, ponto-e-vírgula e vírgula são separadores no formato, e
 * quebra de linha precisa virar a sequência de dois caracteres barra-n. Sem
 * isto, um cliente chamado "Silva, João" corrompe o arquivo e o aplicativo de
 * calendário recusa o evento inteiro.
 */
export function escapeICS(valor: string): string {
  return String(valor ?? '')
    .split('\\').join('\\\\')
    .split(';').join('\\;')
    .split(',').join('\\,')
    .split('\r\n').join('\\n')
    .split('\n').join('\\n');
}

export interface Ocupado {
  time: string;
  duration: number;
}

/** Minutos desde a meia-noite. "14:30" vira 870. */
export function emMinutos(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

/**
 * Se um horário pode ser escolhido na página pública de agendamento.
 *
 * Espelha as recusas da RPC de reserva (migration 0010): sobreposição com
 * atendimento já marcado e horário que já passou no próprio dia. Enquanto a
 * tela discordava do servidor, o visitante escolhia o horário, preenchia nome
 * e telefone e só no envio era recusado.
 */
export function horarioIndisponivel(
  slot: string,
  duracao: number,
  ocupados: Ocupado[],
  ehHoje: boolean,
  agoraMin: number
): boolean {
  const inicio = emMinutos(slot);
  const fim = inicio + duracao;

  if (ehHoje && inicio <= agoraMin) return true;

  return ocupados.some(o => {
    const oInicio = emMinutos(o.time);
    return inicio < oInicio + o.duration && fim > oInicio;
  });
}

/**
 * Data e hora em São Paulo, que é o fuso usado pela RPC de reserva.
 * O visitante pode estar em outro fuso — ou com o relógio errado — e nesse
 * caso a tela e o servidor discordariam sobre o que já passou.
 */
export function agoraEmSaoPaulo(): { dia: string; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());

  const get = (t: string) => partes.find(p => p.type === t)?.value ?? '00';
  return {
    dia: `${get('year')}-${get('month')}-${get('day')}`,
    minutos: Number(get('hour')) * 60 + Number(get('minute')),
  };
}
