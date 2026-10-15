import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { buildAtendimentosQuery, ATENDIMENTOS_LIST_FIELDS, ATENDIMENTOS_POR_PAGINA } from '@/lib/atendimentosQuery';

export default function useAtendimentosLista({ search, produtoFilter, unidadeLoading, ...filters }) {
  const [terms, setTerms] = useState({ search: '', produtoFilter: '' });
  const [dataRecente] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 90);
    return date.toISOString();
  });
  useEffect(() => {
    const timer = setTimeout(() => setTerms({ search: search.trim(), produtoFilter: produtoFilter.trim() }), 350);
    return () => clearTimeout(timer);
  }, [search, produtoFilter]);
  const query = useMemo(() => buildAtendimentosQuery({ ...filters, ...terms, dataRecente }),
    [filters.unidadeId, filters.statusFilter, filters.dataInicio, filters.dataFim, filters.vendaDiretaFilter, terms, dataRecente]);
  const key = JSON.stringify(query);
  const [navigation, setNavigation] = useState({ key: '', index: 0, cursors: [null] });
  const current = navigation.key === key ? navigation : { key, index: 0, cursors: [null] };
  useEffect(() => setNavigation({ key, index: 0, cursors: [null] }), [key]);
  const debouncing = search.trim() !== terms.search || produtoFilter.trim() !== terms.produtoFilter;
  const result = useQuery({
    queryKey: ['atendimentos', 'lista-rapida', query, current.cursors[current.index]],
    queryFn: () => base44.entities.Atendimento.filter(query, {
      sort: '-numero_os', limit: ATENDIMENTOS_POR_PAGINA, fields: ATENDIMENTOS_LIST_FIELDS, cursor: current.cursors[current.index],
    }),
    enabled: !unidadeLoading && !debouncing,
    staleTime: 60 * 1000, gcTime: 10 * 60 * 1000, retry: false, refetchOnWindowFocus: false,
  });
  const count = useQuery({
    queryKey: ['atendimentos', 'total-lista-rapida', query],
    queryFn: () => base44.entities.Atendimento.count(query),
    enabled: !unidadeLoading && !debouncing && result.isSuccess,
    staleTime: 60 * 1000, retry: false, refetchOnWindowFocus: false,
  });
  const mudarPagina = (next) => {
    if (next < 1 || next > current.index + 2 || (next > current.index + 1 && !result.data?.has_more)) return;
    const cursors = current.cursors.slice(0, current.index + 1);
    if (next > current.index + 1) cursors.push(result.data.next_cursor);
    setNavigation({ key, index: next - 1, cursors });
  };
  return { atendimentos: result.data?.items || [], totalRegistros: count.data, pagina: current.index + 1,
    temProxima: !!result.data?.has_more, mudarPagina, refetch: result.refetch, error: result.error,
    isLoading: unidadeLoading || debouncing || result.isPending || (result.isFetching && !result.data) };
}