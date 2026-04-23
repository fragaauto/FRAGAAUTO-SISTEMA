import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wrench, Package, ArrowLeftRight, Droplets, BarChart2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FerraamentasTab from '@/components/ferramentas/FerramentasTab';
import KitsTab from '@/components/ferramentas/KitsTab';
import MovimentacoesTab from '@/components/ferramentas/MovimentacoesTab';
import InsumosTab from '@/components/ferramentas/InsumosTab';
import ConsumoTab from '@/components/ferramentas/ConsumoTab';

export default function ControleFerramentas() {
  const [tab, setTab] = useState('ferramentas');

  const { data: insumos = [] } = useQuery({
    queryKey: ['insumos'],
    queryFn: () => base44.entities.Insumo.list(),
    staleTime: 60 * 1000,
  });

  const { data: ferramentas = [] } = useQuery({
    queryKey: ['ferramentas'],
    queryFn: () => base44.entities.Ferramenta.list(),
    staleTime: 60 * 1000,
  });

  const estoqueBaixo = insumos.filter(i => i.quantidade_estoque <= i.quantidade_minima).length;

  const now = new Date();
  const emUsoMais24h = ferramentas.filter(f => {
    if (f.status !== 'Em uso' || !f.data_retirada) return false;
    return (now - new Date(f.data_retirada)) > 24 * 3600 * 1000;
  }).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Controle de Ferramentas</h1>
          <p className="text-sm text-slate-500">Gestão de ferramentas, kits e insumos</p>
        </div>
        <div className="ml-auto flex gap-2">
          {emUsoMais24h > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-lg font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {emUsoMais24h} em uso &gt;24h
            </div>
          )}
          {estoqueBaixo > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {estoqueBaixo} insumo{estoqueBaixo > 1 ? 's' : ''} baixo
            </div>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start gap-1 h-auto flex-wrap bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="ferramentas" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Wrench className="w-4 h-4" /> Ferramentas
          </TabsTrigger>
          <TabsTrigger value="kits" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Package className="w-4 h-4" /> Kits
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ArrowLeftRight className="w-4 h-4" /> Movimentações
          </TabsTrigger>
          <TabsTrigger value="insumos" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Droplets className="w-4 h-4" /> Insumos
          </TabsTrigger>
          <TabsTrigger value="consumo" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart2 className="w-4 h-4" /> Consumo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ferramentas">
          <FerraamentasTab />
        </TabsContent>
        <TabsContent value="kits">
          <KitsTab />
        </TabsContent>
        <TabsContent value="movimentacoes">
          <MovimentacoesTab />
        </TabsContent>
        <TabsContent value="insumos">
          <InsumosTab />
        </TabsContent>
        <TabsContent value="consumo">
          <ConsumoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}