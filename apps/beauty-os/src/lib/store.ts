import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import { supabase, OperationType, handleSupabaseError } from './supabase';
import { logger } from './qa/logger';
import { perfMonitor } from './qa/performance';
import type { BusinessType } from './vertical';
import { dataLocal } from './utils';

export type AppointmentStatus = 'Confirmado' | 'Pendente' | 'Cancelado' | 'Concluído';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  spent: number;
  visits: number;
  lastVisit: string;
  birthDate?: string;
  tags: string[];
  isVIP: boolean;
  isFavorite: boolean;
  avatar?: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName?: string; // For public bookings
  clientPhone?: string; // For public bookings
  service: string;
  time: string;
  date: string;
  duration: number; // minutes
  status: AppointmentStatus;
  price: number;
  notes?: string;
}

/** Quando um cliente vira VIP. Só promove: ninguém perde o selo. */
const VISITAS_PARA_VIP = 5;
const GASTO_PARA_VIP = 500;

export interface Transaction {
  id: string;
  amount: number;
  type: 'revenue' | 'expense';
  category: string;
  date: string;
  description: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface AutomationTemplate {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  type: 'welcome' | 'confirmation' | 'reminder' | 'post_attendance' | 'birthday' | 'custom';
}

export interface Settings {
  studioName: string;
  location: string;
  currency: string;
  businessType: BusinessType;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'system' | 'financial';
  read: boolean;
  createdAt: string;
}

function fromSnakeCaseClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    spent: Number(row.spent) || 0,
    visits: row.visits || 0,
    lastVisit: row.last_visit ?? '',
    birthDate: row.birth_date ?? undefined,
    tags: row.tags ?? [],
    isVIP: row.is_vip,
    isFavorite: row.is_favorite,
    avatar: row.avatar ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function toSnakeCaseClient(updates: Partial<Client>) {
  const mapped: Record<string, unknown> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.email !== undefined) mapped.email = updates.email;
  if (updates.phone !== undefined) mapped.phone = updates.phone;
  if (updates.spent !== undefined) mapped.spent = updates.spent;
  if (updates.visits !== undefined) mapped.visits = updates.visits;
  // birth_date e last_visit são colunas date. O formulário manda '' quando
  // o campo fica em branco, e o Postgres recusa '' em date (22007): editar
  // qualquer cliente sem aniversário falhava com "Erro ao salvar".
  if (updates.lastVisit !== undefined) mapped.last_visit = updates.lastVisit || null;
  if (updates.birthDate !== undefined) mapped.birth_date = updates.birthDate || null;
  if (updates.tags !== undefined) mapped.tags = updates.tags;
  if (updates.isVIP !== undefined) mapped.is_vip = updates.isVIP;
  if (updates.isFavorite !== undefined) mapped.is_favorite = updates.isFavorite;
  if (updates.avatar !== undefined) mapped.avatar = updates.avatar;
  if (updates.notes !== undefined) mapped.notes = updates.notes;
  return mapped;
}

function fromSnakeCaseAppointment(row: any): Appointment {
  return {
    id: row.id,
    clientId: row.client_id ?? 'public-booking',
    clientName: row.client_name ?? undefined,
    clientPhone: row.client_phone ?? undefined,
    service: row.service,
    time: row.time,
    date: row.date,
    duration: row.duration,
    status: row.status,
    price: Number(row.price) || 0,
    notes: row.notes ?? undefined,
  };
}

function fromSnakeCaseTransaction(row: any): Transaction {
  return {
    id: row.id,
    amount: Number(row.amount) || 0,
    type: row.type,
    category: row.category,
    date: row.date,
    description: row.description,
  };
}

function fromSnakeCaseAutomation(row: any): AutomationTemplate {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    isActive: row.is_active,
    type: row.type,
  };
}

function fromSnakeCaseNotification(row: any): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: row.read,
    createdAt: row.criado_em,
  };
}

interface AppStore {
  activeTab: string;
  user: User | null;
  loading: boolean;
  clients: Client[];
  appointments: Appointment[];
  transactions: Transaction[];
  services: Service[];
  notifications: Notification[];
  automationTemplates: AutomationTemplate[];
  automationLogs: string[];
  settings: Settings;
  modalToOpen: 'appointment' | 'client' | 'revenue' | 'expense' | null;
  modalData: any | null;
  toast: { message: string, type: 'success' | 'error' } | null;
  isVoiceActive: boolean;
  /** True enquanto o usuário veio de um link de recuperação e ainda não definiu a senha nova. */
  isRecoveringPassword: boolean;

