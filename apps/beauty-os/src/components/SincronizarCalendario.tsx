import * as React from 'react';
import { CalendarPlus, Copy } from 'lucide-react';
import { useStore } from '../lib/store';
import { EH_IOS } from '../lib/utils';

/**
 * Liga a agenda ao calendário do celular por assinatura: o calendário busca
 * /api/agenda sozinho, e agendamento novo, remarcado ou cancelado aparece lá
 * sem ninguém exportar nada de novo.
 *
 * iPhone: o link webcal:// abre o "Assinar calendário" do sistema.
 * Android: não há assinatura no app do Google Agenda; ela é feita pelo site,
 * que aceita o link direto em "?cid=".
 */
export function SincronizarCalendario() {
  const token = useStore(state => state.settings.agendaToken);
  const trocarLinkDaAgenda = useStore(state => state.trocarLinkDaAgenda);
  const setToast = useStore(state => state.setToast);
  const [trocando, setTrocando] = React.useState(false);

  if (!token) {
    return <p className="text-[14px] text-ios-text-secondary">Carregando o link da agenda...</p>;
  }

  const https = `${window.location.origin}/api/agenda?t=${token}`;
  const webcal = https.replace(/^https?:/, 'webcal:');

  const adicionar = () => {
    if (EH_IOS) {
      window.location.href = webcal;
    } else {
      window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`, '_blank', 'noopener');
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(https);
      setToast({ message: 'Link da agenda copiado.', type: 'success' });
    } catch {
      setToast({ message: 'Não consegui copiar. Toque e segure no link para copiar.', type: 'error' });
    }
  };

  const trocar = async () => {
    if (!window.confirm('Os calendários ligados com o link atual param de receber a agenda. Trocar o link?')) return;
    setTrocando(true);
    try {
      await trocarLinkDaAgenda();
      setToast({ message: 'Link trocado. Adicione a agenda de novo no calendário.', type: 'success' });
    } catch {
      setToast({ message: 'Não consegui trocar o link. Verifique a internet.', type: 'error' });
    } finally {
      setTrocando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={adicionar}
        className="h-14 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold flex items-center justify-center gap-2"
      >
        <CalendarPlus size={20} /> {EH_IOS ? 'Adicionar ao Calendário do iPhone' : 'Adicionar ao Google Agenda'}
      </button>
      <button
        type="button"
        onClick={copiar}
        className="h-12 rounded-2xl border border-ios-border text-ios-text-primary text-[15px] font-semibold flex items-center justify-center gap-2"
      >
        <Copy size={18} /> Copiar link da agenda
      </button>
      <p className="text-[13px] leading-relaxed text-ios-text-secondary">
        Agendamentos novos, remarcados e cancelados aparecem no calendário sozinhos.
        {EH_IOS
          ? ' O iPhone confere a cada hora.'
          : ' O Google Agenda confere algumas vezes por dia. Se o botão não abrir a assinatura, cole o link no Google Agenda pelo computador: Outras agendas → + → Do URL.'}
      </p>
      <button
        type="button"
        onClick={trocar}
        disabled={trocando}
        className="self-start text-[12px] text-ios-text-secondary underline underline-offset-2 py-1 disabled:opacity-50"
      >
        {trocando ? 'Trocando...' : 'Trocar o link (se ele foi parar com quem não devia)'}
      </button>
    </div>
  );
}
