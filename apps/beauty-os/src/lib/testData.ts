import { useStore } from './store';
import { supabase } from './supabase';

export async function seedTestData(userId: string) {
  const store = useStore.getState();

  if (store.services.length === 0) {
    const services = [
      { name: 'Corte Artístico', price: 120, duration: 60 },
      { name: 'Coloração Premium', price: 250, duration: 120 },
      { name: 'Tratamento Hidratação', price: 80, duration: 45 },
      { name: 'Design de Sobrancelhas', price: 60, duration: 30 },
      { name: 'Manicure & SPA', price: 95, duration: 60 }
    ];
    for (const s of services) {
      await supabase.from('beautyos_services').insert({ empresa_id: userId, ...s });
    }
  }

  const clients = [
    { name: 'Mariana Silva', phone: '11999998888', email: 'mariana@example.com', spent: 0, visits: 0, last_visit: '', is_vip: true, tags: ['Frequente', 'Cabelo'], notes: 'Gosta de café sem açúcar.' },
    { name: 'Beatriz Oliveira', phone: '11988887777', email: 'beatriz@example.com', spent: 0, visits: 0, last_visit: '', is_vip: false, tags: ['Novo'], notes: 'Primeira vez no estúdio.' },
    { name: 'Ana Costa', phone: '11977776666', email: 'ana.costa@example.com', spent: 0, visits: 0, last_visit: '', is_vip: true, tags: ['VIP', 'Cílios'], notes: 'Cliente antiga.' },
    { name: 'Juliana Paes', phone: '11966665555', email: 'ju@example.com', spent: 0, visits: 0, last_visit: '', is_vip: false, tags: ['Instagram'], notes: '' },
    { name: 'Fernanda Lima', phone: '11955554444', email: 'fe@example.com', spent: 0, visits: 0, last_visit: '', is_vip: false, tags: ['Retorno'], notes: '' }
  ];

  const clientIds: string[] = [];
  for (const c of clients) {
    const { data, error } = await supabase.from('beautyos_clients').insert({ empresa_id: userId, ...c }).select().single();
    if (error) throw error;
    clientIds.push(data.id);
  }

  const servicesList = ['Corte Artístico', 'Coloração Premium', 'Tratamento Hidratação', 'Design de Sobrancelhas', 'Manicure & SPA'];
  const pricesMap: Record<string, number> = {
    'Corte Artístico': 120,
    'Coloração Premium': 250,
    'Tratamento Hidratação': 80,
    'Design de Sobrancelhas': 60,
    'Manicure & SPA': 95
  };

  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const appointmentsCount = Math.floor(Math.random() * 3) + 2;
    for (let j = 0; j < appointmentsCount; j++) {
      const clientIdx = Math.floor(Math.random() * clientIds.length);
      const service = servicesList[Math.floor(Math.random() * servicesList.length)];
      const hour = 9 + Math.floor(Math.random() * 9);
      const min = Math.random() > 0.5 ? '00' : '30';
      const time = `${String(hour).padStart(2, '0')}:${min}`;

      const status = i === 0 ? 'Pendente' : (Math.random() > 0.1 ? 'Concluído' : 'Cancelado');
      const price = pricesMap[service];

      await supabase.from('beautyos_appointments').insert({
        empresa_id: userId,
        client_id: clientIds[clientIdx],
        client_name: clients[clientIdx].name,
        client_phone: clients[clientIdx].phone,
        service,
        time,
        date: dateStr,
        duration: 60,
        status,
        price,
      });

      if (status === 'Concluído') {
        await supabase.from('beautyos_transactions').insert({
          empresa_id: userId,
          amount: price,
          type: 'revenue',
          category: 'Serviço',
          date: dateStr,
          description: `${service} - ${clients[clientIdx].name}`
        });
      }
    }

    if (i % 4 === 0) {
      await supabase.from('beautyos_transactions').insert({
        empresa_id: userId,
        amount: Math.floor(Math.random() * 200) + 50,
        type: 'expense',
        category: 'Produtos',
        date: dateStr,
        description: 'Reposição de estoque'
      });
    }
  }

  return true;
}

export async function clearAllData(userId: string) {
  const tables = [
    'beautyos_clients',
    'beautyos_appointments',
    'beautyos_transactions',
    'beautyos_services',
    'beautyos_automation_templates',
    'beautyos_notifications',
    'beautyos_automation_logs',
  ];

  for (const table of tables) {
    await supabase.from(table).delete().eq('empresa_id', userId);
  }
}
