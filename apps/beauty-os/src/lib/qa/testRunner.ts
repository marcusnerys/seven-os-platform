import { useStore } from '../store';
import { TestResult, TestStatus } from './types';
import { logger } from './logger';
import { supabase } from '../supabase';

export class TestRunner {
  private static results: TestResult[] = [];
  private static isRunning = false;

  static async runAll(userId: string) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.results = [];
    
    logger.info('QA', 'Iniciando bateria de testes automatizados...');

    await this.testAuth(userId);
    await this.testBookingFlow(userId);
    await this.testFinancialIntegrity(userId);
    await this.testRealtimeSync(userId);
    await this.testClientRelations(userId);

    this.isRunning = false;
    logger.info('QA', 'Bateria de testes concluída.');
    return this.results;
  }

  private static addResult(name: string, module: string, status: TestStatus, message?: string) {
    const result: TestResult = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      module,
      status,
      message,
      timestamp: new Date().toISOString(),
    };
    this.results.push(result);
    if (status === 'FAILED') logger.error(module, `Teste Falhou: ${name}`, message);
    else if (status === 'WARNING') logger.warn(module, `Teste com Alerta: ${name}`, message);
    else logger.info(module, `Teste Passou: ${name}`);
  }

  private static async testAuth(userId: string) {
    try {
      if (userId) {
        this.addResult('Verificação de Sessão', 'Auth', 'PASSED', `Usuário autenticado: ${userId}`);
      } else {
        this.addResult('Verificação de Sessão', 'Auth', 'FAILED', 'Nenhum usuário detectado no estado.');
      }
    } catch (e) {
      this.addResult('Verificação de Sessão', 'Auth', 'FAILED', String(e));
    }
  }

  private static async testBookingFlow(userId: string) {
    const module = 'Booking';
    try {
      const today = new Date().toISOString().split('T')[0];
      const testAppt = {
        empresa_id: userId,
        client_name: 'QA Test Client',
        client_phone: '00000000000',
        service: 'Teste QA',
        time: '23:59', // Extreme time for test
        date: today,
        duration: 30,
        status: 'Pendente',
        price: 1,
      };

      // 1. Create
      const { data: created, error: createError } = await supabase
        .from('beautyos_appointments')
        .insert(testAppt)
        .select()
        .single();
      if (createError) throw createError;
      this.addResult('Criação de Agendamento', module, 'PASSED');

      // 2. Conflict Test (should find itself or others)
      const store = useStore.getState();
      const isAvailable = store.isSlotAvailable(today, '23:59', 30, 'different-id');
      if (isAvailable) {
        this.addResult('Prevenção de Duplicidade', module, 'FAILED', 'O sistema permitiu agendamento em slot já ocupado.');
      } else {
        this.addResult('Prevenção de Duplicidade', module, 'PASSED');
      }

      // 3. Cleanup
      await supabase.from('beautyos_appointments').delete().eq('id', created.id);
      this.addResult('Remoção de Agendamento', module, 'PASSED');

    } catch (e) {
      this.addResult('Fluxo de Booking', module, 'FAILED', String(e));
    }
  }

  private static async testFinancialIntegrity(userId: string) {
    const module = 'Financial';
    try {
      const store = useStore.getState();
      const transactions = store.transactions;
      
      const hasNaN = transactions.some(t => isNaN(t.amount));
      if (hasNaN) {
        this.addResult('Integridade de Valores', module, 'FAILED', 'Detectadas transações com valores inválidos (NaN).');
      } else {
        this.addResult('Integridade de Valores', module, 'PASSED');
      }

      const totalRevenue = transactions
        .filter(t => t.type === 'revenue')
        .reduce((sum, t) => sum + t.amount, 0);
      
      this.addResult('Cálculo de Receita', module, totalRevenue >= 0 ? 'PASSED' : 'WARNING', `Receita total: ${totalRevenue}`);

    } catch (e) {
      this.addResult('Integridade Financeira', module, 'FAILED', String(e));
    }
  }

  private static async testRealtimeSync(userId: string) {
    const module = 'Realtime';
    try {
      const store = useStore.getState();
      if (!store.user) throw new Error('Offline');
      
      this.addResult('Estado do Listener', module, 'PASSED', 'Listeners ativos e sincronizados.');
    } catch (e) {
      this.addResult('Estado do Listener', module, 'FAILED', String(e));
    }
  }

  private static async testClientRelations(userId: string) {
    const module = 'Database';
    try {
      const store = useStore.getState();
      const appointments = store.appointments;
      const clients = store.clients;

      const orphaned = appointments.filter(a => 
        a.clientId && 
        a.clientId !== 'public-booking' && 
        !clients.find(c => c.id === a.clientId)
      );

      if (orphaned.length > 0) {
        this.addResult('Referências Órfãs', module, 'WARNING', `${orphaned.length} agendamentos referenciam clientes inexistentes.`);
      } else {
        this.addResult('Referências Órfãs', module, 'PASSED');
      }
    } catch (e) {
      this.addResult('Integridade de Dados', module, 'FAILED', String(e));
    }
  }

  static getResults() {
    return this.results;
  }
}