  themeAccent: string;
  themeBg: 'dark' | 'light';
  hasChosenTheme: boolean;
  hasOnboarded: boolean;
  /** True depois que a leitura de beautyos_settings terminou (com ou sem linha). */
  configLoaded: boolean;
  setTheme: (accent: string, bg: 'dark' | 'light') => void;
  setHasChosenTheme: (v: boolean) => void;
  setHasOnboarded: (v: boolean) => void;

  setActiveTab: (tab: string) => void;
  setModalToOpen: (modal: 'appointment' | 'client' | 'revenue' | 'expense' | null, data?: any) => void;
  setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
  setIsVoiceActive: (active: boolean) => void;
  setIsRecoveringPassword: (v: boolean) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;

  addClient: (client: Omit<Client, 'id' | 'spent' | 'visits' | 'lastVisit'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  addAppointment: (appointment: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addNotification: (notification: Omit<Notification, 'id'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  completeAppointment: (id: string) => Promise<void>;
  isSlotAvailable: (date: string, time: string, duration: number, excludeId?: string) => boolean;

  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, updates: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  updateAutomationTemplate: (id: string, updates: Partial<AutomationTemplate>) => Promise<void>;
  addAutomationLog: (logKey: string) => Promise<void>;
  updateUserAvatar: (arquivo: File) => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;

  getRevenueData: () => { value: number }[];
  getExpenseData: () => { value: number }[];
  getCategoryData: () => { name: string, value: number, color: string }[];
  getRevenueForecast: () => number;
  getSmartInsight: () => string;

  showDevTools: boolean;
  setShowDevTools: (show: boolean) => void;
}

/**
 * Tamanho máximo da foto escolhida, antes da redução. Foto de iPhone passa
 * fácil de 5 MB (o limite antigo) — a de 48 MP chega a 12 MB. O que vai para
 * o armazenamento é a versão reduzida, na casa dos 100 KB.
 */
export const TAMANHO_MAXIMO_FOTO = 20 * 1024 * 1024;

/** Mensagem de quando o aparelho não consegue abrir o formato da foto. */
export const ERRO_FORMATO_FOTO = 'Não consegui abrir essa imagem. Tente uma foto em JPG ou PNG.';

/** Reduz a imagem para no máximo `lado` pixels e devolve um JPEG leve. */
async function reduzirImagem(arquivo: File, lado: number): Promise<Blob> {
  // HEIC do iPhone só abre onde o navegador sabe decodificar (Safari recente).
  // Em outros, falha aqui — com uma mensagem que diz o que fazer.
  const bitmap = await createImageBitmap(arquivo).catch(() => {
    throw new Error(ERRO_FORMATO_FOTO);
  });
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d')!;
  // JPEG não tem transparência: sem um fundo, as áreas transparentes de um
  // logo em PNG — o formato mais comum para logo — saíam pretas.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Não foi possível ler a imagem'))), 'image/jpeg', 0.85)
  );
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => {
      let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
      const concluindo = new Set<string>();
      // Receita já lançada nesta sessão, por agendamento. Se a receita entra
      // e o passo seguinte falha, a nova tentativa não pode lançar de novo.
      const receitaLancada = new Set<string>();

      const stopListeners = () => {
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
      };

      // O Supabase devolve no máximo 1000 linhas por consulta. Sem paginar,
      // um negócio com um ano de lançamentos perdia o excedente sem aviso — e
      // como as transações vêm em ordem crescente de data, as que sumiam eram
      // justamente as mais recentes: o Financeiro congelava.
      const PAGINA = 1000;

      const fetchAndSet = async <T,>(
        table: string,
        empresaId: string,
        setter: (rows: T[]) => void,
        mapRow: (row: any) => T,
        orderColumn?: string,
      ) => {
        const linhas: any[] = [];
        for (let de = 0; ; de += PAGINA) {
          let q = supabase.from(table).select('*').eq('empresa_id', empresaId);
          if (orderColumn) q = q.order(orderColumn, { ascending: true });
          q = q.order('id', { ascending: true }).range(de, de + PAGINA - 1);
          const { data, error } = await q;
          if (error) { handleSupabaseError(error, OperationType.LIST, table); return; }
          linhas.push(...(data ?? []));
          if (!data || data.length < PAGINA) break;
        }
        setter(linhas.map(mapRow));
      };

      // A carga inicial não era esperada por ninguém: falhando, a rejeição
      // sumia e a tela mostrava listas vazias como se não houvesse dados.
      const carregar = (promessa: Promise<void>) =>
        promessa.catch(() => {
          set({ toast: { message: 'Não foi possível carregar tudo. Verifique a internet, feche e abra o app.', type: 'error' } });
        });

      const startListeners = (empresaId: string) => {
        stopListeners();

        carregar(fetchAndSet('beautyos_clients', empresaId, (rows: Client[]) => set({ clients: rows }), fromSnakeCaseClient));
        carregar(fetchAndSet('beautyos_appointments', empresaId, (rows: Appointment[]) => set({ appointments: rows }), fromSnakeCaseAppointment, 'time'));
        carregar(fetchAndSet('beautyos_transactions', empresaId, (rows: Transaction[]) => set({ transactions: rows }), fromSnakeCaseTransaction, 'date'));
        carregar(fetchAndSet('beautyos_services', empresaId, (rows: Service[]) => set({ services: rows }), (r) => ({ id: r.id, name: r.name, price: Number(r.price) || 0, duration: r.duration } as Service)));
        carregar(fetchAndSet('beautyos_automation_templates', empresaId, (rows: AutomationTemplate[]) => set({ automationTemplates: rows }), fromSnakeCaseAutomation));
        carregar(fetchAndSet('beautyos_notifications', empresaId, (rows: Notification[]) => set({ notifications: rows }), fromSnakeCaseNotification, 'criado_em'));
        // Os registros de automação nunca eram lidos. O aviso de aniversário
        // conferia "já tratei hoje?" numa lista sempre vazia e voltava a cada
        // 15 minutos, mesmo depois de Ignorar ou de mandar os parabéns.
        carregar(fetchAndSet('beautyos_automation_logs', empresaId, (rows: string[]) => set({ automationLogs: rows }), (r) => r.id as string));

        supabase.from('beautyos_settings').select('*').eq('empresa_id', empresaId).maybeSingle().then(({ data, error }) => {
          // Sem olhar o `error`, qualquer falha de leitura (rede oscilando, token
          // renovando) era lida como "não existe linha" e o negócio voltava a se
          // chamar "Meu Negócio" no vertical genérico. Pior: se a pessoa
          // mexesse em qualquer configuração nesse estado, o upsert gravava
          // esse nome falso por cima do real. Na falha, mantém o que já está.
          if (error) {
            console.error('Falha ao ler as configurações:', error.message);
            return;
          }
          if (data) {
            // O onboarding mora no localStorage do aparelho: num celular novo,
            // ou depois de sair e entrar, reaparecia para conta já configurada
            // começando em "Outro negócio", e quem só avançasse sobrescrevia
            // nome e tipo de negócio. Tema e cor também voltavam ao padrão.
            //
            // "Tem linha em beautyos_settings" não serve de sinal: o gatilho de
            // cadastro cria a linha junto com a conta. O sinal é onboarded_at,
            // gravado quando o onboarding termina (migration 0015).
            //
            // Só na primeira leitura da sessão. O auth emite SIGNED_IN a cada
            // volta do app ao primeiro plano, e isso fecharia no meio o
            // "Refazer configuração inicial" de quem saiu para copiar algo.
            const primeiraLeitura = !get().configLoaded;
            set({
              settings: { studioName: data.studio_name, location: data.location, currency: data.currency, businessType: (data.business_type ?? 'generic') as BusinessType },
              ...(primeiraLeitura && data.onboarded_at ? {
                hasOnboarded: true,
                hasChosenTheme: true,
                ...(data.theme_accent ? { themeAccent: data.theme_accent } : {}),
                ...(data.theme_bg === 'light' || data.theme_bg === 'dark' ? { themeBg: data.theme_bg as 'light' | 'dark' } : {}),
              } : {}),
              configLoaded: true,
            });
          } else {
            const defaults: Settings = { studioName: 'Meu Negócio', location: 'São Paulo, BR', currency: 'BRL', businessType: 'generic' };
            set({ settings: defaults, configLoaded: true });
          }
        });

        realtimeChannel = supabase
          .channel(`empresa-${empresaId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'beautyos_clients', filter: `empresa_id=eq.${empresaId}` },
            () => fetchAndSet('beautyos_clients', empresaId, (rows: Client[]) => set({ clients: rows }), fromSnakeCaseClient))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'beautyos_appointments', filter: `empresa_id=eq.${empresaId}` },
            () => fetchAndSet('beautyos_appointments', empresaId, (rows: Appointment[]) => set({ appointments: rows }), fromSnakeCaseAppointment, 'time'))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'beautyos_transactions', filter: `empresa_id=eq.${empresaId}` },
            () => fetchAndSet('beautyos_transactions', empresaId, (rows: Transaction[]) => set({ transactions: rows }), fromSnakeCaseTransaction, 'date'))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'beautyos_notifications', filter: `empresa_id=eq.${empresaId}` },
            () => fetchAndSet('beautyos_notifications', empresaId, (rows: Notification[]) => set({ notifications: rows }), fromSnakeCaseNotification, 'criado_em'))
          // Serviços e automações também precisam escutar: sem isto, cadastrar
          // ou apagar um serviço mostrava o toast de sucesso mas a lista não
          // mudava, e a pessoa repetia a operação achando que não tinha salvo.
          .on('postgres_changes', { event: '*', schema: 'public', table: 'beautyos_services', filter: `empresa_id=eq.${empresaId}` },
            () => fetchAndSet('beautyos_services', empresaId, (rows: Service[]) => set({ services: rows }), (r) => ({ id: r.id, name: r.name, price: Number(r.price) || 0, duration: r.duration } as Service)))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'beautyos_automation_templates', filter: `empresa_id=eq.${empresaId}` },
            () => fetchAndSet('beautyos_automation_templates', empresaId, (rows: AutomationTemplate[]) => set({ automationTemplates: rows }), fromSnakeCaseAutomation))
          .subscribe();
      };

      supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null;
        // O link de recuperação autentica a pessoa e devolve ela ao app. Sem
        // marcar esse estado, ela cairia direto no Dashboard e nunca chegaria
        // a definir a senha nova — ficando trancada na próxima vez.
        if (_event === 'PASSWORD_RECOVERY') set({ isRecoveringPassword: true });
        set({ user, loading: false });
        if (user) {
          startListeners(user.id);
        } else {
          // Limpa TUDO do dono anterior. Antes sobravam serviços, notificações
          // (com nome de cliente), templates e o nome do negócio na tela — e
          // quem entrasse em seguida na mesma aba via os dados de quem saiu.
          stopListeners();
          set({
            clients: [], appointments: [], transactions: [],
            services: [], notifications: [], automationTemplates: [], automationLogs: [],
            settings: { studioName: 'Meu Negócio', location: 'São Paulo, BR', currency: 'BRL', businessType: 'generic' },
            // hasOnboarded fica no localStorage do aparelho, não da conta. Sem
            // zerar aqui, a segunda pessoa a entrar no mesmo navegador pula o
            // questionário e fica no vertical genérico sem nunca escolher.
            hasOnboarded: false,
            hasChosenTheme: false,
            configLoaded: false,
          });
        }
      });

      return {
        activeTab: 'dashboard',
        user: null,
        loading: true,
        clients: [],
        appointments: [],
        transactions: [],
        services: [],
        notifications: [],
        automationTemplates: [],
        automationLogs: [],
        settings: {
          studioName: 'Meu Negócio',
          location: 'São Paulo, BR',
          currency: 'BRL',
          businessType: 'generic'
        },
        modalToOpen: null,
        modalData: null,
        toast: null,
        showDevTools: false,
        setShowDevTools: (show) => set({ showDevTools: show }),
        isVoiceActive: false,
        isRecoveringPassword: false,
        themeAccent: '#D4AF37',
        themeBg: 'dark',
        hasChosenTheme: false,
        hasOnboarded: false,
        configLoaded: false,
        setTheme: (accent, bg) => {
          set({ themeAccent: accent, themeBg: bg });
          const { user } = get();
          if (user) {
            supabase.from('beautyos_settings').upsert({
              empresa_id: user.id,
              theme_accent: accent,
              theme_bg: bg,
            }).then(() => {});
          }
        },
        setHasChosenTheme: (v) => set({ hasChosenTheme: v }),
        setHasOnboarded: (v) => {
          set({ hasOnboarded: v });
          const { user } = get();
          // Grava no banco que o onboarding terminou, para outro aparelho
          // saber que esta conta já foi configurada.
          if (v && user) {
            supabase.from('beautyos_settings')
              .update({ onboarded_at: new Date().toISOString() })
              .eq('empresa_id', user.id)
              .then(({ error }) => {
                if (error) console.error('Falha ao registrar onboarding:', error.message);
              });
          }
        },
        setToast: (toast) => set({ toast }),
        setIsVoiceActive: (active) => set({ isVoiceActive: active }),
        setIsRecoveringPassword: (v) => set({ isRecoveringPassword: v }),

        setActiveTab: (tab) => set({ activeTab: tab }),
        setModalToOpen: (modal, data = null) => set({ modalToOpen: modal, modalData: data }),
        setUser: (user) => set({ user }),
        setLoading: (loading) => set({ loading }),

        addClient: async (client) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_clients').insert({
              empresa_id: user.id,
              name: client.name,
              email: client.email,
              phone: client.phone,
              tags: client.tags,
              notes: client.notes ?? null,
              // O formulário pedia a data de nascimento e o insert a jogava
              // fora: o aviso de aniversário nunca disparava para ninguém
              // cadastrado pelo app.
              birth_date: client.birthDate || null,
              spent: 0,
              visits: 0,
              // Sem visita ainda. Antes nascia com a data de hoje e a lista
              // mostrava "Última visita: hoje" para quem nunca veio.
              last_visit: null,
              is_vip: false,
              is_favorite: false,
            });
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'beautyos_clients');
          }
        },

        updateClient: async (id, updates) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_clients').update(toSnakeCaseClient(updates)).eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `beautyos_clients/${id}`);
          }
        },

        toggleFavorite: async (id) => {
          const client = get().clients.find(c => c.id === id);
          if (client) {
            await get().updateClient(id, { isFavorite: !client.isFavorite });
          }
        },

        deleteClient: async (id) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_clients').delete().eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
            set(s => ({ clients: s.clients.filter(x => x.id !== id) }));
          } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `beautyos_clients/${id}`);
          }
        },

        addAppointment: async (appointment) => {
          const { user, clients, addNotification } = get();
          if (!user) return;

          try {
            if (!get().isSlotAvailable(appointment.date, appointment.time, appointment.duration)) {
              get().setToast({ message: "Conflito de horário! Este slot já está ocupado ou sobrepõe outro agendamento.", type: 'error' });
              logger.warn('Booking', 'Tentativa de agendamento em horário ocupado ou sobreposto', { date: appointment.date, time: appointment.time });
              return;
            }

            let finalClientId = appointment.clientId;

            if (appointment.clientId === 'public-booking' || !appointment.clientId) {
              // Sem telefone não há como casar: '' === '' ligava o
              // agendamento de uma pessoa nova ao primeiro cliente sem
              // telefone da base, com o nome de outra pessoa.
              const existingClient = appointment.clientPhone
                ? clients.find(c => c.phone && c.phone === appointment.clientPhone)
                : undefined;
              if (existingClient) {
                finalClientId = existingClient.id;
              } else if (appointment.clientName && appointment.clientPhone) {
                const { data: newClient, error: clientError } = await supabase
                  .from('beautyos_clients')
                  .insert({
                    empresa_id: user.id,
                    name: appointment.clientName,
                    phone: appointment.clientPhone,
                    email: '',
                    spent: 0,
                    visits: 0,
                    last_visit: null,
                    is_vip: false,
                    is_favorite: false,
                    tags: ['Novo'],
                  })
                  .select()
                  .single();
                if (clientError) throw clientError;
                finalClientId = newClient.id;
              }
            }

            const startTime = performance.now();
            const { error } = await supabase.from('beautyos_appointments').insert({
              empresa_id: user.id,
              client_id: finalClientId === 'public-booking' ? null : finalClientId,
              client_name: appointment.clientName,
              client_phone: appointment.clientPhone,
              service: appointment.service,
              time: appointment.time,
              date: appointment.date,
              duration: appointment.duration,
              status: appointment.status,
              price: appointment.price,
              notes: appointment.notes ?? null,
            });
            if (error) throw error;
            perfMonitor.recordFirebaseLatency(performance.now() - startTime);
            logger.info('Booking', 'Agendamento criado com sucesso', { client: appointment.clientName, service: appointment.service });

            await addNotification({
              title: 'Novo agendamento',
              message: `${appointment.service} em ${new Date(appointment.date + 'T12:00:00').toLocaleDateString()} às ${appointment.time}`,
              type: 'booking',
              read: false,
              createdAt: new Date().toISOString(),
            });

            get().setToast({ message: "Agendamento realizado com sucesso!", type: 'success' });
          } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'beautyos_appointments');
          }
        },

        updateAppointment: async (id, updates) => {
          const { user, appointments } = get();
          if (!user) return;

          if (updates.date || updates.time || updates.duration) {
            const current = appointments.find(a => a.id === id);
            if (current) {
              const date = updates.date || current.date;
              const time = updates.time || current.time;
              const duration = updates.duration || current.duration;

              if (!get().isSlotAvailable(date, time, duration, id)) {
                get().setToast({ message: "Conflito de horário! O novo horário já está ocupado.", type: 'error' });
                return;
              }
            }
          }

          try {
            const payload: Record<string, unknown> = {};
            if (updates.clientId !== undefined) payload.client_id = updates.clientId === 'public-booking' ? null : updates.clientId;
            if (updates.clientName !== undefined) payload.client_name = updates.clientName;
            if (updates.clientPhone !== undefined) payload.client_phone = updates.clientPhone;
            if (updates.service !== undefined) payload.service = updates.service;
            if (updates.time !== undefined) payload.time = updates.time;
            if (updates.date !== undefined) payload.date = updates.date;
            if (updates.duration !== undefined) payload.duration = updates.duration;
            if (updates.status !== undefined) payload.status = updates.status;
            if (updates.price !== undefined) payload.price = updates.price;
            if (updates.notes !== undefined) payload.notes = updates.notes;

            const { error } = await supabase.from('beautyos_appointments').update(payload).eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `beautyos_appointments/${id}`);
          }
        },

        updateAppointmentStatus: async (id, status) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_appointments').update({ status }).eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `beautyos_appointments/${id}`);
          }
        },

        deleteAppointment: async (id) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_appointments').delete().eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
            set(s => ({ appointments: s.appointments.filter(x => x.id !== id) }));
          } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `beautyos_appointments/${id}`);
          }
        },

        addTransaction: async (transaction) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_transactions').insert({
              empresa_id: user.id,
              amount: transaction.amount,
              type: transaction.type,
              category: transaction.category,
              date: transaction.date,
              description: transaction.description,
            });
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'beautyos_transactions');
          }
        },

        deleteTransaction: async (id) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_transactions').delete().eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
            set(s => ({ transactions: s.transactions.filter(x => x.id !== id) }));
          } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `beautyos_transactions/${id}`);
          }
        },

        addNotification: async (notification) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_notifications').insert({
              empresa_id: user.id,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              read: notification.read,
            });
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'beautyos_notifications');
          }
        },

        markNotificationAsRead: async (id) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_notifications').update({ read: true }).eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `beautyos_notifications/${id}`);
          }
        },

        deleteNotification: async (id) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_notifications').delete().eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
            set(s => ({ notifications: s.notifications.filter(x => x.id !== id) }));
          } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `beautyos_notifications/${id}`);
          }
        },

        completeAppointment: async (id) => {
          const { user, appointments, updateAppointmentStatus, addTransaction, updateClient, addNotification } = get();
          if (!user) return;

          const appointment = appointments.find(a => a.id === id);
          if (!appointment || appointment.status === 'Concluído') return;

          // O status local só muda quando o realtime devolve a atualização,
          // depois de quatro requisições. Um segundo toque nesse intervalo
          // passava pela checagem acima e lançava a receita de novo.
          if (concluindo.has(id)) return;
          concluindo.add(id);

          try {
            // A receita entra ANTES de marcar como concluído. Na ordem inversa,
            // uma falha aqui deixava o atendimento "Concluído" sem o dinheiro
            // lançado — e o botão de concluir some depois disso, então não havia
            // como refazer. Falhando primeiro, o agendamento continua
            // "Confirmado" e a pessoa pode tentar de novo.
            // Tentar de novo depois de "Erro ao concluir" lançava a receita
            // outra vez: ela tinha entrado e só o passo seguinte falhara.
            const descricao = `Conclusão: ${appointment.service} - ${appointment.clientName || 'Cliente'}`;
            const jaLancada = receitaLancada.has(id) || get().transactions.some(t =>
              t.type === 'revenue' && t.date === appointment.date && t.description === descricao && t.amount === appointment.price
            );
            if (!jaLancada) {
              await addTransaction({
                amount: appointment.price,
                type: 'revenue',
                category: 'Serviço',
                date: appointment.date,
                description: descricao,
              });
              receitaLancada.add(id);
            }

            await updateAppointmentStatus(id, 'Concluído');

            if (appointment.clientId && appointment.clientId !== 'public-booking') {
              const client = get().clients.find(c => c.id === appointment.clientId);
              if (client) {
                const visitas = (client.visits || 0) + 1;
                const gasto = (client.spent || 0) + appointment.price;

                await updateClient(appointment.clientId, {
                  spent: gasto,
                  visits: visitas,
                  lastVisit: appointment.date,
                  // VIP é conquista, não estado recalculado. Antes eram duas
                  // regras em telas diferentes: a de Clientes promovia por
                  // gasto e esta rebaixava por visita, então quem passava dos
                  // R$ 500 com menos de cinco visitas perdia o VIP no
                  // atendimento seguinte, sem nada na tela explicando.
                  isVIP: client.isVIP || visitas >= VISITAS_PARA_VIP || gasto >= GASTO_PARA_VIP,
                });
              }
            }

            await addNotification({
              title: 'Atendimento concluído',
              message: `Financeiro atualizado: +R$ ${appointment.price}`,
              type: 'financial',
              read: false,
              createdAt: new Date().toISOString(),
            });

            get().setToast({ message: "Atendimento concluído e registrado!", type: 'success' });
          } catch (error) {
            // Relança: sem isto o erro morria aqui, o modal fechava e a pessoa
            // acreditava que deu certo. Quem chama (Agenda.tsx) já tem catch
            // que mostra "Erro ao concluir".
            console.error('Error completing appointment:', error instanceof Error ? error.message : 'unknown error');
            throw error;
          } finally {
            concluindo.delete(id);
          }
        },

        isSlotAvailable: (date, time, duration, excludeId) => {
          const { appointments } = get();

          const timeToMinutes = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
          };

          const newStart = timeToMinutes(time);
          const newEnd = newStart + duration;

          return !appointments.some(a => {
            if (a.date !== date || a.status === 'Cancelado' || a.id === excludeId) return false;

            const existingStart = timeToMinutes(a.time);
            const existingEnd = existingStart + (a.duration || 60);

            return newStart < existingEnd && newEnd > existingStart;
          });
        },

        addService: async (service) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_services').insert({ empresa_id: user.id, name: service.name, price: service.price, duration: service.duration });
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'beautyos_services');
          }
        },

        updateService: async (id, updates) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_services').update(updates).eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `beautyos_services/${id}`);
          }
        },

        deleteService: async (id) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_services').delete().eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
            set(s => ({ services: s.services.filter(x => x.id !== id) }));
          } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `beautyos_services/${id}`);
          }
        },

        updateAutomationTemplate: async (id, updates) => {
          const user = get().user;
          if (!user) return;
          try {
            const payload: Record<string, unknown> = {};
            if (updates.title !== undefined) payload.title = updates.title;
            if (updates.message !== undefined) payload.message = updates.message;
            if (updates.isActive !== undefined) payload.is_active = updates.isActive;
            if (updates.type !== undefined) payload.type = updates.type;
            const { error } = await supabase.from('beautyos_automation_templates').update(payload).eq('id', id).eq('empresa_id', user.id);
            if (error) throw error;
            // Aplica já. Esperando o realtime, o texto salvo voltava por um
            // instante ao antigo — e com o canal reconectando, ficava.
            set(s => ({ automationTemplates: s.automationTemplates.map(t => t.id === id ? { ...t, ...updates } : t) }));
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `beautyos_automation_templates/${id}`);
          }
        },

        addAutomationLog: async (logKey) => {
          const user = get().user;
          if (!user) return;
          try {
            const { error } = await supabase.from('beautyos_automation_logs').upsert({ id: logKey, empresa_id: user.id, sent_at: new Date().toISOString() });
            if (error) throw error;
            set(s => ({ automationLogs: s.automationLogs.includes(logKey) ? s.automationLogs : [...s.automationLogs, logKey] }));
          } catch (error) {
            handleSupabaseError(error, OperationType.WRITE, `beautyos_automation_logs/${logKey}`);
          }
        },

        // O logo ia como data URL base64 para o user_metadata, que viaja
        // dentro de todo token de acesso. Uma conta em produção estava com
        // 174 KB de metadata: centenas de KB no cabeçalho de cada requisição,
        // acima do que os proxies aceitam. E o erro era engolido aqui, então
        // a tela dizia "Logo atualizado" mesmo quando falhava.
        //
        // Agora a imagem é reduzida no aparelho, sobe para o Storage e só a
        // URL vai para o metadata e para beautyos_settings, de onde a página
        // pública de agendamento lê.
        updateUserAvatar: async (arquivo) => {
          const user = get().user;
          if (!user) return;
          // Fora do try: erro de formato chega à tela com a própria mensagem,
          // em vez de virar o aviso genérico de falha ao salvar.
          const imagem = await reduzirImagem(arquivo, 512);
          try {
            const caminho = `${user.id}/logo-${Date.now()}.jpg`;
            const { error: erroUpload } = await supabase.storage
              .from('beautyos-logos')
              .upload(caminho, imagem, { contentType: 'image/jpeg' });
            if (erroUpload) throw erroUpload;

            const { data: publico } = supabase.storage.from('beautyos-logos').getPublicUrl(caminho);
            const url = publico.publicUrl;

            const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: url } });
            if (error) throw error;
            if (data.user) set({ user: data.user });

            // A página pública lê daqui. Falhando, o logo aparecia no app mas
            // não para o cliente, e a tela dizia que tinha dado certo.
            const { error: erroSettings } = await supabase.from('beautyos_settings').update({ avatar_url: url }).eq('empresa_id', user.id);
            if (erroSettings) throw erroSettings;
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, 'avatar');
          }
        },

        updateSettings: async (updates) => {
          const { user, settings } = get();
          if (!user) return;
          const newSettings = { ...settings, ...updates };

          // Aplica localmente antes de sincronizar: se a gravação falhar, a
          // tela ainda reflete o que o usuário escolheu, em vez de reverter
          // silenciosamente para o valor antigo.
          set({ settings: newSettings });

          try {
            const { themeAccent, themeBg } = get();
            const { error } = await supabase.from('beautyos_settings').upsert({
              empresa_id: user.id,
              studio_name: newSettings.studioName,
              location: newSettings.location,
              currency: newSettings.currency,
              business_type: newSettings.businessType,
              theme_accent: themeAccent,
              theme_bg: themeBg,
            });
            if (error) throw error;
          } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, 'beautyos_settings');
          }
        },

        getRevenueData: () => {
          const transactions = get().transactions.filter(t => t.type === 'revenue');
          if (transactions.length === 0) return Array(8).fill({ value: 0 });
          return transactions.map(t => ({ value: t.amount }));
        },

        getExpenseData: () => {
          const transactions = get().transactions.filter(t => t.type === 'expense');
          if (transactions.length === 0) return Array(5).fill({ value: 0 });
          return transactions.map(t => ({ value: t.amount }));
        },

        getCategoryData: () => {
          const transactions = get().transactions.filter(t => t.type === 'expense');
          const categories: Record<string, number> = {};
          transactions.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + t.amount;
          });
          const total = Object.values(categories).reduce((a, b) => a + b, 0);
          const colors = ['#00E6FF', '#7B61FF', '#FF6B9D', '#FF8A5B'];
          return Object.entries(categories).map(([name, value], i) => ({
            name,
            value: Math.round((value / total) * 100) || 0,
            color: colors[i % colors.length]
          }));
        },

        getRevenueForecast: () => {
          const appointments = get().appointments;
          const today = dataLocal();

          // "Projeção/Mês" somava todos os agendamentos futuros, inclusive os
          // de meses seguintes.
          const mes = today.slice(0, 7);
          return appointments
            .filter(a => a.date >= today && a.date.slice(0, 7) === mes && (a.status === 'Confirmado' || a.status === 'Pendente'))
            .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
        },

        getSmartInsight: () => {
          const transactions = get().transactions;
          const appointments = get().appointments;

          if (transactions.length === 0 && appointments.length === 0) {
            return "Dica: Comece registrando suas primeiras clientes e agendamentos para ver insights aqui!";
          }

          const revenue = transactions.filter(t => t.type === 'revenue').reduce((acc, curr) => acc + curr.amount, 0);
          const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
          const count = appointments.length;

          if (revenue > expenses * 2) {
            return "Excelente! Seu lucro está acima de 50%. Momento ideal para reinvestir em novos equipamentos.";
          }
          if (expenses > revenue) {
            return "Atenção: Suas despesas superaram as receitas este mês. Revise seus custos fixos.";
          }
          if (count > 10) {
            return "Sua agenda está aquecida! Que tal criar um programa de fidelidade para suas clientes VIP?";
          }

          return "Mantenha o ritmo! Registre todos os atendimentos para uma análise financeira precisa.";
        }
      };
    },
    {
      name: 'leshanot-storage',
      partialize: (state) => ({
        themeAccent: state.themeAccent,
        themeBg: state.themeBg,
        hasChosenTheme: state.hasChosenTheme,
        hasOnboarded: state.hasOnboarded,
      })
    }
  )
);
