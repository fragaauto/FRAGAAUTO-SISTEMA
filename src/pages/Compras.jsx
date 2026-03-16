import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingCart, Package, AlertTriangle, Check, Loader2, FileText, ShoppingBag, RefreshCw, Plus, X } from 'lucide-react';
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

  const estoqueBaixo = produtos.filter(p => p.controla_estoque && (p.estoque_atual || 0) <= (p.estoque_minimo || 0) && (p.estoque_minimo || 0) > 0);
  const [showGerarLista, setShowGerarLista] = useState(false);
  const [itensLista, setItensLista] = useState([]);
  const [nomeLista, setNomeLista] = useState('');
  const [salvandoLista, setSalvandoLista] = useState(false);

  const { data: listasAbertas = [] } = useQuery({
    queryKey: ['listas-compras'],
    queryFn: () => base44.entities.ListaCompras.filter({ status: 'aberta' }),
    staleTime: 30 * 1000,
  });

  const [adicionandoALista, setAdicionandoALista] = useState(null); // produto sendo adicionado
  const [listaDestinoId, setListaDestinoId] = useState('');
  const [qtdAdicionar, setQtdAdicionar] = useState(1);
  const [salvandoItemLista, setSalvandoItemLista] = useState(false);

  const salvarItemNaLista = async () => {
    if (!listaDestinoId) return toast.error('Selecione uma lista');
    const lista = listasAbertas.find(l => l.id === listaDestinoId);
    if (!lista) return;
    const prod = adicionandoALista;
    const jaExiste = (lista.itens || []).find(i => i.produto_id === prod.id);
    const novosItens = jaExiste
      ? (lista.itens || []).map(i => i.produto_id === prod.id ? { ...i, quantidade: (i.quantidade || 0) + qtdAdicionar } : i)
      : [...(lista.itens || []), { produto_id: prod.id, produto_nome: prod.nome, codigo: prod.codigo, quantidade: qtdAdicionar, obs: `Estoque: ${prod.estoque_atual || 0}` }];
    setSalvandoItemLista(true);
    await base44.entities.ListaCompras.update(lista.id, { itens: novosItens });
    setSalvandoItemLista(false);
    toast.success(`"${prod.nome}" adicionado à lista!`);
    qc.invalidateQueries(['listas-compras']);
    setAdicionandoALista(null);
    setListaDestinoId('');
    setQtdAdicionar(1);
  };

  const abrirGerarLista = () => {
    const itens = estoqueBaixo.map(p => {
      const qtdFalta = Math.max(0, (p.estoque_desejado || p.estoque_minimo || 0) - (p.estoque_atual || 0));
      return {
        produto_id: p.id,
        produto_nome: p.nome,
        codigo: p.codigo,
        quantidade: qtdFalta > 0 ? qtdFalta : 1,
        obs: `Estoque atual: ${p.estoque_atual || 0} | Mín: ${p.estoque_minimo || 0}${p.estoque_desejado ? ` | Desejado: ${p.estoque_desejado}` : ''}`,
      };
    });
    setItensLista(itens);
    setNomeLista(`Reposição de Estoque - ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`);
    setShowGerarLista(true);
  };

  const salvarListaGerada = async () => {
    if (!nomeLista.trim()) return toast.error('Informe o nome da lista');
    const itensValidos = itensLista.filter(i => i.quantidade > 0);
    if (itensValidos.length === 0) return toast.error('Nenhum item com quantidade > 0');
    setSalvandoLista(true);
    await base44.entities.ListaCompras.create({
      nome: nomeLista,
      itens: itensValidos,
      itens_livres: [],
      status: 'aberta',
    });
    setSalvandoLista(false);
    setShowGerarLista(false);
    toast.success('Lista de compras criada!');
    qc.invalidateQueries(['listas-compras']);
    setTab('listas');
  };

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
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">{estoqueBaixo.length} produto(s) com estoque baixo</p>
              <div className="flex gap-2">
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
                {estoqueBaixo.length > 0 && (
                  <Button
                    size="sm"
                    onClick={abrirGerarLista}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Montar Lista de Compras
                  </Button>
                )}
              </div>
            </div>
            {estoqueBaixo.length === 0 ? (
              <div className="text-center py-12 text-green-600">
                <Check className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold">Estoque em dia!</p>
              </div>
            ) : (
              estoqueBaixo.map(prod => {
                const qtdFalta = Math.max(0, (prod.estoque_desejado || prod.estoque_minimo || 0) - (prod.estoque_atual || 0));
                return (
                  <Card key={prod.id} className={`border-2 ${(prod.estoque_atual || 0) <= 0 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{prod.nome}</p>
                          <p className="text-sm text-slate-500">{prod.codigo} · {prod.categoria}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right space-y-0.5">
                            <p className={`font-bold text-lg ${(prod.estoque_atual || 0) <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                              {prod.estoque_atual || 0}
                            </p>
                            <p className="text-xs text-slate-500">mín: {prod.estoque_minimo || 0}{prod.estoque_desejado ? ` · desejado: ${prod.estoque_desejado}` : ''}</p>
                            {qtdFalta > 0 && <p className="text-xs text-blue-600 font-semibold">comprar: {qtdFalta}</p>}
                          </div>
                          {listasAbertas.length > 0 && (
                            <Button size="sm" variant="outline" className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap"
                              onClick={() => { setAdicionandoALista(prod); setQtdAdicionar(qtdFalta > 0 ? qtdFalta : 1); setListaDestinoId(listasAbertas[0]?.id || ''); }}>
                              <Plus className="w-3.5 h-3.5" /> Adicionar à lista
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal Gerar Lista de Compras */}
      <Dialog open={showGerarLista} onOpenChange={setShowGerarLista}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              Montar Lista de Compras — Estoque Baixo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Nome da lista</label>
              <Input value={nomeLista} onChange={e => setNomeLista(e.target.value)} className="mt-1" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Itens a comprar <span className="text-xs text-slate-400">(edite as quantidades conforme necessário)</span></p>
              {itensLista.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 border rounded-lg p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-800">{item.produto_nome}</p>
                    <p className="text-xs text-slate-400">{item.obs}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Qtd:</span>
                    <Input
                      type="number"
                      min="0"
                      value={item.quantidade}
                      onChange={e => setItensLista(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: parseInt(e.target.value) || 0 } : it))}
                      className="w-20 h-8 text-center text-sm"
                    />
                    <button onClick={() => setItensLista(prev => prev.filter((_, i) => i !== idx))}>
                      <X className="w-4 h-4 text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
              {itensLista.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum item. Todos foram removidos.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGerarLista(false)}>Cancelar</Button>
            <Button onClick={salvarListaGerada} disabled={salvandoLista} className="bg-blue-600 hover:bg-blue-700">
              {salvandoLista ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
              Criar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}