import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Megaphone, Plus, Loader2 } from 'lucide-react';
import { useUnidade } from '@/lib/UnidadeContext';
import { paginaPermitida } from '@/components/modulos';
import ModuloBloqueado from '@/components/ModuloBloqueado';
import CardPromocao from '@/components/promocoes/CardPromocao';
import FormularioPromocao from '@/components/promocoes/FormularioPromocao';
import DisparoPromocaoModal from '@/components/promocoes/DisparoPromocaoModal';
import InteressesPromocao from '@/components/promocoes/InteressesPromocao';

export default function Promocoes() {
  const { unidadeAtual } = useUnidade();
  const qc = useQueryClient();
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [disparo, setDisparo] = useState(null);
  const [aba, setAba] = useState('campanhas');

  const { data: promocoes = [], isLoading } = useQuery({
    queryKey: ['promocoes'],
    queryFn: () => base44.entities.Promocao.list('-created_date'),
    staleTime: 30 * 1000,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-promocao'],
    queryFn: () => base44.entities.Produto.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-clientes'],
    queryFn: () => base44.entities.GrupoClientes.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-promocao'],
    queryFn: () => base44.entities.Cliente.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: interesses = [] } = useQuery({
    queryKey: ['interesses-promocao'],
    queryFn: async () => {
      const page = await base44.entities.PromocaoInteresse.list({ sort: '-created_date', limit: 100 });
      return page.items || [];
    },
    staleTime: 30 * 1000,
  });

  const { data: contagens = {} } = useQuery({
    queryKey: ['interesses-por-promocao'],
    queryFn: async () => {
      const { rows } = await base44.entities.PromocaoInteresse.aggregate({ query: {}, groupBy: 'promocao_id' });
      return Object.fromEntries((rows || []).map((r) => [r.promocao_id, r.count]));
    },
    staleTime: 30 * 1000,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });

  const config = configs[0] || {};
  const modulosAtivos = config.modulos_ativos ?? null;
  const clientesComTelefone = useMemo(
    () => clientes.filter((c) => c.telefone && !c.bloqueado).length,
    [clientes]
  );

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ['promocoes'] });
    qc.invalidateQueries({ queryKey: ['interesses-promocao'] });
    qc.invalidateQueries({ queryKey: ['interesses-por-promocao'] });
    setFormAberto(false);
    setEditando(null);
  };

  const excluir = async (promocao) => {
    if (!confirm(`Excluir a promoção "${promocao.titulo}"?`)) return;
    await base44.entities.Promocao.delete(promocao.id);
    toast.success('Promoção excluída');
    recarregar();
  };

  const alternarAtiva = async (promocao) => {
    await base44.entities.Promocao.update(promocao.id, { ativa: promocao.ativa === false });
    recarregar();
  };

  const alterarStatusInteresse = async (interesse, status) => {
    await base44.entities.PromocaoInteresse.update(interesse.id, { status });
    recarregar();
  };

  const excluirInteresse = async (interesse) => {
    await base44.entities.PromocaoInteresse.delete(interesse.id);
    recarregar();
  };

  if (!paginaPermitida(modulosAtivos, 'Promocoes')) {
    return <ModuloBloqueado nomeModulo="Promoções" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-orange-500" />
              PROMOÇÕES
            </h1>
            <p className="text-slate-500 mt-1">
              Crie campanhas promocionais, dispare para os clientes e receba os interesses
            </p>
          </div>
          <Button
            onClick={() => { setEditando(null); setFormAberto(true); }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova promoção
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={aba} onValueChange={setAba}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="campanhas">Campanhas ({promocoes.length})</TabsTrigger>
            <TabsTrigger value="interesses">Interesses ({interesses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="campanhas" className="space-y-3 mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : promocoes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhuma promoção criada</h3>
                  <p className="text-slate-500 mb-4">
                    Crie uma campanha com produtos específicos, por categoria ou todos os produtos.
                  </p>
                  <Button onClick={() => { setEditando(null); setFormAberto(true); }} className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" /> Criar promoção
                  </Button>
                </CardContent>
              </Card>
            ) : (
              promocoes.map((p) => (
                <CardPromocao
                  key={p.id}
                  promocao={p}
                  interesses={contagens[p.id] || 0}
                  onEditar={(promo) => { setEditando(promo); setFormAberto(true); }}
                  onDisparar={setDisparo}
                  onExcluir={excluir}
                  onAlternarAtiva={alternarAtiva}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="interesses" className="mt-4">
            <InteressesPromocao
              interesses={interesses}
              onStatus={alterarStatusInteresse}
              onExcluir={excluirInteresse}
            />
          </TabsContent>
        </Tabs>
      </div>

      {formAberto && (
        <FormularioPromocao
          promocao={editando}
          produtos={produtos}
          grupos={grupos}
          totalClientes={clientesComTelefone}
          whatsappPadrao={config.whatsapp_atendimento || ''}
          unidadeId={unidadeAtual?.id}
          onClose={() => { setFormAberto(false); setEditando(null); }}
          onSaved={recarregar}
        />
      )}

      {disparo && (
        <DisparoPromocaoModal
          promocao={disparo}
          grupos={grupos}
          clientes={clientes}
          unidadeId={unidadeAtual?.id}
          onClose={() => setDisparo(null)}
          onConcluido={() => qc.invalidateQueries({ queryKey: ['promocoes'] })}
        />
      )}
    </div>
  );
}