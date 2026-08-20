import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { logger } from './qa/logger';
import { perfMonitor } from './qa/performance';

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
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'system' | 'financial';
  read: boolean;
  createdAt: string;
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
  
  // Actions
  setActiveTab: (tab: string) => void;
  setModalToOpen: (modal: 'appointment' | 'client' | 'revenue' | 'expense' | null, data?: any) => void;
  setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
  setIsVoiceActive: (active: boolean) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  
  // Firebase Operations
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

  // Cross-module logic
  completeAppointment: (id: string) => Promise<void>;
  isSlotAvailable: (date: string, time: string, duration: number, excludeId?: string) => boolean;

  addService: (service: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, updates: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  updateAutomationTemplate: (id: string, updates: Partial<AutomationTemplate>) => Promise<void>;
  addAutomationLog: (logKey: string) => Promise<void>;
  updateUserAvatar: (photoURL: string) => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  
  // Queries
  getRevenueData: () => { value: number }[];
  getExpenseData: () => { value: number }[];
  getCategoryData: () => { name: string, value: number, color: string }[];
  getRevenueForecast: () => number;
  getSmartInsight: () => string;
  
  // QA System
  showDevTools: boolean;
  setShowDevTools: (show: boolean) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => {
      // Listeners state
      let clientsUnsubscribe: (() => void) | null = null;
      let appointmentsUnsubscribe: (() => void) | null = null;
      let transactionsUnsubscribe: (() => void) | null = null;
      let servicesUnsubscribe: (() => void) | null = null;
      let automationUnsubscribe: (() => void) | null = null;
      let logsUnsubscribe: (() => void) | null = null;
      let settingsUnsubscribe: (() => void) | null = null;

      const stopListeners = () => {
        clientsUnsubscribe?.();
        appointmentsUnsubscribe?.();
        transactionsUnsubscribe?.();
        servicesUnsubscribe?.();
        automationUnsubscribe?.();
        logsUnsubscribe?.();
        settingsUnsubscribe?.();
        clientsUnsubscribe = null;
        appointmentsUnsubscribe = null;
        transactionsUnsubscribe = null;
        servicesUnsubscribe = null;
        automationUnsubscribe = null;
        logsUnsubscribe = null;
        settingsUnsubscribe = null;
      };

      const startListeners = (userId: string) => {
        stopListeners();

        const notificationsPath = `users/${userId}/notifications`;
        onSnapshot(query(collection(db, notificationsPath), orderBy('createdAt', 'desc')), (snapshot) => {
          const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
          set({ notifications });
        }, (error) => handleFirestoreError(error, OperationType.LIST, notificationsPath));

        const settingsPath = `users/${userId}/settings`;
        settingsUnsubscribe = onSnapshot(doc(db, settingsPath, 'general'), (snapshot) => {
          if (snapshot.exists()) {
            set({ settings: snapshot.data() as Settings });
          } else {
            const defaults = {
              studioName: 'Leshanot Studio',
              location: 'São Paulo, BR',
              currency: 'BRL'
            };
            setDoc(doc(db, settingsPath, 'general'), defaults);
            set({ settings: defaults });
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, settingsPath));

        const clientsPath = `users/${userId}/clients`;
        clientsUnsubscribe = onSnapshot(collection(db, clientsPath), (snapshot) => {
          const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
          set({ clients });
        }, (error) => handleFirestoreError(error, OperationType.LIST, clientsPath));

        const appointmentsPath = `users/${userId}/appointments`;
        appointmentsUnsubscribe = onSnapshot(query(collection(db, appointmentsPath), orderBy('time', 'asc')), (snapshot) => {
          const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
          set({ appointments });
        }, (error) => handleFirestoreError(error, OperationType.LIST, appointmentsPath));

        const transactionsPath = `users/${userId}/transactions`;
        transactionsUnsubscribe = onSnapshot(query(collection(db, transactionsPath), orderBy('date', 'desc')), (snapshot) => {
          const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
          set({ transactions });
        }, (error) => handleFirestoreError(error, OperationType.LIST, transactionsPath));

        const servicesPath = `users/${userId}/services`;
        servicesUnsubscribe = onSnapshot(collection(db, servicesPath), (snapshot) => {
          const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
          set({ services });
          // If no services, add some defaults
          if (services.length === 0) {
            const defaults = [
              { name: 'Design de Sobrancelhas', price: 50, duration: 40 },
              { name: 'Extensão de Cílios', price: 150, duration: 120 }
            ];
            defaults.forEach(s => addDoc(collection(db, servicesPath), s));
          }
        }, (error) => handleFirestoreError(error, OperationType.LIST, servicesPath));

        const automationPath = `users/${userId}/automation`;
        automationUnsubscribe = onSnapshot(collection(db, automationPath), (snapshot) => {
          const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationTemplate));
          set({ automationTemplates: templates });
          
          if (templates.length === 0) {
            const defaults: Omit<AutomationTemplate, 'id'>[] = [
              { type: 'welcome', title: 'Boas-vindas', isActive: true, message: '{{saudacao}}, {{nome}} ✨\nSeja bem-vinda ao LESHANOT STUDIO.\nFicamos felizes em ter você como nossa cliente.' },
              { type: 'confirmation', title: 'Confirmação', isActive: true, message: '{{saudacao}}, {{nome}} ✨\nSeu agendamento para {{servico}} foi confirmado com sucesso.\n\n📅 {{data}}\n⏰ {{hora}}\n\nEstamos te esperando.' },
              { type: 'reminder', title: 'Lembrete', isActive: true, message: '{{saudacao}}, {{nome}} ✨\nPassando para lembrar seu horário amanhã às {{hora}}.\n\nAté breve 💛' },
              { type: 'post_attendance', title: 'Pós-atendimento', isActive: true, message: 'Obrigada pela sua visita, {{nome}} ✨\nEsperamos que tenha tido uma ótima experiência.\n\nSeu feedback é muito importante para nós.' },
              { type: 'birthday', title: 'Aniversário', isActive: true, message: 'Feliz aniversário, {{nome}} 🎉✨\n\nDesejamos um novo ciclo cheio de luz, beleza e prosperidade.\n\nCom carinho,\n{{empresa}}' },
              { type: 'custom', title: 'Mensagem Personalizada', isActive: true, message: 'Olá, {{nome}} ✨\n\n[Sua mensagem aqui]\n\nAtenciosamente,\n{{empresa}}' }
            ];
            defaults.forEach(t => addDoc(collection(db, automationPath), t));
          }
        }, (error) => handleFirestoreError(error, OperationType.LIST, automationPath));

        const logsPath = `users/${userId}/automation_logs`;
        logsUnsubscribe = onSnapshot(collection(db, logsPath), (snapshot) => {
          const logs = snapshot.docs.map(doc => doc.id);
          set({ automationLogs: logs });
        }, (error) => handleFirestoreError(error, OperationType.LIST, logsPath));
      };

      // Auth Listener
      onAuthStateChanged(auth, (user) => {
        set({ user, loading: false });
        if (user) {
          startListeners(user.uid);
        } else {
          stopListeners();
          set({ clients: [], appointments: [], transactions: [] });
        }
      }, (error) => {
        console.error('Auth state change error:', error);
        set({ loading: false });
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
          studioName: 'Leshanot Studio',
          location: 'São Paulo, BR',
          currency: 'BRL'
        },
        modalToOpen: null,
        modalData: null,
        toast: null,
        showDevTools: false,
        setShowDevTools: (show) => set({ showDevTools: show }),
        isVoiceActive: false,
        setToast: (toast) => set({ toast }),
        setIsVoiceActive: (active) => set({ isVoiceActive: active }),

        setActiveTab: (tab) => set({ activeTab: tab }),
        setModalToOpen: (modal, data = null) => set({ modalToOpen: modal, modalData: data }),
        setUser: (user) => set({ user }),
        setLoading: (loading) => set({ loading }),

        addClient: async (client) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/clients`;
          try {
            await addDoc(collection(db, path), {
              ...client,
              spent: 0,
              visits: 0,
              lastVisit: new Date().toISOString().split('T')[0],
              isVIP: false,
              isFavorite: false
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
          }
        },

        updateClient: async (id, updates) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/clients/${id}`;
          try {
            await updateDoc(doc(db, path), updates);
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
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
          const path = `users/${user.uid}/clients/${id}`;
          try {
            await deleteDoc(doc(db, path));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
          }
        },

        addAppointment: async (appointment) => {
          const { user, clients, appointments, addClient, addNotification } = get();
          if (!user) return;
          
          const path = `users/${user.uid}/appointments`;
          const startTime = performance.now();
          try {
            // 1. Conflict detection
            if (!get().isSlotAvailable(appointment.date, appointment.time, appointment.duration)) {
              get().setToast({ message: "Conflito de horário! Este slot já está ocupado ou sobrepõe outro agendamento.", type: 'error' });
              logger.warn('Booking', 'Tentativa de agendamento em horário ocupado ou sobreposto', { date: appointment.date, time: appointment.time });
              throw new Error("Horário ocupado");
            }

            // 2. Client linking logic
            let finalClientId = appointment.clientId;
            
            // If it's a public booking or missing ID, look for client by phone
            if (appointment.clientId === 'public-booking' || !appointment.clientId) {
              const existingClient = clients.find(c => c.phone === appointment.clientPhone);
              if (existingClient) {
                finalClientId = existingClient.id;
              } else if (appointment.clientName && appointment.clientPhone) {
                // Create new client automatically
                const clientsPath = `users/${user.uid}/clients`;
                const clientRef = await addDoc(collection(db, clientsPath), {
                  name: appointment.clientName,
                  phone: appointment.clientPhone,
                  email: '',
                  spent: 0,
                  visits: 0,
                  lastVisit: appointment.date,
                  isVIP: false,
                  isFavorite: false,
                  tags: ['Novo'],
                  createdAt: new Date().toISOString()
                });
                finalClientId = clientRef.id;
              }
            }

            // 3. Save appointment with linked client
            const appointmentToSave = {
              ...appointment,
              clientId: finalClientId,
              createdAt: new Date().toISOString()
            };
            
            await addDoc(collection(db, path), appointmentToSave);
            perfMonitor.recordFirebaseLatency(performance.now() - startTime);
            logger.info('Booking', 'Agendamento criado com sucesso', { client: appointment.clientName, service: appointment.service });

            // 4. Send notification
            await addNotification({
              title: 'Novo agendamento',
              message: `${appointment.service} em ${new Date(appointment.date + 'T12:00:00').toLocaleDateString()} às ${appointment.time}`,
              type: 'booking',
              read: false,
              createdAt: new Date().toISOString()
            });

            get().setToast({ message: "Agendamento realizado com sucesso!", type: 'success' });
          } catch (error) {
            if (error instanceof Error && error.message === "Horário ocupado") return;
            handleFirestoreError(error, OperationType.CREATE, path);
          }
        },

        completeAppointment: async (id) => {
          const { user, appointments, updateAppointmentStatus, addTransaction, updateClient, addNotification } = get();
          if (!user) return;

          const appointment = appointments.find(a => a.id === id);
          if (!appointment || appointment.status === 'Concluído') return;

          try {
            // 1. Update status
            await updateAppointmentStatus(id, 'Concluído');

            // 2. Create revenue transaction
            await addTransaction({
              amount: appointment.price,
              type: 'revenue',
              category: 'Serviço',
              date: appointment.date,
              description: `Conclusão: ${appointment.service} - ${appointment.clientName || 'Cliente'}`
            });

            // 3. Update client stats
            if (appointment.clientId && appointment.clientId !== 'public-booking') {
              const client = get().clients.find(c => c.id === appointment.clientId);
              if (client) {
                await updateClient(appointment.clientId, {
                  spent: (client.spent || 0) + appointment.price,
                  visits: (client.visits || 0) + 1,
                  lastVisit: appointment.date,
                  isVIP: (client.visits || 0) + 1 >= 5 // Automatic VIP status
                });
              }
            }

            // 4. Trigger post-attendance notification
            await addNotification({
              title: 'Atendimento concluído',
              message: `Financeiro atualizado: +R$ ${appointment.price}`,
              type: 'financial',
              read: false,
              createdAt: new Date().toISOString()
            });

            get().setToast({ message: "Atendimento concluído e registrado!", type: 'success' });
          } catch (error) {
            console.error('Error completing appointment:', error);
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

            // Overlap condition
            return newStart < existingEnd && newEnd > existingStart;
          });
        },

        updateAppointment: async (id, updates) => {
          const { user, appointments } = get();
          if (!user) return;

          // If date, time or duration is being updated, check for conflicts
          if (updates.date || updates.time || updates.duration) {
            const current = appointments.find(a => a.id === id);
            if (current) {
              const date = updates.date || current.date;
              const time = updates.time || current.time;
              const duration = updates.duration || current.duration;
              
              if (!get().isSlotAvailable(date, time, duration, id)) {
                get().setToast({ message: "Conflito de horário! O novo horário já está ocupado.", type: 'error' });
                throw new Error("Horário ocupado");
              }
            }
          }

          const path = `users/${user.uid}/appointments/${id}`;
          try {
            await updateDoc(doc(db, path), updates);
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
          }
        },

        updateAppointmentStatus: async (id, status) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/appointments/${id}`;
          try {
            await updateDoc(doc(db, path), { status });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
          }
        },

        deleteAppointment: async (id) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/appointments/${id}`;
          try {
            await deleteDoc(doc(db, path));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
          }
        },

        addTransaction: async (transaction) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/transactions`;
          try {
            await addDoc(collection(db, path), transaction);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
          }
        },

        deleteTransaction: async (id) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/transactions/${id}`;
          try {
            await deleteDoc(doc(db, path));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
          }
        },

        addNotification: async (notification) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/notifications`;
          try {
            await addDoc(collection(db, path), notification);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
          }
        },

        markNotificationAsRead: async (id) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/notifications/${id}`;
          try {
            await updateDoc(doc(db, path), { read: true });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
          }
        },

        deleteNotification: async (id) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/notifications/${id}`;
          try {
            await deleteDoc(doc(db, path));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
          }
        },

        addService: async (service) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/services`;
          try {
            await addDoc(collection(db, path), service);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
          }
        },

        updateService: async (id, updates) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/services/${id}`;
          try {
            await updateDoc(doc(db, path), updates);
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
          }
        },

        deleteService: async (id) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/services/${id}`;
          try {
            await deleteDoc(doc(db, path));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, path);
          }
        },

        updateAutomationTemplate: async (id, updates) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/automation/${id}`;
          try {
            await updateDoc(doc(db, path), updates);
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
          }
        },

        addAutomationLog: async (logKey) => {
          const user = get().user;
          if (!user) return;
          const path = `users/${user.uid}/automation_logs/${logKey}`;
          try {
            await setDoc(doc(db, path), { sentAt: new Date().toISOString() });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, path);
          }
        },

        updateUserAvatar: async (photoURL) => {
          const user = auth.currentUser;
          if (!user) return;
          try {
            await updateProfile(user, { photoURL });
            // Update local state to reflect change immediately
            set({ user: { ...user, photoURL } as any });
          } catch (error) {
            console.error('Error updating user avatar:', error);
          }
        },

        updateSettings: async (updates) => {
          const { user, settings } = get();
          if (!user) return;
          const path = `users/${user.uid}/settings/general`;
          try {
            const newSettings = { ...settings, ...updates };
            await setDoc(doc(db, path), newSettings, { merge: true });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
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
          const today = new Date().toISOString().split('T')[0];
          
          // Sum price of all confirmed/pending appointments from today onwards
          return appointments
            .filter(a => a.date >= today && (a.status === 'Confirmado' || a.status === 'Pendente'))
            .reduce((acc, curr) => acc + curr.price, 0);
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
        clients: state.clients,
        appointments: state.appointments,
        transactions: state.transactions
      })
    }
  )
);

