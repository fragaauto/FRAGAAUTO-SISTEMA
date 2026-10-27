import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Plus, Settings2, Target } from 'lucide-react';
import { toast } from 'sonner';
import useVendasPorCategoria, { useMetasPorCategoria } from '@/hooks/useMetasCategorias';
import ResumoMetaGeral from '@/components/metas/ResumoMetaGeral';
import CategoriaMetaCard from '@/components/metas/CategoriaMetaCard';
import TabelaVendasCategoria from '@/components/metas/TabelaVendasCategoria';
import FormMetaCategoria from '@/components/metas/FormMetaCategoria';

export default function Metas() {
  const { unidadeAtual } = useUnidade();
  const queryClient = useQueryClient();
  const [formAberto, setFormAberto] = useState(false);
  const [metaEmEdicao, setMetaEmEdicao] = useState(null);

  const { data: usuario } = useQuery({
    queryKey: ['usuario-atual-metas'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: metas = [], isLoading: carregandoMetas } = useQuery({
    queryKey: ['metas_vendas', unidadeAtual?.id],
    queryFn: () => base44.entities.MetaVendas.filter({ unidade_id: unidadeAtual?.id }),
    staleTime: 5 * 60 * 1000,
    enabled: !!unidadeAtual,
  });

  const { data: metasCategoria = [], isLoading: carregandoCategorias } = useMetasPorCategoria(unidadeAtual);
  const { data: vendas, isLoading: carregandoVendas } = useVendasPorCategoria(unidadeAtual);

  const { data: categoriasProduto = [] } = useQuery({
    queryKey: ['categorias-produto', unidadeAtual?.id],
    queryFn: async () => {
      const res = await base44.entities.Produto.list({ distinct: 'categoria' });
      return (res.items || []).filter((c) => typeof c === 'string' && c.trim());
    },
    staleTime: 10 * 60 * 1000,
  });

  const podeEditar = usuario?.role === 'admin';
  const faturado = Number(vendas?.faturamento_mes) || 0;

  const mesBruto = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  const mesAtual = mesBruto.charAt(0).toUpperCase() + mesBruto.slice(1);

  const vendasMap = useMemo(() => {
    const mapa = {};
    (vendas?.categorias || []).forEach((c) => {
      mapa[c.categoria] = Number(c.valor) || 0;
    });
    return mapa;
  }, [vendas]);

  const metasAtivas = metasCategoria.filter((m) => m.ativa !== false);

  const categoriasDisponiveis = useMemo(() => {
    const nomes = new Set([...categoriasProduto, ...metasAtivas.map((m) => m.categoria)]);
    return Array.from(nomes).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [categoriasProduto, metasAtivas]);

  const linhasTabela = useMemo(() => {
    const nomes = new Set([...Object.keys(vendasMap), ...metasAtivas.map((m) => m.categoria)]);
    return Array.from(nomes)
      .map((categoria) => ({
        categoria,
        vendido: vendasMap[categoria] || 0,
        meta: Number(metasAtivas.find((m) => m.categoria === categoria)?.meta_mes) || 0,
      }))
      .sort((a, b) => b.vendido - a.vendido);
  }, [vendasMap, metasAtivas]);

  const abrirNovaMeta = () => {
    setMetaEmEdicao(null);
    setFormAberto(true);
  };

  const abrirEdicao = (meta) => {
    setMetaEmEdicao(meta);
    setFormAberto(true);
  };

  const removerMeta = async (meta) => {
    if (!window.confirm(`Remover a meta da categoria "${meta.categoria}"?`)) return;
    try {
      await base44.entities.MetaCategoria.delete(meta.id);
      await queryClient.invalidateQueries({ queryKey: ['metas_categoria'] });
      toast.success('Meta removida');
    } catch (e) {
      toast.error('Erro ao remover meta: ' + (e.message || e));
    }
  };

  const carregando = carregandoMetas || carregandoCategorias || carregandoVendas;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to={createPageUrl('Home')}
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para a Home
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              <Target className="h-6 w-6 text-blue-600" />
              Metas de Vendas
            </h1>
            <p className="text-sm text-slate-500">
              {unidadeAtual?.nome ? `${unidadeAtual.nome} · ` : ''}
              {mesAtual}
            </p>
          </div>
          <Link to={createPageUrl('Configuracoes')}>
            <Button variant="outline" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Metas gerais
            </Button>
          </Link>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Calculando metas...
          </div>
        ) : (
          <>
            <ResumoMetaGeral metas={metas} faturado={faturado} />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">Metas por categoria</h2>
                {podeEditar && (
                  <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={abrirNovaMeta}>
                    <Plus className="h-4 w-4" />
                    Definir meta
                  </Button>
                )}
              </div>

              {metasAtivas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <Target className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                  <p className="text-sm text-slate-600">Nenhuma meta por categoria definida ainda.</p>
                  {podeEditar && (
                    <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={abrirNovaMeta}>
                      <Plus className="h-4 w-4" />
                      Criar a primeira meta
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {metasAtivas.map((meta) => (
                    <CategoriaMetaCard
                      key={meta.id}
                      categoria={meta.categoria}
                      vendido={vendasMap[meta.categoria] || 0}
                      meta={Number(meta.meta_mes) || 0}
                      podeEditar={podeEditar}
                      onEditar={() => abrirEdicao(meta)}
                      onRemover={() => removerMeta(meta)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-800">Vendas por categoria no mês</h2>
              <TabelaVendasCategoria linhas={linhasTabela} />
            </div>
          </>
        )}
      </div>

      <FormMetaCategoria
        aberto={formAberto}
        meta={metaEmEdicao}
        categorias={categoriasDisponiveis}
        unidadeId={unidadeAtual?.id}
        onFechar={() => setFormAberto(false)}
      />
    </div>
  );
}