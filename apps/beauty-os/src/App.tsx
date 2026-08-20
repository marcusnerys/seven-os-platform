/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { Battery, Wifi, Signal } from 'lucide-react';
import { useStore } from './lib/store';
import { Toast, PWAInstallPrompt } from './components/UI';
import DevTools from './screens/DevTools';

export default function App() {
  const activeTab = useStore(state => state.activeTab);
  const setActiveTab = useStore(state => state.setActiveTab);
  const user = useStore(state => state.user);
  const loading = useStore(state => state.loading);
  const toast = useStore(state => state.toast);
  const showDevTools = useStore(state => state.showDevTools);
  const setShowDevTools = useStore(state => state.setShowDevTools);
  const setToast = useStore(state => state.setToast);
  const location = useLocation();

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
    <div className="relative h-screen w-full bg-[#050505] selection:bg-ios-gold/30 flex items-center justify-center p-4">
      {/* Mobile Wrapper (Simulates iPhone constraint if viewport is large) */}
      <div className="relative w-full h-full max-w-[390px] max-h-[844px] bg-ios-bg overflow-hidden flex flex-col shadow-[0_0_0_10px_#1a1a1d,0_32px_64px_-16px_rgba(0,0,0,0.8)] rounded-[50px] border border-white/5 transition-all duration-500 ease-in-out">
        
        {/* iOS Status Bar Simulation */}
        <div className="flex items-center justify-between px-8 py-4 pt-6 text-white pointer-events-none z-50">
          <span className="text-[12px] font-bold tracking-tightest">9:41</span>
          <div className="flex items-center gap-1.5 opacity-80">
            <Signal size={14} strokeWidth={2.5} />
            <Wifi size={14} strokeWidth={2.5} />
            <div className="relative w-5 h-2.5 border border-white/30 rounded-[3px] flex items-center p-[1px]">
              <div className="w-[14px] h-full bg-white rounded-sm" />
            </div>
          </div>
        </div>

        {/* Dynamic Notch (Sleek) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-[18px] z-40 border-x border-b border-white/5" />

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

        <PWAInstallPrompt />

        <AnimatePresence>
          {showDevTools && <DevTools onClose={() => setShowDevTools(false)} />}
        </AnimatePresence>

        {toast && (
          <Toast 
            isVisible={!!toast}
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}

        {/* iOS Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/20 rounded-full z-50 pointer-events-none" />
      </div>
    </div>
  );
}
