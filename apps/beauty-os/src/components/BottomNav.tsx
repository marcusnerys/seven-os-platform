import { motion } from 'motion/react';
import { Home, Calendar, CircleDollarSign, Users, Menu, Mic } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../lib/store';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const setIsVoiceActive = useStore(state => state.setIsVoiceActive);
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'voice', label: 'Voz', icon: Mic, isAction: true },
    { id: 'financial', label: 'Financeiro', icon: CircleDollarSign },
    { id: 'more', label: 'Mais', icon: Menu },
  ];

  return (
    <div className="w-full relative">
      <div className="bg-[#111214]/95 backdrop-blur-[24px] border border-white/5 rounded-[28px] h-[82px] px-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center justify-around relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isAction) {
            return (
              <div key={tab.id} className="relative w-16 mb-4 flex flex-col items-center justify-center">
                <button
                  onClick={() => setIsVoiceActive(true)}
                  className="w-14 h-14 rounded-full bg-linear-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#111214] shadow-[0_8px_20px_rgba(212,175,55,0.3)] active:scale-90 transition-all border border-white/20 z-20 hover:shadow-[0_12px_28px_rgba(212,175,55,0.4)]"
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
                isActive ? "text-[#D4AF37]" : "text-[#8E8E93]"
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
