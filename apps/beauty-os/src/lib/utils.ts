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

/**
 * Dígitos de um telefone brasileiro sem código do país: DDD + número.
 *
 * Número colado da agenda do celular chega como "+55 11 99999-8888" ou
 * "011 99999-8888". Tratando só os dígitos crus, o formatador lia o 55 como
 * DDD e cortava o último dígito — "(55) 11999-9988" passava na validação e
 * era gravado errado, e o WhatsApp recebia um número que não existe.
 */
export function digitosTelefoneBR(raw: string): string {
  let d = String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return d.replace(/^0+/, '');
}

/**
 * Formata progressivamente enquanto a pessoa digita: (11) 99999-8888.
 *
 * O código do país só é removido quando o texto chega de fora do campo —
 * colado ou importado ("+55 11 ...", "5511..."). Digitando num campo que já
 * começa com "(", um dígito a mais é ignorado: tratar o DDD 55 (RS) como
 * código do país transformava "(55) 99999-8888" em outro número inteiro.
 */
export function formatarTelefoneBR(raw: string): string {
  const texto = String(raw ?? '');
  const digitado = texto.trimStart().startsWith('(');
  const d = (digitado ? texto.replace(/\D/g, '') : digitosTelefoneBR(texto)).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (d.length <= 10) {
    return resto.length > 4 ? `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}` : `(${ddd}) ${resto}`;
  }
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}

/**
 * Fim de um evento no formato iCalendar (YYYYMMDDTHHMMSS), virando o dia
 * quando passa da meia-noite. Antes o dia ficava fixo e só a hora dava a
 * volta: um atendimento das 23h com duas horas terminava às 01h do MESMO
 * dia, antes de começar, e o aplicativo de calendário recusava o evento.
 */
export function fimDoEventoICS(data: string, hora: string, duracaoMin: number): string {
  const [a, m, d] = data.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  const fim = new Date(Date.UTC(a, m - 1, d, h, min + (duracaoMin || 60)));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${fim.getUTCFullYear()}${p(fim.getUTCMonth() + 1)}${p(fim.getUTCDate())}T${p(fim.getUTCHours())}${p(fim.getUTCMinutes())}00`;
}

/**
 * Se hoje é aniversário. Quem nasceu em 29/02 é lembrado em 28/02 nos anos
 * que não são bissextos — antes simplesmente não aparecia em três de cada
 * quatro anos.
 */
export function ehAniversarioHoje(dataNascimento: string | undefined, hoje: string): boolean {
  if (!dataNascimento || dataNascimento.length < 10) return false;
  const mesDiaNasc = dataNascimento.slice(5, 10);
  const mesDiaHoje = hoje.slice(5, 10);
  if (mesDiaNasc === mesDiaHoje) return true;

  const ano = Number(hoje.slice(0, 4));
  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  return mesDiaNasc === '02-29' && mesDiaHoje === '02-28' && !bissexto;
}

/** Minúsculas, sem acento e com espaços normalizados, para comparar nomes. */
export const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * Acha uma pessoa pelo nome falado, com a confiança da correspondência.
 *
 * Antes era `nome.includes(falado)` e valia o primeiro da lista: "Ana" casava
 * com "Mariana", "Luana" e "Juliana". Um comando de voz marcava horário, dava
 * VIP ou mandava WhatsApp para a pessoa errada. Agora a busca vai por níveis
 * — nome idêntico, depois palavras inteiras no início do nome, depois palavra
 * inteira em qualquer posição, depois trecho — e se mais de uma pessoa empata
 * no melhor nível, devolve `ambiguo` para o assistente perguntar em vez de
 * escolher sozinho.
 */
export function acharPorNome<T extends { name: string }>(
  lista: T[],
  falado: string
): { item: T | null; ambiguo: boolean } {
  const alvo = semAcento(falado || '');
  if (!alvo) return { item: null, ambiguo: false };

  const palavrasAlvo = alvo.split(' ');
  const niveis: Array<(nome: string) => boolean> = [
    nome => nome === alvo,
    nome => {
      const palavras = nome.split(' ');
      return palavrasAlvo.every((p, i) => palavras[i] === p);
    },
    nome => {
      const palavras = nome.split(' ');
      return palavrasAlvo.every(p => palavras.includes(p));
    },
    nome => nome.includes(alvo),
  ];

  for (const casa of niveis) {
    const achados = lista.filter(x => casa(semAcento(x.name || '')));
    if (achados.length === 1) return { item: achados[0], ambiguo: false };
    if (achados.length > 1) return { item: null, ambiguo: true };
  }
  return { item: null, ambiguo: false };
}
