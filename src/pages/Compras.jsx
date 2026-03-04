import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, Package, AlertTriangle, Check, Loader2, FileText, ShoppingBag, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ListaComprasTab from '../components/compras/ListaComprasTab';
import ImportarXMLTab from '../components/compras/ImportarXMLTab';

const TABS = [
  { id: 'listas', label: '📋 Listas de Compras' },
  { id: 'xml', label: '📄 Importar NF-e (XML)' },
  { id: 'historico', label: '📦 Histórico de Compras' },
  { id: 'estoque', label: '⚠️ Estoque Baixo' },
];

export default function Compras() {
  const [tab, setTab] = useState('listas');
  const qc = useQueryClient();

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-estoque'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
    staleTime: 60 * 1000,
  });

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-created_date', 100),
    staleTime: 60 * 1000,
  });

  const { refetch: refetchProdutos, isFetching: isFetchingProdutos } = useQuery({
    queryKey: ['produtos-estoque'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
    staleTime: 60 * 1000,
  });

  const estoqueBaixo = produtos.filter(p => p.controla_estoque && (p.estoque_atual || 0) <= (p.estoque_minimo || 0));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-3">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Compras & Estoque
          </h1>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.label}
                {t.id === 'estoque' && estoqueBaixo.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{estoqueBaixo.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {tab === 'listas' && <ListaComprasTab />}

        {tab === 'xml' && <ImportarXMLTab />}

        {tab === 'historico' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : compras.filter(c => c.status === 'confirmada').length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Nenhuma compra confirmada</p>
              </div>
            ) : (
              compras.filter(c => c.status === 'confirmada').map(compra => (
                <Card key={compra.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{compra.fornecedor}</p>
                        <p className="text-sm text-slate-500">
                          {compra.numero_nf ? `NF: ${compra.numero_nf}` : 'Sem NF'} · {compra.itens?.length || 0} itens
                          {compra.xml_nfe === 'importado' && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">via XML</span>}
                        </p>
                        <p className="text-xs text-slate-400">{compra.created_date ? format(new Date(compra.created_date), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">R$ {(compra.valor_total || 0).toFixed(2)}</p>
                        <Badge className="bg-green-100 text-green-800">Confirmada</Badge>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {(compra.itens || []).slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-500">
                          <span>{item.produto_nome} x{item.quantidade}</span>
                          <span>R$ {(item.valor_total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      {(compra.itens?.length || 0) > 3 && (
                        <p className="text-xs text-slate-400">+ {compra.itens.length - 3} outros itens</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'estoque' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { refetchProdutos(); toast.success('Estoque atualizado!'); }}
                disabled={isFetchingProdutos}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingProdutos ? 'animate-spin' : ''}`} />
                Verificar Estoque
              </Button>
            </div>
            {estoqueBaixo.length === 0 ? (
              <div className="text-center py-12 text-green-600">
                <Check className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold">Estoque em dia!</p>
              </div>
            ) : (
              estoqueBaixo.map(prod => (
                <Card key={prod.id} className={`border-2 ${(prod.estoque_atual || 0) <= 0 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{prod.nome}</p>
                        <p className="text-sm text-slate-500">{prod.codigo} · {prod.categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${(prod.estoque_atual || 0) <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {prod.estoque_atual || 0}
                        </p>
                        <p className="text-xs text-slate-500">mín: {prod.estoque_minimo || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}