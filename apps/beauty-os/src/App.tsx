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
import BookingPage from './screens/BookingPage';
import { AutomationService } from './components/AutomationService';
import { VoiceAssistant } from './components/VoiceAssistant';
import { useStore } from './lib/store';
import { Toast, PWAInstallPrompt } from './components/UI';
import DevTools from './screens/DevTools';
import { Onboarding, applyTheme } from './components/ThemeOnboarding';
import { getVertical } from './lib/vertical';

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
  const settings = useStore(state => state.settings);
  const vertical = getVertical(settings.businessType);
  const location = useLocation();

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    applyTheme(themeAccent, themeBg);
  }, [themeAccent, themeBg]);

  // Verticais sem agendamento (ex: financas pessoais) nao tem aba Agenda.
  useEffect(() => {
    if (!vertical.hasScheduling && (activeTab === 'agenda' || activeTab === 'automation')) {
      setActiveTab('dashboard');
    }
  }, [vertical.hasScheduling, activeTab, setActiveTab]);

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
      <div className="min-h-screen w-full bg-[#050505] text-white">
        <BookingPage />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-ios-bg selection:bg-ios-gold/30 overflow-hidden flex flex-col">
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

        {/* Theme onboarding — shown to authenticated users who haven't chosen a theme yet */}
        <AnimatePresence>
          {user && !hasOnboarded && <Onboarding />}
        </AnimatePresence>

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
