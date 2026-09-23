
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
  message = message.replace(/\{\{empresa\}\}/g, data.empresa || 'Meu Negócio');
  message = message.replace(/\{\{saudacao\}\}/g, finalSaudacao);
  return message;
}

/**
 * Abre a conversa no WhatsApp. Devolve false quando o número não dá para
 * discar, para quem chamou poder avisar.
 *
 * Sem a checagem, um cadastro sem telefone gerava "wa.me/?text=..." — que
 * abre o WhatsApp no seletor de contatos, sem destinatário e sem explicação.
 * Chegava por aí o aviso de aniversário de quem nunca informou o número.
 */
export function openWhatsApp(phone: string, message: string): boolean {
  const cleanPhone = String(phone ?? '').replace(/\D/g, '');
  // Menos de 10 dígitos não é telefone brasileiro discável.
  if (cleanPhone.length < 10) return false;

  // Número brasileiro sem código do país tem 10 dígitos (fixo e celular antigo)
  // ou 11 (celular com o 9). Antes só o de 11 recebia o 55, então um número de
  // 10 dígitos gerava um link do WhatsApp inválido.
  const semCodigoDoPais = cleanPhone.length === 10 || cleanPhone.length === 11;
  const finalPhone = semCodigoDoPais ? `55${cleanPhone}` : cleanPhone;
  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  return true;
}
