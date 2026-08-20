
export function resolveMessage(
  template: string, 
  data: { 
    nome?: string; 
    servico?: string; 
    data?: string; 
    hora?: string; 
    empresa?: string;
    saudacao?: string;
  }
): string {
  let message = template;
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  
  const finalSaudacao = data.saudacao || greeting;

  message = message.replace(/\{\{nome\}\}/g, data.nome || '');
  message = message.replace(/\{\{servico\}\}/g, data.servico || '');
  message = message.replace(/\{\{data\}\}/g, data.data || '');
  message = message.replace(/\{\{hora\}\}/g, data.hora || '');
  message = message.replace(/\{\{empresa\}\}/g, data.empresa || 'LESHANOT STUDIO');
  message = message.replace(/\{\{saudacao\}\}/g, finalSaudacao);
  return message;
}

export function openWhatsApp(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  // Assuming Brazil +55 if not provided, but usually better to have country code
  const finalPhone = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;
  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
