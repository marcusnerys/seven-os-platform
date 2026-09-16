import { motion } from 'motion/react';
import { Home, Calendar, CircleDollarSign, Users, Menu, Mic } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/store';
import { getVertical } from '../lib/vertical';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const setIsVoiceActive = useStore(state => state.setIsVoiceActive);
  const settings = useStore(state => state.settings);
  const vertical = getVertical(settings.businessType);
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: Home },
    ...(vertical.hasScheduling ? [{ id: 'agenda', label: 'Agenda', icon: Calendar }] : []),
    { id: 'voice', label: 'Voz', icon: Mic, isAction: true },
    { id: 'financial', label: 'Financeiro', icon: CircleDollarSign },
    { id: 'more', label: 'Mais', icon: Menu },
  ];

  return (
    <div className="w-full relative">
      <div className="bg-ios-surface/95 backdrop-blur-[24px] border border-ios-border rounded-[28px] h-[82px] px-2 shadow-[0_20px_40px_rgba(0,0,0,0.25)] flex items-center justify-around relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isAction) {
            return (
              <div key={tab.id} className="relative w-16 mb-4 flex flex-col items-center justify-center">
                <button
                  onClick={() => setIsVoiceActive(true)}
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_var(--color-ios-gold-30,rgba(212,175,55,0.3))] active:scale-90 transition-all border border-white/20 z-20"
                  style={{ background: 'linear-gradient(135deg, var(--color-ios-gold), color-mix(in srgb, var(--color-ios-gold) 70%, #000))', color: '#111214' }}
                >
                  <Icon size={28} strokeWidth={2.5} />
                </button>
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all duration-300 w-14",
                isActive ? "text-ios-gold" : "text-ios-text-secondary"
              )}
            >
              <div className="relative">
                <Icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  fill={isActive ? "currentColor" : "none"} 
                  className={cn("transition-transform", isActive && "scale-110")}
                />
              </div>
              <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
