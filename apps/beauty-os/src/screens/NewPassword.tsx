import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard, Button, Input } from '../components/UI';
import { Logo } from '../components/Logo';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

const MINIMO_CARACTERES = 8;

/**
 * Tela que aparece quando a pessoa chega pelo link de "esqueci minha senha".
 *
 * O link do Supabase já autentica e devolve a pessoa ao app. Sem esta tela ela
 * caía direto no Dashboard, nunca definia a senha nova, e na próxima vez
 * estava trancada de novo.
 */
export default function NewPassword() {
  const setIsRecoveringPassword = useStore(state => state.setIsRecoveringPassword);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (senha.length < MINIMO_CARACTERES) {
      setErro(`A senha precisa de pelo menos ${MINIMO_CARACTERES} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      setErro(
        error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')
          ? 'Este link expirou. Peça um novo em "Esqueceu a senha?".'
          : 'Não foi possível salvar a senha. Tente novamente.'
      );
      return;
    }

    // Some a tela e a pessoa segue para o app, já com a senha nova valendo.
    setIsRecoveringPassword(false);
  };

  return (
    <div className="h-full w-full bg-ios-bg flex flex-col items-center justify-center p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(230,192,139,0.08)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[340px] flex flex-col items-center gap-10 z-10"
      >
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div className="text-center">
            <h1 className="text-[28px] font-bold text-ios-text-primary tracking-tightest leading-tight">LESHANOT</h1>
            <p className="text-ios-gold font-bold tracking-[4px] text-[10px] uppercase mt-1">Studio OS</p>
          </div>
        </div>

        <GlassCard className="w-full p-6 flex flex-col gap-6 bg-white/[0.03] border-white/10 rounded-[32px]">
          <div className="text-center space-y-2">
            <h2 className="text-[20px] font-bold text-ios-text-primary">Escolha uma nova senha</h2>
            <p className="text-[13px] text-ios-text-secondary px-2">
              Ela substitui a anterior e passa a valer imediatamente.
            </p>
          </div>

          <form onSubmit={salvar} className="flex flex-col gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-text-secondary opacity-40 z-10" size={16} />
                <Input
                  type={mostrar ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-11 pr-11"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMostrar(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ios-text-secondary opacity-60 z-10"
                  aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Repita a senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-text-secondary opacity-40 z-10" size={16} />
                <Input
                  type={mostrar ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-11"
                  value={confirmacao}
                  onChange={e => setConfirmacao(e.target.value)}
                />
              </div>
            </div>

            {erro && <p className="text-[12px] text-red-400 px-1">{erro}</p>}

            <Button type="submit" loading={salvando} className="w-full h-14 mt-2" disabled={!senha || !confirmacao}>
              Salvar nova senha
            </Button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
