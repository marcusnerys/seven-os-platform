import * as React from 'react';
import { Check, Copy, Share2, Trash2, UserPlus, LogOut, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import {
  AREAS, NOME_DA_AREA, DESCRICAO_DA_AREA, mensagemDaEquipe, normalizarCodigo, formatarCodigo,
  esquecerConvite, type Area,
} from '../lib/permissoes';
import { Modal } from './UI';

type Membro = { user_id: string; papel: 'dono' | 'membro'; areas: Area[]; nome: string | null; email: string | null };
type Convite = { codigo: string; areas: Area[]; nome: string | null; expira_em: string };

const linkDoConvite = (codigo: string) => `${window.location.origin}/?convite=${codigo}`;

function textoDoConvite(negocio: string, codigo: string) {
  return `Você foi convidado(a) para a equipe de ${negocio} no Leshanot. Abra o link, entre com seu e-mail e aceite:\n${linkDoConvite(codigo)}\n\nOu, já dentro do app, use o código ${formatarCodigo(codigo)} em Mais → Equipe.`;
}

async function compartilhar(texto: string, avisar: (m: string, t: 'success' | 'error') => void) {
  try {
    if (navigator.share) {
      await navigator.share({ text: texto });
      return;
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(texto);
    avisar('Convite copiado. Cole no WhatsApp da pessoa.', 'success');
  } catch {
    avisar('Não consegui copiar. Anote o código e passe para a pessoa.', 'error');
  }
}

function EscolherAreas({ areas, aoMudar }: { areas: Area[]; aoMudar: (a: Area[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {AREAS.map(area => {
        const marcada = areas.includes(area);
        return (
          <button
            key={area}
            type="button"
            onClick={() => aoMudar(marcada ? areas.filter(a => a !== area) : [...areas, area])}
            className={cn('flex items-start gap-3 p-3 rounded-2xl border text-left transition-colors',
              marcada ? 'border-ios-gold/60 bg-ios-gold/10' : 'border-ios-border bg-ios-bg')}
            aria-pressed={marcada}
          >
            <span className={cn('mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border',
              marcada ? 'bg-ios-gold border-ios-gold' : 'border-ios-border')}>
              {marcada && <Check size={13} color="#111214" strokeWidth={3} />}
            </span>
            <span className="flex flex-col">
              <span className="text-[14px] font-semibold text-ios-text-primary">{NOME_DA_AREA[area]}</span>
              <span className="text-[12px] text-ios-text-secondary">{DESCRICAO_DA_AREA[area]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Digitar um código de convite e entrar na equipe. */
export function EntrarComCodigo({ codigoInicial = '', aoEntrar }: { codigoInicial?: string; aoEntrar?: () => void }) {
  const setToast = useStore(state => state.setToast);
  const recarregarEquipe = useStore(state => state.recarregarEquipe);
  const setConvitePendente = useStore(state => state.setConvitePendente);
  const [codigo, setCodigo] = React.useState(codigoInicial);
  const [previa, setPrevia] = React.useState<{ empresa: string; areas: Area[] } | null>(null);
  const [ocupado, setOcupado] = React.useState(false);
  const [erro, setErro] = React.useState('');

  const conferir = React.useCallback(async (valor: string) => {
    setErro('');
    setPrevia(null);
    if (normalizarCodigo(valor).length !== 10) return;
    const { data, error } = await supabase.rpc('beautyos_ver_convite', { p_codigo: valor });
    if (error) { setErro(mensagemDaEquipe(error)); return; }
    const linha = Array.isArray(data) ? data[0] : data;
    if (!linha) { setErro(mensagemDaEquipe('convite_invalido')); return; }
    setPrevia({ empresa: linha.empresa, areas: linha.areas });
  }, []);

  React.useEffect(() => { if (codigoInicial) void conferir(codigoInicial); }, [codigoInicial, conferir]);

  const aceitar = async () => {
    setOcupado(true);
    const { error } = await supabase.rpc('beautyos_aceitar_convite', { p_codigo: codigo });
    setOcupado(false);
    if (error) {
      setErro(mensagemDaEquipe(error));
      if (String(error.message).includes('convite_invalido')) { esquecerConvite(); setConvitePendente(null); }
      return;
    }
    esquecerConvite();
    setConvitePendente(null);
    await recarregarEquipe();
    setToast({ message: `Pronto! Você agora faz parte da equipe de ${previa?.empresa ?? 'o negócio'}.`, type: 'success' });
    aoEntrar?.();
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
        Código do convite
        <input
          className="h-12 px-4 rounded-xl bg-ios-bg border border-ios-border text-ios-text-primary text-[18px] tracking-[0.2em] font-mono uppercase focus:outline-none focus:border-ios-gold/50"
          value={codigo}
          onChange={e => { setCodigo(e.target.value); void conferir(e.target.value); }}
          placeholder="ABCDE-12345"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={14}
        />
      </label>
      {previa && (
        <p className="text-[14px] text-ios-text-primary p-3 rounded-2xl bg-ios-bg border border-ios-border">
          <b>{previa.empresa}</b> convidou você para: {previa.areas.map(a => NOME_DA_AREA[a]).join(', ')}.
          <span className="block mt-1 text-[12px] text-ios-text-secondary">O que você configurou na sua conta (nome, PIX, mensagens) é trocado pelo negócio de quem convidou.</span>
        </p>
      )}
      {erro && <p className="text-[13px] text-red-400">{erro}</p>}
      <button
        onClick={aceitar}
        disabled={!previa || ocupado}
        className="h-12 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold disabled:opacity-40"
      >
        {ocupado ? 'Entrando...' : 'Entrar na equipe'}
      </button>
    </div>
  );
}

/**
 * Quem abriu um link de convite vê o convite logo depois de entrar, antes do
 * questionário de dono (o App esconde o questionário enquanto há convite).
 */
export function AceitarConviteDoLink() {
  const empresaId = useStore(state => state.empresaId);
  const papel = useStore(state => state.papel);
  const codigo = useStore(state => state.convitePendente);
  const setConvitePendente = useStore(state => state.setConvitePendente);
  if (!codigo || !empresaId) return null;
  const fechar = () => { esquecerConvite(); setConvitePendente(null); };
  if (papel === 'membro') { fechar(); return null; }
  return (
    <Modal isOpen onClose={fechar} title="Convite para a equipe">
      <EntrarComCodigo codigoInicial={codigo} />
    </Modal>
  );
}

/** Mais → Equipe: o dono convida e escolhe as áreas de cada pessoa; quem é membro vê a equipe e pode sair. */
export function EquipeAcesso() {
  const papel = useStore(state => state.papel);
  const areas = useStore(state => state.areas);
  const empresaId = useStore(state => state.empresaId);
  const user = useStore(state => state.user);
  const settings = useStore(state => state.settings);
  const setToast = useStore(state => state.setToast);
  const recarregarEquipe = useStore(state => state.recarregarEquipe);

  const [membros, setMembros] = React.useState<Membro[]>([]);
  const [convites, setConvites] = React.useState<Convite[]>([]);
  const [novo, setNovo] = React.useState<{ nome: string; areas: Area[] } | null>(null);
  const [criado, setCriado] = React.useState<string | null>(null);
  const [editando, setEditando] = React.useState<Membro | null>(null);
  const [entrando, setEntrando] = React.useState(false);
  const [ocupado, setOcupado] = React.useState(false);
  const ehDono = papel === 'dono';
  const avisar = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const carregar = React.useCallback(async () => {
    if (!empresaId) return;
    const { data } = await supabase.from('beautyos_membros').select('user_id, papel, areas, nome, email')
      .eq('empresa_id', empresaId).order('criado_em');
    setMembros((data ?? []) as Membro[]);
    if (ehDono) {
      const { data: abertos } = await supabase.from('beautyos_convites').select('codigo, areas, nome, expira_em')
        .eq('empresa_id', empresaId).is('usado_em', null).gt('expira_em', new Date().toISOString()).order('criado_em');
      setConvites((abertos ?? []) as Convite[]);
    }
  }, [empresaId, ehDono]);

  React.useEffect(() => { void carregar(); }, [carregar]);

  const chamar = async (fn: string, args: Record<string, unknown>, sucesso: string) => {
    setOcupado(true);
    const { data, error } = await supabase.rpc(fn, args);
    setOcupado(false);
    if (error) { avisar(mensagemDaEquipe(error), 'error'); return undefined; }
    if (sucesso) avisar(sucesso, 'success');
    await carregar();
    return data ?? true;
  };

  const criarConvite = async () => {
    if (!novo || novo.areas.length === 0) { avisar(mensagemDaEquipe('areas_invalidas'), 'error'); return; }
    const codigo = await chamar('beautyos_criar_convite', { p_areas: novo.areas, p_nome: novo.nome.trim() || null }, '');
    if (typeof codigo === 'string') { setNovo(null); setCriado(codigo); }
  };

  const sair = async () => {
    if (!window.confirm(`Sair da equipe de ${settings.studioName}? Você perde o acesso aos dados do negócio.`)) return;
    const ok = await chamar('beautyos_sair_da_equipe', {}, 'Você saiu da equipe.');
    if (ok) await recarregarEquipe();
  };

  const remover = async (m: Membro) => {
    if (!window.confirm(`Remover ${m.nome || m.email || 'esta pessoa'} da equipe? Ela perde o acesso na hora. O link da agenda para calendários também muda: quem assinou precisa assinar de novo.`)) return;
    await chamar('beautyos_remover_membro', { p_user: m.user_id }, 'Pessoa removida da equipe.');
  };

  const salvarAreas = async () => {
    if (!editando) return;
    if (editando.areas.length === 0) { avisar(mensagemDaEquipe('areas_invalidas'), 'error'); return; }
    const ok = await chamar('beautyos_atualizar_membro', { p_user: editando.user_id, p_areas: editando.areas, p_nome: editando.nome }, 'Acesso atualizado.');
    if (ok) setEditando(null);
  };

  const rotuloAreas = (m: { papel?: string; areas: Area[] }) =>
    m.papel === 'dono' ? 'Dono · acesso a tudo' : m.areas.map(a => NOME_DA_AREA[a]).join(', ') || 'Sem acesso';

  return (
    <div className="flex flex-col gap-5">
      {!ehDono && (
        <p className="text-[14px] text-ios-text-primary p-4 rounded-2xl bg-ios-bg border border-ios-border">
          Você faz parte da equipe de <b>{settings.studioName}</b> com acesso a: {areas.map(a => NOME_DA_AREA[a]).join(', ') || 'nenhuma área'}.
          Para mudar, fale com quem é dono do negócio.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-ios-text-secondary px-1">Pessoas com acesso</h3>
        {membros.map(m => (
          <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-ios-bg border border-ios-border">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-ios-text-primary truncate">
                {m.nome || m.email || 'Pessoa da equipe'}{m.user_id === user?.id ? ' (você)' : ''}
              </p>
              <p className="text-[12px] text-ios-text-secondary truncate">{rotuloAreas(m)}</p>
            </div>
            {ehDono && m.papel === 'membro' && (
              <>
                <button onClick={() => setEditando({ ...m })} className="px-3 h-9 rounded-xl border border-ios-border text-[13px] text-ios-text-primary">Áreas</button>
                <button onClick={() => remover(m)} aria-label="Remover da equipe" className="w-9 h-9 rounded-xl border border-red-400/30 text-red-400 flex items-center justify-center"><Trash2 size={15} /></button>
              </>
            )}
          </div>
        ))}
      </section>

      {ehDono && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ios-text-secondary px-1">Convites em aberto</h3>
          {convites.length === 0 && <p className="text-[13px] text-ios-text-secondary px-1">Nenhum. Os convites valem por 7 dias e uma pessoa só.</p>}
          {convites.map(c => (
            <div key={c.codigo} className="flex items-center gap-3 p-3 rounded-2xl bg-ios-bg border border-ios-border">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-mono font-semibold text-ios-text-primary">{formatarCodigo(c.codigo)}{c.nome ? ` · ${c.nome}` : ''}</p>
                <p className="text-[12px] text-ios-text-secondary truncate">{c.areas.map(a => NOME_DA_AREA[a]).join(', ')} · até {new Date(c.expira_em).toLocaleDateString('pt-BR')}</p>
              </div>
              <button onClick={() => compartilhar(textoDoConvite(settings.studioName, c.codigo), avisar)} aria-label="Enviar convite" className="w-9 h-9 rounded-xl border border-ios-border text-ios-text-primary flex items-center justify-center"><Share2 size={15} /></button>
              <button onClick={() => chamar('beautyos_cancelar_convite', { p_codigo: c.codigo }, 'Convite cancelado.')} aria-label="Cancelar convite" className="w-9 h-9 rounded-xl border border-red-400/30 text-red-400 flex items-center justify-center"><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={() => setNovo({ nome: '', areas: [] })} className="h-12 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold flex items-center justify-center gap-2">
            <UserPlus size={18} /> Convidar pessoa
          </button>
        </section>
      )}

      <section className="flex flex-col gap-2">
        {ehDono ? (
          <button onClick={() => setEntrando(true)} className="h-11 rounded-2xl border border-ios-border text-ios-text-secondary text-[13px] flex items-center justify-center gap-2">
            <KeyRound size={15} /> Recebi um código de outra equipe
          </button>
        ) : (
          <button onClick={sair} disabled={ocupado} className="h-12 rounded-2xl border border-red-400/30 text-red-400 text-[14px] font-semibold flex items-center justify-center gap-2">
            <LogOut size={16} /> Sair da equipe
          </button>
        )}
      </section>

      {novo && (
        <Modal isOpen onClose={() => setNovo(null)} title="Convidar pessoa">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
              Nome (opcional, só para você reconhecer)
              <input className="h-12 px-4 rounded-xl bg-ios-bg border border-ios-border text-ios-text-primary text-[16px] focus:outline-none focus:border-ios-gold/50"
                value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} placeholder="Ex.: Ana, recepção" />
            </label>
            <p className="text-[13px] text-ios-text-secondary">O que essa pessoa pode ver e fazer:</p>
            <EscolherAreas areas={novo.areas} aoMudar={a => setNovo({ ...novo, areas: a })} />
            <p className="text-[12px] text-ios-text-secondary">Configurações, PIX, mensagens automáticas e a equipe ficam só com você.</p>
            <button onClick={criarConvite} disabled={ocupado || novo.areas.length === 0} className="h-12 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold disabled:opacity-40">
              {ocupado ? 'Criando...' : 'Criar convite'}
            </button>
          </div>
        </Modal>
      )}

      {criado && (
        <Modal isOpen onClose={() => setCriado(null)} title="Convite criado">
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-ios-text-secondary">Mande o link para a pessoa. Ela entra com o próprio e-mail e aceita. Vale por 7 dias e para uma pessoa só.</p>
            <p className="text-center text-[28px] font-mono font-bold tracking-[0.15em] text-ios-text-primary">{formatarCodigo(criado)}</p>
            <div className="flex gap-2">
              <button onClick={async () => {
                try { await navigator.clipboard.writeText(linkDoConvite(criado)); avisar('Link copiado.', 'success'); }
                catch { avisar('Não consegui copiar. Passe o código.', 'error'); }
              }} className="flex-1 h-12 rounded-2xl border border-ios-border text-ios-text-primary text-[14px] font-semibold flex items-center justify-center gap-1.5">
                <Copy size={16} /> Copiar link
              </button>
              <button onClick={() => compartilhar(textoDoConvite(settings.studioName, criado), avisar)} className="flex-1 h-12 rounded-2xl bg-ios-gold text-[#111214] text-[14px] font-bold flex items-center justify-center gap-1.5">
                <Share2 size={16} /> Enviar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editando && (
        <Modal isOpen onClose={() => setEditando(null)} title={`Acesso de ${editando.nome || editando.email || 'pessoa'}`}>
          <div className="flex flex-col gap-4">
            <EscolherAreas areas={editando.areas} aoMudar={a => setEditando({ ...editando, areas: a })} />
            <button onClick={salvarAreas} disabled={ocupado} className="h-12 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold disabled:opacity-40">Salvar</button>
          </div>
        </Modal>
      )}

      {entrando && (
        <Modal isOpen onClose={() => setEntrando(false)} title="Entrar em outra equipe">
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-ios-text-secondary">Só dá para entrar com uma conta sem clientes, agenda nem lançamentos. Se a sua já tem dados, use outro e-mail para a outra equipe.</p>
            <EntrarComCodigo aoEntrar={() => setEntrando(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
