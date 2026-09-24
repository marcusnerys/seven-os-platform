import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { dataLocal, acharPorNome, semAcento, digitosTelefoneBR, formatarTelefoneBR } from '../lib/utils';
import { openWhatsApp } from '../lib/whatsapp';

/**
 * fetch com prazo. Sem isto, um servidor que trava deixa o `await` pendurado
 * para sempre: o catch nunca dispara, a resposta alternativa nunca aparece, e
 * o assistente fica girando na tela do usuário sem nunca desistir.
 */
const TEMPO_LIMITE_MS = 15_000;

async function fetchComPrazo(url: string, init: RequestInit): Promise<Response> {
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  // O servidor exige o token de quem está logado: sem isso qualquer pessoa
  // gastava a cota gratuita do Gemini, que é compartilhada por todos.
  const { data: sessao } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (sessao.session?.access_token) headers.set('Authorization', `Bearer ${sessao.session.access_token}`);
  try {
    return await fetch(url, { ...init, headers, signal: controle.signal });
  } finally {
    clearTimeout(prazo);
  }
}

export interface VoiceCommandResult {
  action: 'create_appointment' | 'cancel_appointment' | 'create_client' | 'create_revenue' | 'create_expense' | 'search_client' | 'send_whatsapp' | 'show_dashboard_summary' | 'update_client_notes' | 'update_client_vip' | 'create_service' | 'get_daily_summary' | 'show_financial_summary' | 'list_inactive_clients' | 'unknown';
  data?: any;
  message: string;
  status: 'complete' | 'incomplete';
}

/** O que o comando realmente fez, quando difere do que o Gemini anunciou. */
export type ResultadoExecucao = { mensagem: string; pergunta: boolean } | null;

