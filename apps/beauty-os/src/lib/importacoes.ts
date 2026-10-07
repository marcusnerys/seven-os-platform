import { create } from 'zustand';
import { supabase } from './supabase';
import { readStatementWithOCR, sanitizarTransacoes, type ParsedTransaction } from './ocr';
import { dataLocal, novoUUID } from './utils';

/**
 * Leitura de extratos em segundo plano, um ou vários arquivos de uma vez.
 *
 * Cada arquivo sobe para a função parse-statement, que responde na hora com
 * o id de uma linha em beautyos_importacoes (migration 0018) e continua
 * lendo sozinha, gravando quantos lançamentos já achou e, no fim, as
 * transações. Daqui o app acompanha pelo realtime: a pessoa pode seguir
 * usando o app, trocar de tela ou fechar e voltar — a leitura não depende
 * da tela aberta.
 */

export type EstadoImportacao = 'enviando' | 'lendo' | 'pronto' | 'erro';

export interface Importacao {
  /** Id da linha no banco; "local-..." enquanto o arquivo ainda sobe. */
  id: string;
  arquivo: string;
  status: EstadoImportacao;
  /** Envio do arquivo (0 a 1), ou progresso da leitura offline. */
  enviado: number;
  encontradas: number;
  transacoes: ParsedTransaction[];
  erro: string | null;
  criadoEm: number;
  /** Foto: dá para tentar a leitura offline, sem IA, se a IA falhar. */
  imagem: boolean;
  /** Lida no aparelho, sem IA. */
  offline?: boolean;
}

const LIMITE_ARQUIVO = 20 * 1024 * 1024;
// Envios simultâneos. Cada um vira uma chamada ao Gemini, e o nível gratuito
// recusa rajadas; a função já repete, mas dez de uma vez esgotariam as
// tentativas.
const SIMULTANEOS = 2;
// A função é encerrada em 150 s. Linha ainda em "lendo" depois disso não
// vai mais mudar.
const PRAZO_LEITURA_MS = 3 * 60_000;
// Leituras antigas que ninguém revisou saem sozinhas.
const VALIDADE_MS = 7 * 24 * 60 * 60_000;

// O arquivo fica em memória só para a leitura offline de fotos.
const arquivos = new Map<string, File>();
/** O arquivo ainda está no aparelho (enviado nesta sessão)? */
export const temArquivoLocal = (id: string) => arquivos.has(id);

// Leitura offline de uma linha que a IA não leu: vale sobre a do banco, que
// continua dizendo "erro".
const offline = new Map<string, Importacao>();

type Linha = {
  id: string; arquivo: string | null; status: 'lendo' | 'pronto' | 'erro';
  encontradas: number; transacoes: unknown; erro: string | null; criado_em: string;
};

function daLinha(l: Linha): Importacao {
  const criadoEm = new Date(l.criado_em).getTime();
  const preso = l.status === 'lendo' && Date.now() - criadoEm > PRAZO_LEITURA_MS;
  return {
    id: l.id,
    arquivo: l.arquivo ?? 'extrato',
    status: preso ? 'erro' : l.status,
    enviado: 1,
    encontradas: l.encontradas,
    transacoes: l.status === 'pronto' ? sanitizarTransacoes(l.transacoes, dataLocal()) : [],
    erro: preso ? 'A leitura demorou demais. Envie um período menor ou uma foto de cada página.' : l.erro,
    criadoEm,
    imagem: /\.(jpe?g|png|webp|heic|heif)$/i.test(l.arquivo ?? ''),
  };
}

type Estado = {
  itens: Importacao[];
  painel: 'aberto' | 'minimizado';
  /** Pedido para o Financeiro abrir a revisão dos prontos. */
  revisar: boolean;
  enviar: (files: File[]) => void;
  carregar: () => Promise<void>;
  descartar: (ids: string[]) => Promise<void>;
  lerOffline: (id: string) => Promise<void>;
  setPainel: (painel: 'aberto' | 'minimizado') => void;
  setRevisar: (revisar: boolean) => void;
  /** Ao sair da conta: nada da leitura de uma pessoa aparece para a próxima. */
  limpar: () => void;
};

