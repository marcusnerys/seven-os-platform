import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard, Button, Input } from '../components/UI';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Key, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'selection' | 'email' | 'register' | 'forgot'>('selection');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('E-mail ou senha incorretos.');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message.includes('already registered') ? 'Este e-mail já está em uso.' : 'Erro ao criar conta. Tente novamente.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError('Erro ao enviar e-mail. Verifique o endereço.');
    } else {
      setSuccess('E-mail de recuperação enviado!');
    }
    setLoading(false);
  };

  return (
    <div className="h-full w-full bg-ios-bg flex flex-col items-center justify-center p-6 sm:p-8 relative overflow-hidden">
      {/* Background Glow */}
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
          <AnimatePresence mode="wait">
            {mode === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-4"
              >
                <div className="text-center space-y-2 mb-2">
                  <h2 className="text-[20px] font-bold text-ios-text-primary">Bem-vindo(a) de volta</h2>
                  <p className="text-[14px] text-ios-text-secondary px-2">Escolha como deseja acessar sua plataforma.</p>
                </div>

                <Button
                  onClick={() => setMode('email')}
                  className="w-full h-14"
                  disabled={loading}
                >
                  <Mail size={20} />
                  <span>Entrar com E-mail</span>
                </Button>

                <p className="text-[11px] text-ios-text-secondary text-center mt-2">
                  Não tem conta? <button onClick={() => setMode('register')} className="text-ios-gold font-bold">Cadastre-se</button>
                </p>
              </motion.div>
            )}

            {(mode === 'email' || mode === 'register' || mode === 'forgot') && (
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <button 
                  onClick={() => { setMode('selection'); setError(''); setSuccess(''); }}
                  className="flex items-center gap-2 text-ios-text-secondary hover:text-ios-text-primary transition-colors mb-2 w-fit"
                >
                  <ArrowLeft size={16} />
                  <span className="text-[13px] font-medium">Voltar</span>
                </button>

                <div className="text-center mb-2">
                  <h2 className="text-[20px] font-bold text-ios-text-primary capitalize">
                    {mode === 'email' ? 'Entrar' : mode === 'register' ? 'Criar Conta' : 'Recuperar Senha'}
                  </h2>
                </div>

                <form onSubmit={mode === 'email' ? handleEmailLogin : mode === 'register' ? handleRegister : handleForgotPassword} className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">E-mail</label>
                    <Input 
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {mode !== 'forgot' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-ios-text-secondary uppercase px-1">Senha</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(p => !p)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-ios-text-secondary hover:text-ios-text-primary transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {error && <p className="text-[12px] text-red-400 px-1">{error}</p>}
                  {success && <p className="text-[12px] text-ios-cyan px-1">{success}</p>}

                  <Button type="submit" loading={loading} className="w-full h-14 mt-2">
                    {mode === 'email' ? 'Entrar' : mode === 'register' ? 'Registrar' : 'Enviar Link'}
                  </Button>

                  {mode === 'email' && (
                    <button 
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-ios-gold font-medium text-center"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-ios-text-secondary text-center leading-relaxed mt-2 opacity-60">
            Luxo, Elegância e Tecnologia
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
