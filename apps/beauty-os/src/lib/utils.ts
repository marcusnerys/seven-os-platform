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