export const useImportacoes = create<Estado>((set, get) => {
  const atualizar = (id: string, campos: Partial<Importacao>) =>
    set(s => ({ itens: s.itens.map(i => (i.id === id ? { ...i, ...campos } : i)) }));
  const atualizarOffline = (id: string, campos: Partial<Importacao>) => {
    atualizar(id, campos);
    const item = get().itens.find(i => i.id === id);
    if (item) offline.set(id, item);
  };

  const fila: Array<() => Promise<void>> = [];
  let ativos = 0;
  const proximo = () => {
    while (ativos < SIMULTANEOS && fila.length) {
      const tarefa = fila.shift()!;
      ativos++;
      tarefa().finally(() => { ativos--; proximo(); });
    }
  };

  const enviarUm = async (idLocal: string, file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result).split(',')[1] ?? '');
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsDataURL(file);
    }).catch(() => null);
    if (base64 === null) {
      atualizar(idLocal, { status: 'erro', erro: 'Não consegui abrir o arquivo.' });
      return;
    }

    const { data: sessao } = await supabase.auth.getSession();
    const token = sessao.session?.access_token;
    if (!token) {
      atualizar(idLocal, { status: 'erro', erro: 'Sessão expirada. Entre de novo.' });
      return;
    }

    // XMLHttpRequest, não fetch: só ele informa o progresso do envio.
    await new Promise<void>(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-statement`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 120_000;
      xhr.upload.onprogress = e => { if (e.lengthComputable) atualizar(idLocal, { enviado: e.loaded / e.total }); };
      xhr.onload = () => {
        let dados: { id?: string; error?: string } = {};
        try { dados = JSON.parse(xhr.responseText); } catch { /* resposta sem JSON */ }
        if (xhr.status === 202 && dados.id) {
          const idServidor = dados.id;
          arquivos.set(idServidor, file);
          arquivos.delete(idLocal);
          // O realtime pode ter trazido a linha antes desta resposta.
          set(s => ({
            itens: s.itens.some(i => i.id === idServidor)
              ? s.itens.filter(i => i.id !== idLocal)
              : s.itens.map(i => (i.id === idLocal ? { ...i, id: idServidor, status: 'lendo', enviado: 1 } : i)),
          }));
        } else {
          atualizar(idLocal, { status: 'erro', erro: dados.error ?? 'Não consegui enviar o arquivo. Tente de novo.' });
        }
        resolve();
      };
      xhr.onerror = () => { atualizar(idLocal, { status: 'erro', erro: 'Sem conexão para enviar o arquivo.' }); resolve(); };
      xhr.ontimeout = () => { atualizar(idLocal, { status: 'erro', erro: 'O envio demorou demais. Verifique a internet.' }); resolve(); };
      xhr.send(JSON.stringify({ fileBase64: base64, mimeType: file.type || 'application/pdf', nome: file.name, segundoPlano: true }));
    });
  };

  return {
    itens: [],
    painel: 'minimizado',
    revisar: false,

    enviar: (files) => {
      const novos: Importacao[] = files.map(file => ({
        id: `local-${novoUUID()}`,
        arquivo: file.name,
        status: file.size > LIMITE_ARQUIVO ? 'erro' : 'enviando',
        enviado: 0,
        encontradas: 0,
        transacoes: [],
        erro: file.size > LIMITE_ARQUIVO ? 'Arquivo acima de 20 MB. Envie uma foto de cada página.' : null,
        criadoEm: Date.now(),
        imagem: file.type.startsWith('image/'),
      }));
      set(s => ({ itens: [...novos, ...s.itens] }));
      novos.forEach((item, i) => {
        if (item.status !== 'enviando') return;
        arquivos.set(item.id, files[i]);
        fila.push(() => enviarUm(item.id, files[i]));
      });
      proximo();
    },

    carregar: async () => {
      const { data, error } = await supabase
        .from('beautyos_importacoes')
        .select('id, arquivo, status, encontradas, transacoes, erro, criado_em')
        .order('criado_em', { ascending: false })
        .limit(30);
      if (error) {
        console.error('Falha ao ler as importações:', error.message);
        return;
      }
      const doServidor = (data as Linha[]).map(daLinha).filter(i => Date.now() - i.criadoEm < VALIDADE_MS);
      set(s => ({
        itens: [
          // Ainda subindo: só existe aqui até a função responder.
          ...s.itens.filter(i => i.id.startsWith('local-')),
          ...doServidor.map(i => offline.get(i.id) ?? i),
        ],
      }));
      const vencidas = (data as Linha[]).filter(l => Date.now() - new Date(l.criado_em).getTime() >= VALIDADE_MS).map(l => l.id);
      if (vencidas.length) supabase.from('beautyos_importacoes').delete().in('id', vencidas).then(() => {});
    },

    descartar: async (ids) => {
      ids.forEach(id => { arquivos.delete(id); offline.delete(id); });
      set(s => ({ itens: s.itens.filter(i => !ids.includes(i.id)) }));
      const doServidor = ids.filter(id => !id.startsWith('local-'));
      if (doServidor.length) {
        const { error } = await supabase.from('beautyos_importacoes').delete().in('id', doServidor);
        if (error) console.error('Falha ao apagar importações:', error.message);
      }
    },

    // Foto que a IA não leu (sem cota, fora do ar): lê no aparelho, sem IA.
    lerOffline: async (id) => {
      const file = arquivos.get(id);
      if (!file) return;
      atualizarOffline(id, { status: 'lendo', erro: null, enviado: 0, encontradas: 0, offline: true });
      try {
        const transacoes = await readStatementWithOCR(file, pct => atualizarOffline(id, { enviado: pct }));
        atualizarOffline(id, transacoes.length
          ? { status: 'pronto', transacoes, encontradas: transacoes.length, enviado: 1 }
          : { status: 'erro', erro: 'Nenhuma transação encontrada. Tente uma foto mais nítida.' });
      } catch (erro) {
        atualizarOffline(id, { status: 'erro', erro: (erro as Error).message || 'Não consegui ler a foto.' });
      }
    },

    setPainel: (painel) => set({ painel }),
    setRevisar: (revisar) => set({ revisar }),
    limpar: () => {
      arquivos.clear();
      offline.clear();
      fila.length = 0;
      set({ itens: [], revisar: false, painel: 'minimizado' });
    },
  };
});
