import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X, Loader2, ArrowUp, AlertCircle, Check, MessageCircle, ChevronDown, Sparkles } from 'lucide-react';
import { cn, dataLocal } from '../lib/utils';
import { useStore, type Client, type Appointment } from '../lib/store';
import { getVertical } from '../lib/vertical';
import { resolveMessage, openWhatsApp } from '../lib/whatsapp';
import { enviarPerguntaAssistente, type CampanhaRascunho, type MensagemAssistente } from '../services/assistantService';
import { chaveTelefone } from '../../api/_lib/assistant-tools';

type Mensagem = MensagemAssistente & { campanha?: CampanhaRascunho };

const MAX_PERGUNTA = 1000;

export function AssistantChat() {
  const aberto = useStore(state => state.isAssistantOpen);
  const setAberto = useStore(state => state.setIsAssistantOpen);
  // A conversa vive dentro da folha: fechar desmonta e zera tudo.
  return (
    <AnimatePresence>
      {aberto && <Folha fechar={() => setAberto(false)} />}
    </AnimatePresence>
  );
}

// Com o teclado aberto o celular só encolhe a área visível: sem isto o campo ficaria atrás dele.
function useAreaVisivel() {
  const [area, setArea] = useState({ baixo: 0, altura: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const medir = () => setArea({
      baixo: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      altura: vv.height,
    });
    medir();
    vv.addEventListener('resize', medir);
    vv.addEventListener('scroll', medir);
    return () => {
      vv.removeEventListener('resize', medir);
      vv.removeEventListener('scroll', medir);
    };
  }, []);
  return area;
}

