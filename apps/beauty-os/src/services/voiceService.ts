import { useStore } from '../lib/store';

export interface VoiceCommandResult {
  action: 'create_appointment' | 'cancel_appointment' | 'create_client' | 'create_revenue' | 'create_expense' | 'search_client' | 'send_whatsapp' | 'show_dashboard_summary' | 'update_client_notes' | 'update_client_vip' | 'create_service' | 'get_daily_summary' | 'show_financial_summary' | 'list_inactive_clients' | 'unknown';
  data?: any;
  message: string;
  status: 'complete' | 'incomplete';
}

export function useVoiceAssistant() {
  const getRoutineInsight = async (): Promise<string> => {
    const store = useStore.getState();
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayAppointments = store.appointments
      .filter(a => a.date === today && a.status !== 'Cancelado')
      .map(a => ({ name: a.clientName, time: a.time, service: a.service }));

    const inactiveClients = store.clients
      .filter(c => c.lastVisit && c.lastVisit < thirtyDaysAgo)
      .map(c => c.name);

    const recentRevenue = store.transactions
      .filter(t => t.type === 'revenue' && t.date >= sevenDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    const recentExpenses = store.transactions
      .filter(t => t.type === 'expense' && t.date >= sevenDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    try {
      const response = await fetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'insight',
          storeSnapshot: {
            todayAppointments,
            inactiveClients,
            recentRevenue,
            recentExpenses,
            totalClients: store.clients.length,
          },
        }),
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      return data.insight || 'Tudo pronto para o dia. Como posso ajudar?';
    } catch {
      if (todayAppointments.length > 0) {
        return `Você tem ${todayAppointments.length} agendamento${todayAppointments.length > 1 ? 's' : ''} hoje. Como posso ajudar?`;
      }
      return 'Olá! Agenda livre hoje. Como posso ajudar?';
    }
  };

  const parseCommand = async (text: string): Promise<VoiceCommandResult> => {
    const store = useStore.getState();
    try {
      const context = {
        currentTab: store.activeTab,
        clientNames: store.clients.map(c => c.name),
        serviceNames: store.services.map(s => s.name),
        today: new Date().toISOString().split('T')[0],
      };

      const response = await fetch("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, context }),
      });

      if (!response.ok) throw new Error("API failed");
      return await response.json();
    } catch (error) {
      console.error("Voice Parser Error:", error);
      return {
        action: 'unknown',
        message: 'Desculpe, tive um problema técnico ao processar sua voz.',
        status: 'complete'
      };
    }
  };

  const executeCommand = async (result: VoiceCommandResult) => {
    const store = useStore.getState();
    if (result.status === 'incomplete') return;

    const data = result.data || {};

    switch (result.action) {
      case 'create_appointment': {
        const { clientName, date, time, service } = data;
        if (!clientName || !date || !time) break;

        const client = store.clients.find(c => 
          c.name.toLowerCase().includes(clientName.toLowerCase())
        );

        const serviceTemplate = store.services.find(s => 
          s.name.toLowerCase().includes((service || '').toLowerCase())
        );

        await store.addAppointment({
          clientId: client?.id || 'public-booking',
          clientName: client ? client.name : clientName,
          clientPhone: client ? client.phone : '',
          service: serviceTemplate ? serviceTemplate.name : (service || 'Atendimento'),
          date: date,
          time: time,
          duration: serviceTemplate ? serviceTemplate.duration : 60,
          price: serviceTemplate ? serviceTemplate.price : 0,
          status: 'Confirmado'
        });
        store.setActiveTab('agenda');
        break;
      }

      case 'cancel_appointment': {
        const { clientName, date, time } = data;
        let appointmentToCancel = null;
        
        if (clientName) {
          appointmentToCancel = store.appointments.find(a => 
            a.clientName?.toLowerCase().includes(clientName.toLowerCase()) && 
            a.status !== 'Cancelado' &&
            (!date || a.date === date)
          );
        }

        if (appointmentToCancel) {
          await store.updateAppointmentStatus(appointmentToCancel.id, 'Cancelado');
          store.setToast({ message: "Agendamento cancelado com sucesso", type: 'success' });
          store.setActiveTab('agenda');
        }
        break;
      }

      case 'create_client': {
        const { name, phone } = data;
        if (!name) break;
        await store.addClient({
          name,
          phone: phone || '',
          email: '',
          tags: ['Assistente Operational IA'],
          isVIP: false,
          isFavorite: false
        });
        store.setActiveTab('clients');
        break;
      }

      case 'create_revenue': {
        const { amount, description } = data;
        if (!amount) break;
        await store.addTransaction({
          amount: Number(amount),
          type: 'revenue',
          category: 'Venda (AI)',
          date: new Date().toISOString().split('T')[0],
          description: description || 'Registrado via assistente operational'
        });
        store.setActiveTab('financial');
        break;
      }

      case 'create_expense': {
        const { amount, description, category } = data;
        if (!amount) break;
        await store.addTransaction({
          amount: Number(amount),
          type: 'expense',
          category: category || 'Geral (Assistente)',
          date: new Date().toISOString().split('T')[0],
          description: description || 'Despesa registrada via voz'
        });
        store.setActiveTab('financial');
        break;
      }

      case 'update_client_vip': {
        const { clientName, isVIP } = data;
        if (!clientName) break;
        const client = store.clients.find(c => c.name.toLowerCase().includes(clientName.toLowerCase()));
        if (client) {
          await store.updateClient(client.id, { isVIP: !!isVIP });
          store.setToast({ message: `${client.name} agora é ${isVIP ? 'VIP' : 'Normal'}!`, type: 'success' });
          store.setActiveTab('clients');
        }
        break;
      }

      case 'create_service': {
        const { name, price, duration } = data;
        if (!name || !price) break;
        await store.addService({
          name,
          price: Number(price),
          duration: Number(duration) || 60
        });
        store.setActiveTab('more');
        break;
      }

      case 'get_daily_summary': {
        const today = new Date().toISOString().split('T')[0];
        const todayAppts = store.appointments.filter(a => a.date === today && a.status !== 'Cancelado');
        const revenue = store.transactions
          .filter(t => t.date === today && t.type === 'revenue')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const summary = `Hoje: ${todayAppts.length} agendamentos. Total em vendas: R$ ${revenue}.`;
        store.setToast({ message: summary, type: 'success' });
        break;
      }

      case 'show_dashboard_summary':
        store.setActiveTab('dashboard');
        break;

      case 'search_client':
        store.setActiveTab('clients');
        break;

      case 'show_financial_summary': {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = today.substring(0, 7) + '-01';
        const monthRevenue = store.transactions
          .filter(t => t.type === 'revenue' && t.date >= monthStart)
          .reduce((sum, t) => sum + t.amount, 0);
        const monthExpenses = store.transactions
          .filter(t => t.type === 'expense' && t.date >= monthStart)
          .reduce((sum, t) => sum + t.amount, 0);
        store.setToast({
          message: `Este mês: Receitas R$ ${monthRevenue.toFixed(2)} | Despesas R$ ${monthExpenses.toFixed(2)} | Lucro R$ ${(monthRevenue - monthExpenses).toFixed(2)}`,
          type: 'success'
        });
        store.setActiveTab('financial');
        break;
      }

      case 'list_inactive_clients': {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const inactive = store.clients.filter(c => c.lastVisit && c.lastVisit < thirtyDaysAgo);
        store.setToast({
          message: inactive.length > 0
            ? `${inactive.length} cliente${inactive.length > 1 ? 's' : ''} sem visita há mais de 30 dias: ${inactive.slice(0, 3).map(c => c.name).join(', ')}${inactive.length > 3 ? '...' : ''}`
            : 'Nenhuma cliente inativa no momento.',
          type: 'success'
        });
        store.setActiveTab('clients');
        break;
      }

      case 'update_client_notes': {
        const { clientName, notes } = data;
        if (!clientName || !notes) break;
        
        const client = store.clients.find(c => 
          c.name.toLowerCase().includes(clientName.toLowerCase())
        );

        if (client) {
          await store.updateClient(client.id, { 
            notes: client.notes ? `${client.notes}\n---\n${notes}` : notes 
          });
          store.setToast({ message: `Notas atualizadas para ${client.name}`, type: 'success' });
          store.setActiveTab('clients');
        }
        break;
      }

      case 'send_whatsapp': {
        const { clientName } = data;
        if (!clientName) break;

        const client = store.clients.find(c => 
          c.name.toLowerCase().includes(clientName.toLowerCase())
        );

        if (client) {
          const message = `Olá ${client.name}! Passo para confirmar seu horário.`;
          const wpUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
          window.open(wpUrl, '_blank');
          store.setToast({ message: "Abrindo WhatsApp...", type: 'success' });
        }
        break;
      }
    }
  };

  return { parseCommand, executeCommand, getRoutineInsight };
}