export function useVoiceAssistant() {
  const getRoutineInsight = async (): Promise<string> => {
    const store = useStore.getState();
    const today = dataLocal();
    const sevenDaysAgo = dataLocal(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = dataLocal(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

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
      const response = await fetchComPrazo('/api/voice/parse', {
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
        today: dataLocal(),
      };

      const response = await fetchComPrazo("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, context }),
      });

      if (!response.ok) {
        // 503 é o assistente ocupado no nível gratuito do Gemini, e o
        // servidor manda uma frase própria para isso. Antes toda falha virava
        // "problema técnico", inclusive a que se resolve tentando de novo.
        const erro = await response.json().catch(() => ({}));
        // Só as frases próprias do servidor (ocupado, sessão expirada, limite
        // de uso), que estão em português. O 500 chega em inglês.
        const doServidor = [401, 429, 503].includes(response.status) ? erro?.error : null;
        return {
          action: 'unknown',
          message: doServidor || 'Desculpe, tive um problema técnico ao processar sua voz.',
          status: 'complete',
        };
      }
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

  /**
   * Executa o comando e devolve o que de fato aconteceu.
   *
   * Devolve uma frase quando o resultado difere do que o Gemini anunciou — o
   * cliente não foi encontrado, havia mais de um com o nome, o horário estava
   * ocupado — ou null quando a frase do modelo vale. Antes todo caso que não
   * achava o que procurava simplesmente dava `break`, e a tela continuava
   * mostrando "Agendamento cancelado com sucesso" sem nada ter mudado.
   */
  const executeCommand = async (result: VoiceCommandResult): Promise<ResultadoExecucao> => {
    const store = useStore.getState();
    if (result.status === 'incomplete') return null;

    // Pergunta mantém a conversa aberta para a pessoa responder; informação
    // só é mostrada e o assistente fecha.
    const perguntar = (mensagem: string): ResultadoExecucao => ({ mensagem, pergunta: true });
    const informar = (mensagem: string): ResultadoExecucao => ({ mensagem, pergunta: false });

    const data = result.data || {};
    const hoje = dataLocal();
    const dataValida = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
    const horaValida = (h: unknown) => typeof h === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

    // Um nome, uma pessoa. Com mais de uma candidata, pergunta em vez de
    // escolher: agir na cliente errada é pior que pedir o sobrenome.
    const acharCliente = (nome: string) => {
      const { item, ambiguo } = acharPorNome(store.clients, nome);
      if (ambiguo) return { cliente: null, aviso: perguntar(`Tenho mais de um cadastro com o nome ${nome}. Pode dizer o nome completo?`) };
      if (!item) return { cliente: null, aviso: perguntar(`Não encontrei ${nome} no cadastro. Pode repetir o nome?`) };
      return { cliente: item, aviso: null };
    };

    switch (result.action) {
      case 'create_appointment': {
        const { clientName, date, time, service } = data;
        if (!clientName || !dataValida(date) || !horaValida(time)) {
          return perguntar('Faltou o nome, a data ou o horário. Pode repetir com tudo junto?');
        }

        const { item: client, ambiguo } = acharPorNome(store.clients, clientName);
        if (ambiguo) return perguntar(`Tenho mais de um cadastro com o nome ${clientName}. Pode dizer o nome completo?`);

        // Serviço só quando foi dito. Sem isso, includes('') casava com o
        // primeiro serviço do catálogo e o agendamento saía com o nome, o
        // preço e a duração de um serviço que ninguém pediu.
        // Com mais de um parecido ("Corte Feminino", "Corte Masculino"),
        // pergunta: gravar "Corte" sem preço lançava receita de R$ 0.
        let serviceTemplate: (typeof store.services)[number] | null = null;
        if (service) {
          const achado = acharPorNome(store.services, service);
          if (achado.ambiguo) {
            const alvo = semAcento(service);
            const opcoes = store.services.filter(s => semAcento(s.name).includes(alvo)).map(s => s.name).slice(0, 4);
            return perguntar(`Qual serviço: ${opcoes.join(', ')}?`);
          }
          serviceTemplate = achado.item;
        }
        const duracao = serviceTemplate ? serviceTemplate.duration : 60;

        if (!store.isSlotAvailable(date, time, duracao)) {
          return perguntar(`Às ${time} desse dia já existe um atendimento. Qual outro horário?`);
        }

        await store.addAppointment({
          clientId: client?.id || 'public-booking',
          clientName: client ? client.name : clientName,
          clientPhone: client ? client.phone : '',
          service: serviceTemplate ? serviceTemplate.name : (service || 'Atendimento'),
          date,
          time,
          duration: duracao,
          price: serviceTemplate ? serviceTemplate.price : 0,
          status: 'Confirmado'
        });
        store.setActiveTab('agenda');
        if (service && !serviceTemplate) {
          return informar(`Agendado. "${service}" não está no catálogo, então ficou sem preço. Ajuste na Agenda se precisar.`);
        }
        return null;
      }

      case 'cancel_appointment': {
        const { clientName, date, time } = data;
        if (!clientName) return perguntar('De quem é o agendamento que devo cancelar?');

        const { cliente, aviso } = acharCliente(clientName);
        const alvo = semAcento(clientName);

        // Casa pelo cadastro e, para reservas sem cadastro, pelo nome gravado
        // no agendamento. Só atendimentos ainda em aberto: cancelar um
        // Concluído deixava a receita lançada e o atendimento sumia da conta.
        const candidatos = store.appointments.filter(a =>
          (a.status === 'Confirmado' || a.status === 'Pendente') &&
          ((cliente && a.clientId === cliente.id) || semAcento(a.clientName || '') === alvo) &&
          (!dataValida(date) || a.date === date) &&
          (!horaValida(time) || a.time === time) &&
          a.date >= hoje
        );

        if (candidatos.length === 0) return aviso ?? informar(`Não encontrei agendamento em aberto de ${clientName}.`);
        if (candidatos.length > 1) {
          return perguntar(`${clientName} tem ${candidatos.length} agendamentos em aberto. Qual a data e o horário do que devo cancelar?`);
        }

        await store.updateAppointmentStatus(candidatos[0].id, 'Cancelado');
        store.setActiveTab('agenda');
        return null;
      }

      case 'create_client': {
        const { name, phone } = data;
        if (!name) return perguntar('Qual é o nome da pessoa?');
        const telefone = digitosTelefoneBR(phone || '').length >= 10 ? formatarTelefoneBR(phone) : '';
        await store.addClient({
          name,
          phone: telefone,
          email: '',
          tags: ['Cadastro por voz'],
          isVIP: false,
          isFavorite: false
        });
        store.setActiveTab('clients');
        return telefone ? null : informar(`${name} cadastrado sem telefone. Complete o número no cadastro para mandar mensagens.`);
      }

      case 'create_revenue':
      case 'create_expense': {
        const { amount, description, category } = data;
        const valor = Math.abs(Number(amount));
        if (!Number.isFinite(valor) || valor === 0) return perguntar('Qual foi o valor?');
        const receita = result.action === 'create_revenue';

        await store.addTransaction({
          amount: valor,
          type: receita ? 'revenue' : 'expense',
          category: category || (receita ? 'Venda' : 'Outros'),
          // "Recebi 100 ontem" chegava com a data certa e era gravado hoje.
          date: dataValida(data.date) ? data.date : hoje,
          description: description || (receita ? 'Registrado por voz' : 'Despesa registrada por voz')
        });
        store.setActiveTab('financial');
        return null;
      }

      case 'update_client_vip': {
        const { clientName, isVIP } = data;
        if (!clientName) return perguntar('De qual cliente?');
        const { cliente, aviso } = acharCliente(clientName);
        if (!cliente) return aviso;
        await store.updateClient(cliente.id, { isVIP: isVIP !== false });
        store.setActiveTab('clients');
        return informar(`${cliente.name} agora ${isVIP !== false ? 'é VIP' : 'não é mais VIP'}.`);
      }

      case 'create_service': {
        const { name, price, duration } = data;
        const preco = Number(price);
        if (!name) return perguntar('Qual é o nome do serviço?');
        if (price === undefined || price === null || price === '' || !Number.isFinite(preco) || preco < 0) {
          return perguntar(`Qual é o preço de ${name}?`);
        }
        if (store.services.some(s => semAcento(s.name) === semAcento(name))) {
          return informar(`Já existe um serviço chamado ${name}.`);
        }
        await store.addService({
          name,
          price: preco,
          duration: Number(duration) || 60
        });
        store.setActiveTab('more');
        return null;
      }

      case 'get_daily_summary': {
        const todayAppts = store.appointments.filter(a => a.date === hoje && a.status !== 'Cancelado');
        const revenue = store.transactions
          .filter(t => t.date === hoje && t.type === 'revenue')
          .reduce((sum, t) => sum + t.amount, 0);
        return informar(`Hoje: ${todayAppts.length} agendamento${todayAppts.length === 1 ? '' : 's'}. Total em vendas: R$ ${revenue.toFixed(2)}.`);
      }

      case 'show_dashboard_summary':
        store.setActiveTab('dashboard');
        return null;

      case 'search_client':
        store.setActiveTab('clients');
        return null;

      case 'show_financial_summary': {
        const monthStart = hoje.substring(0, 7) + '-01';
        const monthRevenue = store.transactions
          .filter(t => t.type === 'revenue' && t.date >= monthStart)
          .reduce((sum, t) => sum + t.amount, 0);
        const monthExpenses = store.transactions
          .filter(t => t.type === 'expense' && t.date >= monthStart)
          .reduce((sum, t) => sum + t.amount, 0);
        store.setActiveTab('financial');
        return informar(`Este mês: receitas R$ ${monthRevenue.toFixed(2)}, despesas R$ ${monthExpenses.toFixed(2)}, resultado R$ ${(monthRevenue - monthExpenses).toFixed(2)}.`);
      }

      case 'list_inactive_clients': {
        const thirtyDaysAgo = dataLocal(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const inactive = store.clients.filter(c => c.lastVisit && c.lastVisit < thirtyDaysAgo);
        store.setActiveTab('clients');
        return informar(inactive.length > 0
          ? `${inactive.length} sem visita há mais de 30 dias: ${inactive.slice(0, 3).map(c => c.name).join(', ')}${inactive.length > 3 ? '...' : ''}`
          : 'Ninguém está há mais de 30 dias sem visita.');
      }

      case 'update_client_notes': {
        const { clientName, notes } = data;
        if (!clientName || !notes) return perguntar('De quem é a observação, e o que devo anotar?');
        const { cliente, aviso } = acharCliente(clientName);
        if (!cliente) return aviso;
        await store.updateClient(cliente.id, {
          notes: cliente.notes ? `${cliente.notes}\n---\n${notes}` : notes
        });
        store.setActiveTab('clients');
        return informar(`Anotado no cadastro de ${cliente.name}.`);
      }

      case 'send_whatsapp': {
        const { clientName } = data;
        if (!clientName) return perguntar('Para quem devo abrir o WhatsApp?');
        const { cliente, aviso } = acharCliente(clientName);
        if (!cliente) return aviso;

        // Montava wa.me com os dígitos crus, sem o 55: "(11) 99999-8888"
        // virava wa.me/11999998888, que o WhatsApp lê como número dos EUA.
        const abriu = openWhatsApp(cliente.phone, `Olá ${cliente.name}! Passo para confirmar seu horário.`);
        return abriu ? null : informar(`${cliente.name} não tem um telefone válido no cadastro.`);
      }

      default:
        return null;
    }
  };

  return { parseCommand, executeCommand, getRoutineInsight };
}