function Folha({ fechar }: { fechar: () => void }) {
  const vertical = getVertical(useStore(state => state.settings.businessType));
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const area = useAreaVisivel();
  const arrasto = useDragControls();
  const cancelamento = useRef<AbortController | null>(null);

  const sugestoes = vertical.hasScheduling
    ? ['Quanto faturei este mês?', 'Quem não volta há 60 dias?', 'Monta uma campanha pra quem tem horário amanhã']
    : ['Quanto gastei este mês?', 'Onde mais gastei este mês?', 'Como este mês se compara ao anterior?'];

  useEffect(() => { campoRef.current?.focus(); }, []);

  // Fechar a folha descarta a conversa: não faz sentido esperar a resposta.
  useEffect(() => {
    const controle = new AbortController();
    cancelamento.current = controle;
    return () => controle.abort();
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [fechar]);

  useEffect(() => {
    const lista = listaRef.current;
    lista?.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' });
  }, [mensagens, pensando, erro]);

  const pedir = async (historico: Mensagem[]) => {
    const sinal = cancelamento.current?.signal;
    setPensando(true);
    setErro(null);
    try {
      const { reply, campanha } = await enviarPerguntaAssistente(historico, sinal);
      setMensagens([...historico, { role: 'assistant', text: reply, campanha }]);
    } catch (e) {
      if (sinal?.aborted) return;
      setErro(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setPensando(false);
    }
  };

  const enviar = (bruto: string) => {
    const pergunta = bruto.trim().slice(0, MAX_PERGUNTA);
    if (!pergunta || pensando) return;
    const historico: Mensagem[] = [...mensagens, { role: 'user', text: pergunta }];
    setTexto('');
    setMensagens(historico);
    pedir(historico);
  };

  const aoTeclarNoCampo = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    enviar(texto);
  };

  return (
    <motion.div className="fixed inset-0 z-[110]">
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={fechar}
        className="absolute inset-0 bg-black/40"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Assistente"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 340 }}
        drag="y"
        dragControls={arrasto}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) fechar(); }}
        style={{
          bottom: area.baixo,
          height: area.altura ? Math.max(0, Math.min(area.altura - 24, area.altura * 0.85)) : undefined,
        }}
        className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl h-[85dvh] flex flex-col rounded-t-[28px] bg-ios-surface border-t border-ios-border shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
      >
        <div
          aria-hidden
          onPointerDown={e => arrasto.start(e)}
          className="shrink-0 h-6 flex items-center justify-center touch-none cursor-grab"
        >
          <div className="h-1 w-10 rounded-full bg-ios-text-secondary/30" />
        </div>

        <div className="shrink-0 flex items-center gap-3 px-5 pb-3">
          <span className="w-10 h-10 rounded-full bg-ios-gold/15 text-ios-gold flex items-center justify-center">
            <Sparkles size={20} />
          </span>
          <h2 className="flex-1 text-[17px] font-semibold text-ios-text-primary">Assistente</h2>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar assistente"
            className="shrink-0 w-11 h-11 -mr-1 rounded-full bg-ios-text-secondary/10 text-ios-text-secondary hover:text-ios-text-primary flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div
          ref={listaRef}
          aria-live="polite"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-4 flex flex-col gap-3"
        >
          {mensagens.length === 0 && !pensando && (
            <div className="flex flex-col gap-3 pt-1">
              <p className="text-[15px] text-ios-text-secondary leading-snug">
                {vertical.hasScheduling
                  ? `Pergunte sobre faturamento, ${vertical.clientNounPlural.toLowerCase()} e agenda.`
                  : 'Pergunte sobre seus gastos e receitas.'}
              </p>
              <div className="flex flex-wrap gap-2" aria-label="Sugestões de pergunta">
                {sugestoes.map(sugestao => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => enviar(sugestao)}
                    className="px-3.5 py-2 rounded-full bg-ios-bg border border-ios-border text-[13px] text-ios-text-secondary active:text-ios-text-primary text-left transition-colors"
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensagens.map((m, i) => (
            <React.Fragment key={i}>
              <p className={cn(
                'max-w-[88%] px-4 py-2.5 rounded-2xl text-[15px] leading-snug whitespace-pre-wrap break-words',
                m.role === 'user'
                  ? 'self-end rounded-br-md bg-ios-gold text-[#111214]'
                  : 'self-start rounded-bl-md bg-ios-bg border border-ios-border text-ios-text-primary'
              )}>
                {m.text}
              </p>
              {m.campanha && <CartaoCampanha campanha={m.campanha} />}
            </React.Fragment>
          ))}

          {pensando && (
            <div className="self-start flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-md bg-ios-bg border border-ios-border text-[14px] text-ios-text-secondary">
              <Loader2 size={16} className="animate-spin" />
              Pensando…
            </div>
          )}

          {erro && !pensando && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl border border-red-500/40 bg-red-500/10">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
              <p className="flex-1 text-[14px] text-ios-text-primary leading-snug">{erro}</p>
              <button
                type="button"
                onClick={() => pedir(mensagens)}
                className="shrink-0 text-[13px] font-bold text-ios-gold"
              >
                Tentar de novo
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={e => { e.preventDefault(); enviar(texto); }}
          className="shrink-0 flex items-end gap-2 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] border-t border-ios-border"
        >
          <textarea
            ref={campoRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={aoTeclarNoCampo}
            maxLength={MAX_PERGUNTA}
            rows={1}
            enterKeyHint="send"
            placeholder="Pergunte algo…"
            aria-label="Pergunta para o assistente"
            className="flex-1 min-w-0 min-h-12 max-h-32 field-sizing-content resize-none px-4 py-3 rounded-2xl bg-ios-bg border border-ios-border text-ios-text-primary text-[16px] leading-snug placeholder:text-ios-text-secondary focus:outline-none focus:border-ios-gold/60"
          />
          <button
            type="submit"
            disabled={!texto.trim() || pensando}
            aria-label="Enviar pergunta"
            className="shrink-0 w-12 h-12 rounded-2xl bg-ios-gold text-[#111214] flex items-center justify-center disabled:opacity-35 transition-opacity"
          >
            <ArrowUp size={22} strokeWidth={2.4} />
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

const ROTULO_SEGMENTO: Record<string, string> = {
  inativas: 'Sem visita recente',
  hoje: 'Com horário hoje',
  amanha: 'Com horário amanhã',
  todas: 'Todos com telefone',
};

function camposDaMensagem(cliente: Client, campanha: CampanhaRascunho, agendamentos: Appointment[], empresa: string) {
  const campos = { nome: cliente.name.trim().split(/\s+/)[0], empresa };
  if (campanha.segmento !== 'hoje' && campanha.segmento !== 'amanha') return campos;
  const dia = new Date();
  if (campanha.segmento === 'amanha') dia.setDate(dia.getDate() + 1);
  const data = dataLocal(dia);
  const telefone = chaveTelefone(cliente.phone);
  const ehDela = (a: Appointment) => a.clientId === cliente.id
    || (a.clientId === 'public-booking' && !!telefone && chaveTelefone(a.clientPhone) === telefone);
  const horario = agendamentos.find(a => ehDela(a) && a.date === data && a.status !== 'Cancelado');
  return {
    ...campos,
    data: campanha.segmento === 'hoje' ? 'hoje' : 'amanhã',
    servico: horario?.service,
    hora: horario?.time,
  };
}

function CartaoCampanha({ campanha }: { campanha: CampanhaRascunho }) {
  const clientes = useStore(state => state.clients);
  const agendamentos = useStore(state => state.appointments);
  const empresa = useStore(state => state.settings.studioName) || 'Meu Negócio';
  const [revisando, setRevisando] = useState(false);
  const [enviados, setEnviados] = useState<Record<string, 'ok' | 'invalido'>>({});
  const [texto, setTexto] = useState(campanha.mensagem);

  const porId = new Map(clientes.map(c => [c.id, c]));
  const destinatarios = [...new Set(campanha.clientIds)]
    .map(id => porId.get(id))
    .filter((c): c is Client => !!c?.phone?.trim());
  const foraDaLista = Math.max(0, campanha.total - destinatarios.length);
  const rotulo = campanha.segmento === 'inativas' && campanha.dias
    ? `Sem visita há ${campanha.dias} dias`
    : ROTULO_SEGMENTO[campanha.segmento];

  const enviar = (cliente: Client) => {
    if (!texto.trim()) return;
    const mensagem = resolveMessage(texto.trim(), camposDaMensagem(cliente, campanha, agendamentos, empresa));
    const abriu = openWhatsApp(cliente.phone, mensagem);
    setEnviados(prev => ({ ...prev, [cliente.id]: abriu ? 'ok' : 'invalido' }));
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-ios-bg border border-ios-gold/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ios-gold">Rascunho de campanha</span>
        {rotulo && <span className="text-[12px] text-ios-text-secondary text-right">{rotulo}</span>}
      </div>
      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        maxLength={500}
        aria-label="Texto da campanha"
        className="w-full min-h-20 field-sizing-content resize-none px-3 py-2.5 rounded-xl bg-ios-surface border border-ios-border text-[15px] text-ios-text-primary leading-snug focus:outline-none focus:border-ios-gold/60"
      />
      <p className="text-[13px] font-semibold text-ios-text-primary">
        {campanha.total} {campanha.total === 1 ? 'destinatário' : 'destinatários'}
      </p>
      <p className="text-[12px] text-ios-text-secondary leading-snug">
        Revise e ajuste o texto. Nada é enviado automaticamente: cada mensagem abre no seu WhatsApp.
      </p>

      {destinatarios.length > 0 && (
        <button
          type="button"
          onClick={() => setRevisando(v => !v)}
          aria-expanded={revisando}
          className="self-start flex items-center gap-1.5 text-[14px] font-bold text-ios-gold"
        >
          Revisar envios
          <ChevronDown size={16} className={cn('transition-transform', revisando && 'rotate-180')} />
        </button>
      )}

      {revisando && (
        <ul className="flex flex-col divide-y divide-ios-border">
          {destinatarios.map(cliente => {
            const estado = enviados[cliente.id];
            return (
              <li key={cliente.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-[14px] text-ios-text-primary">{cliente.name}</span>
                {estado === 'invalido' ? (
                  <span className="shrink-0 text-[12px] font-semibold text-red-500">Telefone inválido</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => enviar(cliente)}
                    disabled={!texto.trim()}
                    aria-label={`${estado === 'ok' ? 'Abrir de novo' : 'Enviar'} para ${cliente.name}`}
                    className={cn(
                      'shrink-0 h-9 px-3.5 rounded-xl flex items-center gap-1.5 text-[13px] font-bold transition-colors disabled:opacity-35',
                      estado === 'ok' ? 'bg-emerald-700 text-white' : 'bg-ios-gold text-[#111214]'
                    )}
                  >
                    {estado === 'ok' ? <Check size={15} /> : <MessageCircle size={15} />}
                    {estado === 'ok' ? 'Enviado' : 'Enviar'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {revisando && foraDaLista > 0 && (
        <p className="text-[12px] text-ios-text-secondary leading-snug">
          {foraDaLista} {foraDaLista === 1 ? 'contato não aparece' : 'contatos não aparecem'} aqui: sem telefone ou fora do cadastro carregado.
        </p>
      )}
    </div>
  );
}
