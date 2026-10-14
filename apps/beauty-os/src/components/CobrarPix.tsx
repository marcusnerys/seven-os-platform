import * as React from 'react';
import { Copy, Send } from 'lucide-react';
import { useStore } from '../lib/store';
import { codigoPix, chavePixValida } from '../lib/pix';
import { openWhatsApp } from '../lib/whatsapp';
import { EQUIPE } from '../lib/equipe';
import { Modal } from './UI';

const reais = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Mensagem que vai para o cliente, com o código PIX copia e cola. */
export function mensagemDeCobranca(nome: string, valor: number, codigo: string, descricao?: string) {
  const primeiro = nome.trim().split(/\s+/)[0];
  return `Olá ${primeiro}! Segue o PIX de ${reais(valor)}${descricao ? ` (${descricao})` : ''}:\n\n${codigo}\n\nÉ só copiar o código acima e colar no app do seu banco, em PIX copia e cola.`;
}

/**
 * Cobrança por PIX copia e cola: gera o código com a chave do negócio e o
 * valor, e manda pelo WhatsApp ou copia. Sem gateway e sem taxa; a
 * confirmação do pagamento continua manual.
 */
export function CobrarPix({ cliente, valorInicial, aoFechar }: {
  cliente: { name: string; phone: string };
  valorInicial?: number;
  aoFechar: () => void;
}) {
  const settings = useStore(state => state.settings);
  const setToast = useStore(state => state.setToast);
  const [valor, setValor] = React.useState(valorInicial ? String(valorInicial).replace('.', ',') : '');
  const [descricao, setDescricao] = React.useState('');

  const chave = settings.pixChave ?? '';
  const configurado = chavePixValida(chave);
  const numero = Number(valor.replace(/\./g, '').replace(',', '.'));
  const valido = Number.isFinite(numero) && numero > 0;
  const codigo = configurado && valido
    ? codigoPix({ chave, nome: settings.pixNome || settings.studioName, cidade: settings.pixCidade || 'BRASIL', valor: numero })
    : '';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setToast({ message: 'Código PIX copiado.', type: 'success' });
    } catch {
      setToast({ message: 'Não consegui copiar. Toque e segure no código.', type: 'error' });
    }
  };

  const enviar = () => {
    if (!openWhatsApp(cliente.phone, mensagemDeCobranca(cliente.name, numero, codigo, descricao.trim() || undefined))) {
      setToast({ message: `${cliente.name} não tem um telefone válido. Copie o código e mande por outro meio.`, type: 'error' });
    }
  };

  const campo = 'h-12 px-4 rounded-xl bg-ios-bg border border-ios-border text-ios-text-primary text-[16px] placeholder:text-ios-text-secondary focus:outline-none focus:border-ios-gold/50 w-full';

  return (
    <Modal isOpen onClose={aoFechar} title={`Cobrar ${cliente.name.split(' ')[0]}`}>
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-ios-text-secondary">
          <b style={{ color: EQUIPE.cobranca.cor }}>{EQUIPE.cobranca.nome}</b>, da cobrança, monta o PIX copia e cola com a sua chave.
        </p>
        {!configurado ? (
          <p className="text-[14px] text-ios-text-primary p-4 rounded-2xl bg-ios-bg border border-ios-border">
            Cadastre sua chave PIX em <b>Mais → Configurações</b> para cobrar por aqui.
          </p>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
              Valor (R$)
              <input className={campo} value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" autoFocus />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-ios-text-secondary">
              Referente a (opcional)
              <input className={campo} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: Corte de 10/10" />
            </label>
            {codigo && (
              <textarea
                readOnly
                value={codigo}
                aria-label="Código PIX copia e cola"
                className="min-h-[88px] p-3 rounded-xl bg-ios-bg border border-ios-border text-ios-text-secondary text-[12px] font-mono break-all resize-none"
              />
            )}
            <div className="flex gap-2">
              <button onClick={copiar} disabled={!codigo} className="flex-1 h-12 rounded-2xl border border-ios-border text-ios-text-primary text-[14px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40">
                <Copy size={16} /> Copiar código
              </button>
              <button onClick={enviar} disabled={!codigo} className="flex-1 h-12 rounded-2xl bg-ios-gold text-[#111214] text-[14px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40">
                <Send size={16} /> Enviar no WhatsApp
              </button>
            </div>
            <p className="text-[12px] text-ios-text-secondary">O app não vê quando o pagamento cai: confira no seu banco e lance a receita.</p>
          </>
        )}
      </div>
    </Modal>
  );
}
