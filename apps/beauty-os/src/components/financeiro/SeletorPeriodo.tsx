import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, dataLocal } from '../../lib/utils';
import { moverPeriodo, periodo, type TipoPeriodo } from '../../lib/financeiro';

const TIPOS: { id: TipoPeriodo; rotulo: string }[] = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
  { id: 'ano', rotulo: 'Ano' },
];

/**
 * Dia, semana, mês ou ano, com setas para andar entre eles. Antes o
 * Financeiro somava tudo desde o primeiro lançamento num "Total Acumulado":
 * com um extrato importado, receitas de meses diferentes viravam um número
 * só e não dava para saber como foi o mês.
 */
export function SeletorPeriodo({ tipo, referencia, aoMudar }: {
  tipo: TipoPeriodo;
  referencia: string;
  aoMudar: (tipo: TipoPeriodo, referencia: string) => void;
}) {
  const atual = periodo(tipo, referencia);
  const hoje = dataLocal();
  const ehAtual = hoje >= atual.inicio && hoje <= atual.fim;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex p-1 rounded-[14px] bg-ios-surface border border-ios-border" role="tablist" aria-label="Período">
        {TIPOS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tipo === t.id}
            onClick={() => aoMudar(t.id, referencia)}
            className={cn(
              'flex-1 h-9 rounded-[10px] text-[14px] font-semibold transition-colors',
              tipo === t.id ? 'bg-ios-gold text-[#111214]' : 'text-ios-text-secondary'
            )}
          >
            {t.rotulo}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => aoMudar(tipo, moverPeriodo(tipo, referencia, -1))}
          aria-label="Período anterior"
          className="w-10 h-10 rounded-full bg-ios-surface border border-ios-border text-ios-text-primary flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[18px] font-bold text-ios-text-primary capitalize">{atual.rotulo}</span>
          {!ehAtual && (
            <button onClick={() => aoMudar(tipo, hoje)} className="text-[12px] font-semibold text-ios-gold">
              Voltar para hoje
            </button>
          )}
        </div>
        <button
          onClick={() => aoMudar(tipo, moverPeriodo(tipo, referencia, 1))}
          aria-label="Próximo período"
          className="w-10 h-10 rounded-full bg-ios-surface border border-ios-border text-ios-text-primary flex items-center justify-center"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
