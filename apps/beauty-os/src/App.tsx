/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import BottomNav from './components/BottomNav';
import Dashboard from './screens/Dashboard';
import Agenda from './screens/Agenda';
import Financial from './screens/Financial';
import Clients from './screens/Clients';
import More from './screens/More';
import Automation from './screens/Automation';
import Login from './screens/Login';
import NewPassword from './screens/NewPassword';
import BookingPage from './screens/BookingPage';
import { AutomationService } from './components/AutomationService';
import { VoiceAssistant } from './components/VoiceAssistant';
import { PainelImportacao } from './components/PainelImportacao';
import { SincronizarFinanceiro } from './components/financeiro/SincronizarFinanceiro';
import { avisoDaVoltaDoGoogle } from './components/GoogleAgenda';
import { useStore } from './lib/store';
import { Toast, PWAInstallPrompt } from './components/UI';
import DevTools from './screens/DevTools';
import { Onboarding, applyTheme } from './components/ThemeOnboarding';
import { getVertical } from './lib/vertical';
import { CobrarPix } from './components/CobrarPix';
import { guardarConviteDoLink, conviteGuardado, podeAbrirAba } from './lib/permissoes';
import { AceitarConviteDoLink } from './components/EquipeAcesso';

// Antes de tudo: o link de convite chega com ?convite=... e precisa sobreviver ao login.
guardarConviteDoLink();

const ADMIN_EMAIL = 'leshanot.meunegocio@gmail.com';

export default function App() {
  const activeTab = useStore(state => state.activeTab);
  const setActiveTab = useStore(state => state.setActiveTab);
  const user = useStore(state => state.user);
  const loading = useStore(state => state.loading);
  const toast = useStore(state => state.toast);
  const showDevTools = useStore(state => state.showDevTools);
  const setShowDevTools = useStore(state => state.setShowDevTools);
  const setToast = useStore(state => state.setToast);
  const themeAccent = useStore(state => state.themeAccent);
  const themeBg = useStore(state => state.themeBg);
  const hasOnboarded = useStore(state => state.hasOnboarded);
  const configLoaded = useStore(state => state.configLoaded);
  const isRecoveringPassword = useStore(state => state.isRecoveringPassword);
  const settings = useStore(state => state.settings);
  const cobrancaPendente = useStore(state => state.cobrancaPendente);
  const setCobrancaPendente = useStore(state => state.setCobrancaPendente);
  const papel = useStore(state => state.papel);
  const areas = useStore(state => state.areas);
  const empresaId = useStore(state => state.empresaId);
  const convitePendente = useStore(state => state.convitePendente);
  const vertical = getVertical(settings.businessType);
  const location = useLocation();

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    applyTheme(themeAccent, themeBg);
  }, [themeAccent, themeBg]);

  // Convite vindo de link (guardado antes do login).
  useEffect(() => {
    useStore.getState().setConvitePendente(conviteGuardado());
  }, []);

  // Volta do login Google (?google=conectado|erro|...): avisa uma vez.
  useEffect(() => {
    const aviso = avisoDaVoltaDoGoogle();
    if (aviso) setToast(aviso);
  }, []);

  // Verticais sem agendamento (ex: financas pessoais) nao tem aba Agenda.
  useEffect(() => {
    if (!vertical.hasScheduling && (activeTab === 'agenda' || activeTab === 'automation')) {
      setActiveTab('dashboard');
    }
  }, [vertical.hasScheduling, activeTab, setActiveTab]);

  // Quem é da equipe e perdeu (ou não tem) a área desta aba volta ao início.
  useEffect(() => {
    if (!podeAbrirAba({ papel, areas }, activeTab)) setActiveTab('dashboard');
  }, [papel, areas, activeTab, setActiveTab]);

  const isPublicRoute = location.pathname.startsWith('/book/');

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ios-gold/20 border-t-ios-gold rounded-full animate-spin" />
      </div>
    );
  }

  // If it's a public booking route, we don't wrap it in the iPhone frame if we want it to feel like a full page, 
  // but for consistency with the "app" feel, maybe we should. 
  // However, the user said "página pública", so it should probably be a standard responsive page.
  
  if (isPublicRoute) {
    return (
      <div className="min-h-screen w-full bg-[#050505] text-white pt-[env(safe-area-inset-top)]">
        <BookingPage />
      </div>
    );
  }

  // Quem chega pelo link de recuperação já vem autenticado. Sem esta parada
  // a pessoa cairia no Dashboard sem nunca definir a senha nova.
  if (isRecoveringPassword) {
    return <NewPassword />;
  }

  return (
    <div className="relative h-screen w-full bg-ios-bg selection:bg-ios-gold/30 overflow-hidden flex flex-col pt-[env(safe-area-inset-top)]">
        {/* Screen Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <main className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {!user ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <Login />
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="h-full"
                >
                  {activeTab === 'dashboard' && <Dashboard />}
                  {activeTab === 'agenda' && <Agenda />}
                  {activeTab === 'financial' && <Financial />}
                  {activeTab === 'clients' && <Clients />}
                  {activeTab === 'more' && <More />}
                  {activeTab === 'automation' && <Automation />}
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {user && (
            <div className="px-4 pb-8 pt-2 z-50">
              <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}
        </div>

        {user && <AutomationService />}
        {user && <VoiceAssistant />}
        {user && cobrancaPendente && (
          <CobrarPix cliente={cobrancaPendente.cliente} valorInicial={cobrancaPendente.valor} aoFechar={() => setCobrancaPendente(null)} />
        )}
        {user && <PainelImportacao />}
        {user && <SincronizarFinanceiro />}

        {/* Theme onboarding — shown to authenticated users who haven't chosen a theme yet */}
        <AnimatePresence>
          {/* Espera a leitura das configurações: conta já configurada num
              aparelho novo não pode ver o questionário, que começava em
              "Outro negócio" e sobrescrevia o que estava salvo. */}
          {/* O questionário configura o negócio: é do dono. Quem entrou por
              convite já encontra o negócio pronto. */}
          {user && empresaId && configLoaded && !hasOnboarded && papel === 'dono' && !convitePendente && <Onboarding />}
        </AnimatePresence>

        {user && <AceitarConviteDoLink />}

        <PWAInstallPrompt />

        {/* DevTools only for admin account */}
        <AnimatePresence>
          {showDevTools && isAdmin && <DevTools onClose={() => setShowDevTools(false)} />}
        </AnimatePresence>

        {toast && (
          <Toast 
            isVisible={!!toast}
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

    </div>
  );
}
