import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { endOfMonth, startOfMonth } from 'date-fns';

// Vendas do mês por categoria de produto (calculado no servidor)
export default function useVendasPorCategoria(unidadeAtual) {
  return useQuery({
    queryKey: ['vendas-por-categoria', unidadeAtual?.id],
    queryFn: async () => {
      const agora = new Date();
      const res = await base44.functions.invoke('calcularMetasCategorias', {
        unidade_id: unidadeAtual?.id,
        inicio: startOfMonth(agora).toISOString(),
        fim: endOfMonth(agora).toISOString(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!unidadeAtual,
  });
}

// Metas cadastradas por categoria
export function useMetasPorCategoria(unidadeAtual) {
  return useQuery({
    queryKey: ['metas_categoria', unidadeAtual?.id],
    queryFn: () => base44.entities.MetaCategoria.filter({ unidade_id: unidadeAtual?.id }),
    staleTime: 5 * 60 * 1000,
    enabled: !!unidadeAtual,
  });
}