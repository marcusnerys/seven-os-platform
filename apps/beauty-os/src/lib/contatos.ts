import { digitosTelefoneBR, formatarTelefoneBR, semAcento } from './utils';

/**
 * Contatos do celular para a lista de clientes.
 *
 * Dois caminhos, porque nenhum funciona em todo aparelho:
 * - Android (Chrome): o seletor de contatos do sistema (Contact Picker API).
 * - iPhone: o Safari não libera a agenda para sites nem para apps da tela
 *   inicial. O app Contatos exporta um arquivo .vcf (Listas → segurar
 *   "Todos os Contatos" → Exportar), e o app lê esse arquivo.
 */

export type ContatoImportado = { nome: string; telefone: string; email: string };

export const suportaSeletorDeContatos = (): boolean =>
  typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window;

/** Abre o seletor de contatos do Android. Lista vazia se a pessoa cancelar. */
export async function escolherContatosDoCelular(): Promise<ContatoImportado[]> {
  const escolhidos: Array<{ name?: string[]; tel?: string[]; email?: string[] }> =
    await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true });
  return (escolhidos ?? [])
    .map(c => ({ nome: (c.name?.[0] ?? '').trim(), telefone: c.tel?.[0] ?? '', email: c.email?.[0] ?? '' }))
    .filter(c => c.nome);
}

/** Desfaz os escapes de texto do vCard 3.0/4.0 (\, \; \n \\). */
function desescapar(valor: string): string {
  return valor.replace(/\\([\\,;nN])/g, (_, c) => (c === 'n' || c === 'N' ? ' ' : c));
}

/** Separa por ";" que não esteja escapado (\;). Sem lookbehind: o Safari
 *  anterior ao iOS 16.4 não o entende e a página inteira deixaria de abrir. */
function campos(valor: string): string[] {
  const partes: string[] = [];
  let atual = '';
  for (let i = 0; i < valor.length; i++) {
    if (valor[i] === '\\' && i + 1 < valor.length) {
      atual += valor[i] + valor[i + 1];
      i++;
    } else if (valor[i] === ';') {
      partes.push(atual);
      atual = '';
    } else {
      atual += valor[i];
    }
  }
  partes.push(atual);
  return partes;
}

