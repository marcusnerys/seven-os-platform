import * as React from 'react';
import { CalendarCheck, Loader2, RefreshCw, Unplug } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

type Status = { configurado: boolean; conectado: boolean; email: string | null; erro: string | null };

/** Chama a função google-agenda com o token de quem está logado. */
async function chamar(rota: 'status' | 'iniciar' | 'sincronizar' | 'desconectar') {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Entre no app de novo.');
  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-agenda/${rota}`, {
    method: 'POST',
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(corpo.error ?? 'Não consegui falar com o Google agora.');
  return corpo;
}

/**
 * Conexão direta com o Google Agenda (v3). Depois de conectar, cada
 * agendamento criado, remarcado ou cancelado vai na hora para a agenda
 * "Leshanot" da conta Google — inclusive os da página pública de
 * agendamento. O link de assinatura continua como alternativa.
 */
export function GoogleAgenda() {
  const setToast = useStore(state => state.setToast);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [ocupado, setOcupado] = React.useState<null | 'conectar' | 'sincronizar' | 'desconectar'>(null);

  const atualizar = React.useCallback(() => {
    chamar('status').then(setStatus).catch(() => setStatus({ configurado: false, conectado: false, email: null, erro: null }));
  }, []);
  React.useEffect(atualizar, [atualizar]);

  const conectar = async () => {
    setOcupado('conectar');
    try {
      const { url } = await chamar('iniciar');
      window.location.href = url;
    } catch (erro) {
      setToast({ message: (erro as Error).message, type: 'error' });
      setOcupado(null);
    }
  };

  const sincronizar = async () => {
    setOcupado('sincronizar');
    try {
      const { enviados } = await chamar('sincronizar');
      setToast({ message: `${enviados} agendamento${enviados === 1 ? '' : 's'} enviado${enviados === 1 ? '' : 's'} ao Google Agenda.`, type: 'success' });
      atualizar();
    } catch (erro) {
      setToast({ message: (erro as Error).message, type: 'error' });
    } finally {
      setOcupado(null);
    }
  };

  const desconectar = async () => {
    if (!window.confirm('Desconectar o Google Agenda? A agenda "Leshanot" fica no Google, mas para de receber os agendamentos.')) return;
    setOcupado('desconectar');
    try {
      await chamar('desconectar');
      setToast({ message: 'Google Agenda desconectado.', type: 'success' });
      atualizar();
    } catch (erro) {
      setToast({ message: (erro as Error).message, type: 'error' });
    } finally {
      setOcupado(null);
    }
  };

  if (!status) {
    return <p className="flex items-center gap-2 text-[14px] text-ios-text-secondary"><Loader2 size={16} className="animate-spin" /> Verificando o Google Agenda...</p>;
  }

  if (!status.configurado) {
    return (
      <p className="text-[13px] leading-relaxed text-ios-text-secondary">
        A conexão direta com o Google Agenda ainda não foi ativada neste app. Enquanto isso, use o link de assinatura abaixo.
      </p>
    );
  }

  if (!status.conectado) {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={conectar}
          disabled={ocupado !== null}
          className="h-14 rounded-2xl bg-ios-gold text-[#111214] text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {ocupado === 'conectar' ? <Loader2 size={20} className="animate-spin" /> : <CalendarCheck size={20} />}
          Conectar Google Agenda
        </button>
        <p className="text-[13px] leading-relaxed text-ios-text-secondary">
          Cria a agenda "Leshanot" na sua conta Google e manda cada agendamento na hora. O app só mexe nessa agenda, nunca nos seus outros compromissos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-ios-bg border border-ios-border">
        <span className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0"><CalendarCheck size={18} /></span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ios-text-primary">Google Agenda conectado</p>
          <p className="text-[12px] text-ios-text-secondary truncate">{status.email ?? 'Conta Google'} · agenda "Leshanot"</p>
        </div>
      </div>
      {status.erro && (
        <p className="text-[12px] text-red-500">Último envio falhou: {status.erro}. Toque em "Enviar agora" para tentar de novo.</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={sincronizar}
          disabled={ocupado !== null}
          className="flex-1 h-11 rounded-2xl border border-ios-border text-ios-text-primary text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {ocupado === 'sincronizar' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Enviar agora
        </button>
        <button
          onClick={desconectar}
          disabled={ocupado !== null}
          className="h-11 px-4 rounded-2xl border border-ios-border text-ios-text-secondary text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Unplug size={15} /> Desconectar
        </button>
      </div>
    </div>
  );
}

/** Mensagem da volta do Google (?google=...), mostrada uma vez ao abrir o app. */
export function avisoDaVoltaDoGoogle(): { message: string; type: 'success' | 'error' } | null {
  const resultado = new URLSearchParams(window.location.search).get('google');
  if (!resultado) return null;
  const limpa = new URL(window.location.href);
  limpa.searchParams.delete('google');
  window.history.replaceState(null, '', limpa.toString());
  if (resultado === 'conectado') return { message: 'Google Agenda conectado. Seus agendamentos estão sendo enviados.', type: 'success' };
  if (resultado === 'cancelado') return { message: 'Conexão com o Google cancelada.', type: 'error' };
  if (resultado === 'expirado') return { message: 'A conexão demorou demais. Toque em Conectar de novo.', type: 'error' };
  return { message: 'Não consegui conectar o Google Agenda. Tente de novo.', type: 'error' };
}
