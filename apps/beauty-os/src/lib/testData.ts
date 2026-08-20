import { useStore } from './store';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

export async function seedTestData(userId: string) {
  const store = useStore.getState();
  
  // 1. Seed Services if empty
  if (store.services.length === 0) {
    const services = [
      { name: 'Corte Artístico', price: 120, duration: 60 },
      { name: 'Coloração Premium', price: 250, duration: 120 },
      { name: 'Tratamento Hidratação', price: 80, duration: 45 },
      { name: 'Design de Sobrancelhas', price: 60, duration: 30 },
      { name: 'Manicure & SPA', price: 95, duration: 60 }
    ];
    for (const s of services) {
      await addDoc(collection(db, `users/${userId}/services`), s);
    }
  }

  // 2. Seed Clients
  const clients = [
    { name: 'Mariana Silva', phone: '11999998888', email: 'mariana@example.com', spent: 0, visits: 0, lastVisit: '', isVIP: true, tags: ['Frequente', 'Cabelo'], notes: 'Gosta de café sem açúcar.' },
    { name: 'Beatriz Oliveira', phone: '11988887777', email: 'beatriz@example.com', spent: 0, visits: 0, lastVisit: '', isVIP: false, tags: ['Novo'], notes: 'Primeira vez no estúdio.' },
    { name: 'Ana Costa', phone: '11977776666', email: 'ana.costa@example.com', spent: 0, visits: 0, lastVisit: '', isVIP: true, tags: ['VIP', 'Cílios'], notes: 'Cliente antiga.' },
    { name: 'Juliana Paes', phone: '11966665555', email: 'ju@example.com', spent: 0, visits: 0, lastVisit: '', isVIP: false, tags: ['Instagram'], notes: '' },
    { name: 'Fernanda Lima', phone: '11955554444', email: 'fe@example.com', spent: 0, visits: 0, lastVisit: '', isVIP: false, tags: ['Retorno'], notes: '' }
  ];
  
  const clientIds: string[] = [];
  for (const c of clients) {
    const docRef = await addDoc(collection(db, `users/${userId}/clients`), c);
    clientIds.push(docRef.id);
  }

  // 3. Generate 30 days of data
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
    
    // 2-4 appointments per day
    const appointmentsCount = Math.floor(Math.random() * 3) + 2;
    for (let j = 0; j < appointmentsCount; j++) {
      const clientIdx = Math.floor(Math.random() * clientIds.length);
      const service = servicesList[Math.floor(Math.random() * servicesList.length)];
      const hour = 9 + Math.floor(Math.random() * 9);
      const min = Math.random() > 0.5 ? '00' : '30';
      const time = `${String(hour).padStart(2, '0')}:${min}`;
      
      const status = i === 0 ? 'Pendente' : (Math.random() > 0.1 ? 'Concluído' : 'Cancelado');
      const price = pricesMap[service];

      await addDoc(collection(db, `users/${userId}/appointments`), {
        clientId: clientIds[clientIdx],
        clientName: clients[clientIdx].name,
        clientPhone: clients[clientIdx].phone,
        service,
        time,
        date: dateStr,
        duration: 60,
        status,
        price,
        createdAt: new Date().toISOString()
      });

      // If completed, add transaction
      if (status === 'Concluído') {
        await addDoc(collection(db, `users/${userId}/transactions`), {
          amount: price,
          type: 'revenue',
          category: 'Serviço',
          date: dateStr,
          description: `${service} - ${clients[clientIdx].name}`
        });
      }
    }

    // Add some random expenses every few days
    if (i % 4 === 0) {
      await addDoc(collection(db, `users/${userId}/transactions`), {
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
  const collections = ['clients', 'appointments', 'transactions', 'services', 'automation', 'notifications', 'automation_logs'];
  
  for (const collName of collections) {
    const path = `users/${userId}/${collName}`;
    const snapshot = await getDocs(collection(db, path));
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, path, docSnap.id));
    }
  }
}
