import * as React from 'react';
import { Contact, FileUp, Check } from 'lucide-react';
import { useStore } from '../lib/store';
import { cn, EH_IOS, semAcento } from '../lib/utils';
import {
  contatosNovos,
  escolherContatosDoCelular,
  lerVCard,
  suportaSeletorDeContatos,
  type NovoCliente,
} from '../lib/contatos';

// Exportação do iPhone com fotos passa de dezenas de MB; acima disso é
// quase certo que não é um arquivo de contatos.
const TAMANHO_MAXIMO_VCF = 60 * 1024 * 1024;

/**
 * Traz contatos do celular para a lista de clientes. No Android abre a
 * agenda do sistema; em qualquer aparelho lê o arquivo .vcf que o app
 * Contatos exporta — o único caminho no iPhone.
 */
export function ImportarContatos({ aoConcluir, aoRevisar }: {
  aoConcluir?: (quantidade: number) => void;
  /** Avisa quando a lista de revisão abre e fecha (o onboarding segura o "Começar"). */
  aoRevisar?: (aberta: boolean) => void;
}) {
  const clientes = useStore(state => state.clients);
  const addClients = useStore(state => state.addClients);
  const setToast = useStore(state => state.setToast);
  const arquivoRef = React.useRef<HTMLInputElement>(null);
  const [revisao, setRevisao] = React.useState<NovoCliente[] | null>(null);
  // Marcação pelo próprio contato, não pela posição: depois de uma falha no
  // meio, quem já entrou sai da lista e as posições mudam.
  const [marcados, setMarcados] = React.useState<Set<NovoCliente>>(new Set());
  const [busca, setBusca] = React.useState('');
  const [ocupado, setOcupado] = React.useState(false);
  const seletor = suportaSeletorDeContatos();

  React.useEffect(() => { aoRevisar?.(revisao !== null); }, [revisao !== null]);

  const importar = async (lista: NovoCliente[]) => {
    if (lista.length === 0) {
      setToast({ message: 'Nenhum contato novo: todos já estão na lista.', type: 'success' });
      return;
    }
    setOcupado(true);
    try {
      const quantos = await addClients(lista);
      setToast({ message: `${quantos} contato${quantos === 1 ? '' : 's'} importado${quantos === 1 ? '' : 's'}.`, type: 'success' });
      setRevisao(null);
      aoConcluir?.(quantos);
    } catch (erro) {
      // Os primeiros lotes podem ter entrado. Eles saem da lista, para o
      // "Importar" de novo mandar só o que faltou.
      const inseridos = (erro as { inseridos?: number })?.inseridos ?? 0;
      if (inseridos > 0) {
        const enviados = new Set(lista.slice(0, inseridos));
        setRevisao(atual => atual && atual.filter(c => !enviados.has(c)));
        setMarcados(atual => new Set([...atual].filter(c => !enviados.has(c))));
      }
      setToast({
        message: inseridos > 0
          ? `${inseridos} importados; o restante não entrou. Verifique a internet e toque em Importar de novo.`
          : 'Não consegui importar. Verifique a internet e tente de novo.',
        type: 'error',
      });
    } finally {
      setOcupado(false);
    }
  };

  // No seletor do Android a pessoa já escolheu quem trazer: importa direto.
  const escolherNaAgenda = async () => {
    if (ocupado) return;
    try {
      const escolhidos = await escolherContatosDoCelular();
      if (escolhidos.length) await importar(contatosNovos(escolhidos, clientes));
    } catch (erro) {
      // Fechar o seletor sem escolher chega como erro em alguns aparelhos.
      if ((erro as Error)?.name !== 'InvalidStateError' && (erro as Error)?.name !== 'TypeError') {
        setToast({ message: 'Não consegui abrir a agenda do celular.', type: 'error' });
      }
    }
  };

  // O arquivo traz a agenda inteira, com família e fornecedores: mostra a
  // lista para a pessoa desmarcar quem não é cliente antes de gravar.
  const lerArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_VCF) {
      setToast({ message: 'Arquivo grande demais para um arquivo de contatos.', type: 'error' });
      return;
    }
    let texto: string;
    try {
      const bytes = await arquivo.arrayBuffer();
      // Exportações antigas (Outlook, Android antigo) vêm em Windows-1252: lidas
      // como UTF-8, "João" virava "Jo�o".
      try {
        texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        texto = new TextDecoder('windows-1252').decode(bytes);
      }
    } catch {
      setToast({ message: 'Não consegui ler o arquivo. Tente exportar de novo.', type: 'error' });
      return;
    }
    const lidos = lerVCard(texto);
    if (lidos.length === 0) {
      setToast({ message: 'Nenhum contato encontrado. Escolha o arquivo .vcf exportado pelo app Contatos.', type: 'error' });
      return;
    }
    const novos = contatosNovos(lidos, clientes);
    if (novos.length === 0) {
      setToast({ message: 'Nenhum contato novo: todos já estão na lista.', type: 'success' });
      return;
    }
    setRevisao(novos);
    setMarcados(new Set(novos));
    setBusca('');
  };

  if (revisao) {
    const alvo = semAcento(busca.trim());
    const digitos = busca.replace(/\D/g, '');
    const visiveis = revisao
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !alvo
        || semAcento(c.name).includes(alvo)
        || (digitos.length >= 3 && c.phone.replace(/\D/g, '').includes(digitos)));
    const todosMarcados = visiveis.every(({ c }) => marcados.has(c));
    const alternarTodos = () => setMarcados(atual => {
      const proximo = new Set(atual);
      for (const { c } of visiveis) {
        if (todosMarcados) proximo.delete(c);
        else proximo.add(c);
      }
      return proximo;
    });

    return (
      <div className="flex flex-col gap-3">
        <p className="text-[14px] text-ios-text-secondary">
          {revisao.length} contato{revisao.length === 1 ? '' : 's'} novo{revisao.length === 1 ? '' : 's'} no arquivo. Desmarque quem não é cliente.
        </p>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar no arquivo..."
          aria-label="Buscar contato no arquivo"
          className="h-11 px-4 rounded-xl bg-ios-bg border border-ios-border text-ios-text-primary text-[16px] placeholder:text-ios-text-secondary focus:outline-none focus:border-ios-gold/50"
        />
        <button type="button" onClick={alternarTodos} className="self-start text-[13px] font-semibold text-ios-gold py-1">
          {todosMarcados ? 'Desmarcar' : 'Marcar'} {busca ? 'os encontrados' : 'todos'}
        </button>
        <ul className="max-h-[40vh] overflow-y-auto overscroll-contain rounded-xl border border-ios-border divide-y divide-ios-border">
          {visiveis.map(({ c, i }) => {
            const marcado = marcados.has(c);
            return (
              <li key={i}>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-ios-text-secondary/10">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={marcado}
                    onChange={() => setMarcados(atual => {
                      const proximo = new Set(atual);
                      if (marcado) proximo.delete(c);
                      else proximo.add(c);
                      return proximo;
                    })}
                  />
                  <span aria-hidden className={cn(
                    'w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
                    marcado ? 'bg-ios-gold border-ios-gold text-[#111214]' : 'border-ios-text-secondary/50'
                  )}>
                    {marcado && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] text-ios-text-primary truncate">{c.name}</span>
                    <span className="block text-[12px] text-ios-text-secondary">{c.phone || 'sem telefone'}</span>
                  </span>
                </label>
              </li>
            );
          })}
          {visiveis.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-ios-text-secondary">Ninguém com esse nome no arquivo.</li>}
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRevisao(null)}
            disabled={ocupado}
            className="h-12 px-4 rounded-2xl border border-ios-border text-ios-text-primary text-[15px] font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => importar(revisao.filter(c => marcados.has(c)))}
            disabled={ocupado || marcados.size === 0}
            className="flex-1 h-12 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold disabled:opacity-40"
          >
            {ocupado ? 'Importando...' : `Importar ${marcados.size} contato${marcados.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {seletor && (
        <button
          type="button"
          onClick={escolherNaAgenda}
          disabled={ocupado}
          className="h-14 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Contact size={20} /> Escolher na agenda do celular
        </button>
      )}
      <button
        type="button"
        onClick={() => arquivoRef.current?.click()}
        disabled={ocupado}
        className={cn(
          'h-14 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50',
          seletor ? 'border border-ios-border text-ios-text-primary' : 'bg-ios-gold text-[#111214]'
        )}
      >
        <FileUp size={20} /> Importar arquivo de contatos (.vcf)
      </button>
      <input
        ref={arquivoRef}
        type="file"
        accept=".vcf,text/vcard,text/x-vcard,text/directory"
        className="hidden"
        onChange={e => { lerArquivo(e.target.files?.[0]); e.target.value = ''; }}
      />
      {!seletor && (
        <p className="text-[13px] leading-relaxed text-ios-text-secondary">
          {EH_IOS ? 'No iPhone' : 'No celular'}: abra o app <b>Contatos</b>, toque em <b>Listas</b>, segure <b>Todos os Contatos</b> e escolha <b>Exportar</b>. Salve em Arquivos e escolha o arquivo aqui.
        </p>
      )}
    </div>
  );
}
