export type BillingPeriodicidade = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

export const BILLING_PERIODICIDADES: BillingPeriodicidade[] = [
  'MENSAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
];

const PERIODICIDADE_CONFIG: Record<
  BillingPeriodicidade,
  { meses: number; descontoPercentual: number }
> = {
  MENSAL: { meses: 1, descontoPercentual: 0 },
  TRIMESTRAL: { meses: 3, descontoPercentual: 5 },
  SEMESTRAL: { meses: 6, descontoPercentual: 10 },
  ANUAL: { meses: 12, descontoPercentual: 20 },
};

export function isBillingPeriodicidade(value: string): value is BillingPeriodicidade {
  return (BILLING_PERIODICIDADES as string[]).includes(value);
}

// Desconto aplicado sobre o preço mensal do plano multiplicado pelo número de
// meses do ciclo escolhido — ex.: anual = preço mensal × 12 × (1 - 20%).
export function calcularPrecoTotal(
  precoMensal: number,
  periodicidade: BillingPeriodicidade,
): number {
  const { meses, descontoPercentual } = PERIODICIDADE_CONFIG[periodicidade];
  const total = precoMensal * meses * (1 - descontoPercentual / 100);
  return Math.round(total * 100) / 100;
}

export function buildOpcoesPeriodicidade(precoMensal: number) {
  return BILLING_PERIODICIDADES.map((periodicidade) => {
    const { meses, descontoPercentual } = PERIODICIDADE_CONFIG[periodicidade];
    return {
      periodicidade,
      meses,
      descontoPercentual,
      precoTotal: calcularPrecoTotal(precoMensal, periodicidade),
    };
  });
}

export function addPeriodicidade(base: Date, periodicidade: BillingPeriodicidade): Date {
  const { meses } = PERIODICIDADE_CONFIG[periodicidade];
  const next = new Date(base);
  next.setMonth(next.getMonth() + meses);
  return next;
}