/** vCard 2.1 (exportado por Android antigo) grava acentos em quoted-printable. */
function decodificarQP(valor: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < valor.length; i++) {
    if (valor[i] === '=' && /^[0-9A-F]{2}$/i.test(valor.slice(i + 1, i + 3))) {
      bytes.push(parseInt(valor.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(valor[i]));
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Lê um arquivo .vcf com um ou vários contatos. Nome vem do FN; sem ele, do
 * N (Sobrenome;Nome;...) ou da empresa. Telefone prefere o celular.
 */
export function lerVCard(texto: string): ContatoImportado[] {
  // Linha que começa com espaço continua a anterior (RFC 6350).
  // Arquivo salvo com BOM no início perdia o primeiro contato ("﻿BEGIN").
  const desdobradas = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  // No quoted-printable, "=" no fim também continua a linha. Só nesse caso:
  // a foto em base64 que o iPhone inclui termina em "=" e não continua.
  const linhas: string[] = [];
  for (const linha of desdobradas) {
    const anterior = linhas[linhas.length - 1];
    if (anterior !== undefined && /QUOTED-PRINTABLE/i.test(anterior.split(':')[0]) && anterior.endsWith('=')) {
      linhas[linhas.length - 1] = anterior.slice(0, -1) + linha;
    } else {
      linhas.push(linha);
    }
  }

  const contatos: ContatoImportado[] = [];
  let atual: { fn: string; n: string; org: string; tels: { valor: string; celular: boolean }[]; emails: string[] } | null = null;

  for (const linha of linhas) {
    const doisPontos = linha.indexOf(':');
    if (doisPontos < 0) continue;
    const chave = linha.slice(0, doisPontos);
    const bruto = linha.slice(doisPontos + 1);
    const partes = chave.split(';');
    // "item1.TEL" (iPhone agrupa campos assim) vira "TEL".
    const propriedade = partes[0].split('.').pop()!.toUpperCase();
    const parametros = partes.slice(1).join(';').toUpperCase();
    const valor = parametros.includes('QUOTED-PRINTABLE') ? decodificarQP(bruto) : bruto;

    if (propriedade === 'BEGIN' && valor.trim().toUpperCase() === 'VCARD') {
      atual = { fn: '', n: '', org: '', tels: [], emails: [] };
      continue;
    }
    if (!atual) continue;

    if (propriedade === 'END') {
      const nome = atual.fn || atual.n || atual.org;
      if (nome) {
        const tel = atual.tels.find(t => t.celular) ?? atual.tels[0];
        contatos.push({ nome, telefone: tel?.valor ?? '', email: atual.emails[0] ?? '' });
      }
      atual = null;
    } else if (propriedade === 'FN') {
      atual.fn = desescapar(valor).trim();
    } else if (propriedade === 'N') {
      const [sobrenome = '', nome = '', meio = ''] = campos(valor).map(p => desescapar(p).trim());
      atual.n = [nome, meio, sobrenome].filter(Boolean).join(' ');
    } else if (propriedade === 'ORG') {
      atual.org = desescapar(campos(valor)[0]).trim();
    } else if (propriedade === 'TEL') {
      const numero = valor.replace(/^tel:/i, '').trim();
      if (numero) atual.tels.push({ valor: numero, celular: /CELL|MOBILE|IPHONE/.test(parametros) });
    } else if (propriedade === 'EMAIL') {
      const email = valor.replace(/^mailto:/i, '').trim();
      if (email) atual.emails.push(email);
    }
  }
  return contatos;
}

type ClienteExistente = { name: string; phone: string };
export type NovoCliente = { name: string; phone: string; email: string };

/**
 * Tira da lista quem já é cliente ou aparece repetido. Compara telefone só
 * pelos dígitos nacionais ("(11) 99999-8888" e "+55 11 99999-8888" são o
 * mesmo); sem telefone, compara o nome.
 */
export function contatosNovos(contatos: ContatoImportado[], clientes: ClienteExistente[]): NovoCliente[] {
  const telefones = new Set(clientes.map(c => digitosTelefoneBR(c.phone)).filter(Boolean));
  const nomesSemTelefone = new Set(clientes.filter(c => !digitosTelefoneBR(c.phone)).map(c => semAcento(c.name)));
  const nomes = new Set(clientes.map(c => semAcento(c.name)));
  const novos: NovoCliente[] = [];

  for (const c of contatos) {
    const nome = c.nome.trim();
    if (!nome) continue;
    // Número de outro país ("+1 415...", "00351...") fica como veio: lido
    // como brasileiro, "+1 415 555 0100" virava (14) 15555-0100 e o WhatsApp
    // ia para um estranho.
    const internacional = /^\s*(\+|00)(?!55)/.test(c.telefone);
    const digitos = internacional ? c.telefone.replace(/\D/g, '') : digitosTelefoneBR(c.telefone);
    if (digitos ? telefones.has(digitos) : nomes.has(semAcento(nome))) continue;
    // Cliente cadastrado à mão sem telefone e o mesmo nome chegando com
    // telefone: é a mesma pessoa, não um segundo cadastro.
    if (digitos && nomesSemTelefone.has(semAcento(nome))) continue;
    // Só formata número nacional completo; os demais ficam com os dígitos.
    const telefone = internacional
      ? c.telefone.trim()
      : digitos.length === 10 || digitos.length === 11 ? formatarTelefoneBR(digitos) : digitos;
    novos.push({ name: nome, phone: telefone, email: c.email.trim() });
    if (digitos) telefones.add(digitos);
    nomes.add(semAcento(nome));
  }
  return novos;
}
