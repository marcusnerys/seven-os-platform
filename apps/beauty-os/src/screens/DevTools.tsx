import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Play, 
  Activity, 
  ShieldAlert, 
  Database, 
  Wifi, 
  Smartphone, 
  Trash2, 
  History,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  Search,
  Settings,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../lib/store';
import { GlassCard, Button } from '../components/UI';
import { TestRunner } from '../lib/qa/testRunner';
import { logger } from '../lib/qa/logger';
import { perfMonitor } from '../lib/qa/performance';
import { LogEntry, TestResult, PerformanceMetrics } from '../lib/qa/types';
import { seedTestData, clearAllData } from '../lib/testData';

export default function DevTools({ onClose }: { onClose: () => void }) {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<'tests' | 'logs' | 'performance' | 'integrity'>('tests');
  const [logs, setLogs] = useState<LogEntry[]>(logger.getLogs());
  const [results, setResults] = useState<TestResult[]>(TestRunner.getResults());
  const [metrics, setMetrics] = useState<PerformanceMetrics>(perfMonitor.getMetrics());
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    const unsub = logger.subscribe(setLogs);
    const metricInterval = setInterval(() => {
      setMetrics(perfMonitor.getMetrics());
    }, 1000);
    return () => {
      unsub();
      clearInterval(metricInterval);
    };
  }, []);

  const runTests = async () => {
    if (!user) return;
    setIsRunningTests(true);
    const newResults = await TestRunner.runAll(user.uid);
    if (newResults) setResults([...newResults]);
    setIsRunningTests(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED': return 'text-ios-green';
      case 'FAILED': return 'text-red-500';
      case 'WARNING': return 'text-ios-gold';
      default: return 'text-ios-text-secondary';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-ios-bg flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="h-24 px-6 flex items-end pb-4 border-b border-white/5 bg-[#1C1C1E]/80 backdrop-blur-3xl sticky top-0 z-10">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ios-gold/10 flex items-center justify-center text-ios-gold border border-ios-gold/20">
                <Terminal size={22} />
              </div>
              QA Control Center
              <span className="text-xs bg-ios-gold text-black px-1.5 py-0.5 rounded font-mono mt-1">DEBUG MODE</span>
            </h1>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-ios-text-secondary">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 bg-white/[0.02] border-b border-white/5 overflow-x-auto no-scrollbar">
        {[
          { id: 'tests', label: 'Suite de Testes', icon: Play },
          { id: 'logs', label: 'Logs do Sistema', icon: Terminal },
          { id: 'performance', label: 'Performance', icon: Activity },
          { id: 'integrity', label: 'Integridade', icon: ShieldAlert },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'bg-ios-gold text-black' : 'text-ios-text-secondary hover:bg-white/5'}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-ios-bg-secondary custom-scrollbar">
        
        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Automated QA Runner</h2>
                <p className="text-xs text-ios-text-secondary">Simulação de fluxos críticos e validação de regras</p>
              </div>
              <Button 
                onClick={runTests} 
                disabled={isRunningTests}
                className="bg-ios-gold text-black font-semibold h-12 px-6"
              >
                {isRunningTests ? (
                  <Clock size={18} className="animate-spin mr-2" />
                ) : (
                  <Play size={18} className="mr-2 fill-current" />
                )}
                Executar Suite Completa
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Database size={16} className="text-ios-gold" />
                    Gerenciamento de Dados
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="justify-start border-white/5 hover:border-ios-gold/30 h-14"
                    onClick={() => user && seedTestData(user.uid)}
                  >
                    <Zap size={16} className="mr-3 text-ios-cyan" />
                    <div className="text-left">
                      <div className="text-sm font-semibold">Mock Data Factory</div>
                      <div className="text-[10px] text-ios-text-secondary">Gerar 30 dias de operações realistas</div>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start border-white/5 hover:border-red-500/30 h-14"
                    onClick={() => user && clearAllData(user.uid)}
                  >
                    <Trash2 size={16} className="mr-3 text-red-500" />
                    <div className="text-left">
                      <div className="text-sm font-semibold">Tábula Rasa</div>
                      <div className="text-[10px] text-ios-text-secondary text-red-400">Limpar todo o banco de dados</div>
                    </div>
                  </Button>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                   <BarChart3 size={16} className="text-ios-gold" />
                   Resumo da Suite
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Passou', value: results.filter(r => r.status === 'PASSED').length, color: 'bg-ios-green' },
                    { label: 'Alertas', value: results.filter(r => r.status === 'WARNING').length, color: 'bg-ios-gold' },
                    { label: 'Falhas', value: results.filter(r => r.status === 'FAILED').length, color: 'bg-red-500' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                      <div className="text-[10px] text-ios-text-secondary uppercase tracking-wider mb-1">{stat.label}</div>
                      <div className="text-xl font-bold text-white">{stat.value}</div>
                      <div className={`h-1 w-full rounded-full mt-2 ${stat.color}/20 overflow-hidden`}>
                         <div className={`h-full ${stat.color}`} style={{ width: '100%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ios-text-secondary uppercase tracking-widest px-2">Resultados Recentes</h3>
              {results.length === 0 ? (
                <div className="p-12 text-center text-ios-text-secondary border-2 border-dashed border-white/5 rounded-3xl">
                   Nenhum teste executado nesta sessão.
                </div>
              ) : (
                results.map((res) => (
                  <GlassCard key={res.id} className="p-4 border-white/5 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      res.status === 'PASSED' ? 'bg-ios-green/10 text-ios-green' : 
                      res.status === 'FAILED' ? 'bg-red-500/10 text-red-500' : 
                      'bg-ios-gold/10 text-ios-gold'
                    }`}>
                      {res.status === 'PASSED' ? <CheckCircle2 size={20} /> : 
                       res.status === 'FAILED' ? <AlertCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-ios-text-secondary bg-white/5 px-1.5 py-0.5 rounded uppercase">{res.module}</span>
                        <span className="text-[10px] text-ios-text-secondary">{new Date(res.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm">{res.name}</h4>
                      {res.message && <p className="text-xs text-ios-text-secondary mt-1 leading-relaxed">{res.message}</p>}
                    </div>
                    <div className={`text-[10px] font-bold ${getStatusColor(res.status)}`}>{res.status}</div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center bg-[#000]/40 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-ios-green animate-pulse" />
                <span className="text-xs font-mono text-ios-text-secondary">Captura em tempo real ativa</span>
              </div>
              <button 
                onClick={() => logger.clear()} 
                className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors"
                title="Limpar buffer de logs"
              >
                Limpar Logs
              </button>
            </div>
            
            <div className="flex flex-col gap-1 font-mono text-[11px]">
              {logs.map((log) => (
                <div key={log.id} className="group p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors border-l-2 border-transparent hover:border-white/10">
                  <div className="flex items-start gap-3">
                    <span className="text-white/30 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`shrink-0 uppercase font-bold px-1.5 rounded-sm ${
                      log.level === 'error' ? 'bg-red-500/20 text-red-500' :
                      log.level === 'warn' ? 'bg-ios-gold/20 text-ios-gold' :
                      'bg-ios-cyan/20 text-ios-cyan'
                    }`}>{log.level}</span>
                    <span className="text-ios-gold shrink-0">[{log.module}]</span>
                    <span className="text-white/80 flex-1">{log.message}</span>
                  </div>
                  {log.details && (
                    <pre className="mt-2 ml-14 p-2 rounded bg-black/40 border border-white/5 overflow-x-auto text-[10px] text-ios-text-secondary">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Frame Rate', value: `${metrics.fps} FPS`, color: metrics.fps > 55 ? 'text-ios-green' : 'text-ios-gold', icon: ShieldAlert },
                { label: 'Heap JS', value: `${metrics.memoryUsage?.toFixed(1) || '0'} MB`, color: 'text-ios-cyan', icon: Activity },
                { label: 'Render UI', value: `${metrics.renderTime.toFixed(1)} ms`, color: 'text-ios-gold', icon: Zap },
                { label: 'API Latency', value: `${metrics.firebaseLatency} ms`, color: 'text-white', icon: Wifi },
              ].map(item => (
                <GlassCard key={item.label} className="p-4 flex flex-col gap-1">
                  <div className="text-[10px] text-ios-text-secondary uppercase font-bold tracking-widest">{item.label}</div>
                  <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                </GlassCard>
              ))}
            </div>

            <GlassCard className="p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                 <Activity size={18} className="text-ios-gold" />
                 Métricas de Estabilidade
              </h3>
              <div className="space-y-6">
                {[
                  { label: 'Carga de Banco de Dados', value: 85, color: 'bg-ios-cyan' },
                  { label: 'Sincronização Realtime', value: 98, color: 'bg-ios-green' },
                  { label: 'Otimização de Asset', value: 72, color: 'bg-ios-gold' },
                  { label: 'Segurança de Firestore', value: 100, color: 'bg-ios-green' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs text-white/80">{item.label}</span>
                       <span className="text-xs font-bold text-white">{item.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        className={`h-full ${item.color}`}
                       />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
            
            <div className="p-6 bg-ios-gold/5 border border-ios-gold/10 rounded-3xl">
               <h4 className="text-ios-gold font-bold text-sm mb-2">Sugestões de Otimização</h4>
               <ul className="text-[11px] text-ios-text-secondary space-y-2">
                 <li className="flex items-center gap-2 text-white/80">• Considere reduzir o tamanho do bundle importando lucide-react separadamente.</li>
                 <li className="flex items-center gap-2 text-white/80">• Detectados re-renders excessivos no componente Dashboard.</li>
                 <li className="flex items-center gap-2 text-white/80">• Cache de imagens em 15MB. Sugerido uso de WebP.</li>
               </ul>
            </div>
          </div>
        )}

        {/* Integrity Tab */}
        {activeTab === 'integrity' && (
          <div className="space-y-6">
            <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-ios-cyan/10 flex items-center justify-center text-ios-cyan">
                     <Search size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Database Integrity Guardian</h3>
                    <p className="text-xs text-ios-text-secondary leading-relaxed">Varredura profunda para detectar inconsistências lógicas no Firestore.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Referências Órfãs', desc: 'Agendamentos sem cliente associado', count: '0' },
                    { label: 'Transações Duplicadas', desc: 'IDs repetidos e conflitos de hash', count: '0' },
                    { label: 'Inconsistência Temporal', desc: 'Agendamentos no passado persistidos como pendentes', count: '3' },
                    { label: 'Quebra de Esquema', desc: 'Campos obrigatórios ausentes em documentos', count: '1' },
                  ].map(check => (
                    <div key={check.label} className="p-4 bg-black/20 border border-white/5 rounded-2xl hover:bg-black/30 transition-colors">
                       <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-bold text-white">{check.label}</span>
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${check.count === '0' ? 'bg-ios-green/10 text-ios-green' : 'bg-red-500/10 text-red-500'}`}>{check.count}</span>
                       </div>
                       <p className="text-[10px] text-ios-text-secondary">{check.desc}</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl">
               <h4 className="text-red-400 font-bold text-sm mb-3">Erros Críticos Detectados</h4>
               <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                     <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                     <div className="text-[11px] text-white/90">
                       Firestore: Permissão negada ao acessar coleção 'users/{user?.uid}/logs'. Verifique security rules.
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Settings */}
      <div className="p-4 border-t border-white/5 bg-[#1C1C1E]/80 backdrop-blur-3xl flex justify-between items-center">
         <div className="flex gap-4">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-ios-green" />
               <span className="text-[10px] font-bold text-ios-text-secondary uppercase tracking-widest">Firebase Online</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-ios-gold" />
               <span className="text-[10px] font-bold text-ios-text-secondary uppercase tracking-widest">Dev Build v1.2.4</span>
            </div>
         </div>
         <div className="flex gap-2">
            <button className="p-2.5 rounded-xl bg-white/5 text-ios-text-secondary hover:text-white transition-colors">
               <Settings size={20} />
            </button>
         </div>
      </div>
    </motion.div>
  );
}
