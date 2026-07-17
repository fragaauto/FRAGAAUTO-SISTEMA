import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, PackagePlus, ShoppingCart, Loader2, Plus } from 'lucide-react';

export function estoqueBaixo(produto) {
  if (!produto) return false;
  if (!produto.controla_estoque) return false;
  const atual = Number(produto.estoque_atual || 0);
  const minimo = Number(produto.estoque_minimo || 0);
  return atual <= minimo;
}

export default function AlertaEstoqueBaixo({ produto, quantidade, open, onClose }) {
  const qc = useQueryClient();
  const [aba, setAba] = useState('escolha');
  const [novoEstoque, setNovoEstoque] = useState('');
  const [novoDesejado, setNovoDesejado] = useState('');
  const [listaSelecionada, setListaSelecionada] = useState('');
  const [qtdLista, setQtdLista] = useState(1);
  const [obsLista, setObsLista] = useState('');
  const [criandoNova, setCriandoNova] = useState(false);
  const [nomeNova, setNomeNova] = useState('');
  const [salvando, setSalvando] = useState(false);

  const { data: listasAbertas = [] } = useQuery({
    queryKey: ['listas-compras-abertas'],
    queryFn: () => base44.entities.ListaCompras.filter({ status: 'aberta' }),
    enabled: open,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (open && produto) {
      setAba('escolha');
      setNovoEstoque(String(produto.estoque_desejado ?? produto.estoque_atual ?? 0));
      setNovoDesejado(String(produto.estoque_desejado ?? 0));
      setQtdLista(Number(quantidade) || 1);
      setListaSelecionada('');
      setObsLista('');
      setCriandoNova(false);
      setNomeNova('');
    }
  }, [open, produto, quantidade]);

  if (!produto) return null;

  const sugerido = Math.max(0, (Number(produto.estoque_desejado || 0)) - (Number(produto.estoque_atual || 0)));

  const corrigirEstoque = async () => {
    setSalvando(true);
    try {
      await base44.entities.Produto.update(produto.id, {
        estoque_atual: Number(novoEstoque) || 0,
        estoque_desejado: Number(novoDesejado) || 0,
      });
      toast.success('Estoque corrigido!');
      qc.invalidateQueries(['produtos']);
      qc.invalidateQueries(['produtos-estoque']);
      qc.invalidateQueries({ queryKey: ['atendimento'] });
      onClose();
    } catch (e) {
      toast.error('Erro ao corrigir estoque');
    } finally {
      setSalvando(false);
    }
  };

  const adicionarNaLista = async () => {
    if (criandoNova && !nomeNova.trim()) { toast.error('Informe o nome da nova lista'); return; }
    if (!criandoNova && !listaSelecionada) { toast.error('Selecione uma lista'); return; }
    setSalvando(true);
    try {
      let listaId = listaSelecionada;
      let itensAtuais = [];
      if (criandoNova) {
        const nova = await base44.entities.ListaCompras.create({
          nome: nomeNova.trim(),
          observacoes: '',
          itens: [],
          itens_livres: [],
          status: 'aberta',
        });
        listaId = nova.id;
      } else {
        const lista = listasAbertas.find(l => l.id === listaSelecionada);
        itensAtuais = lista?.itens || [];
      }
      const existente = itensAtuais.find(i => i.produto_id === produto.id);
      let novosItens;
      if (existente) {
        novosItens = itensAtuais.map(i => i.produto_id === produto.id
          ? { ...i, quantidade: (Number(i.quantidade) || 0) + (Number(qtdLista) || 1) }
          : i);
      } else {
        novosItens = [...itensAtuais, {
          produto_id: produto.id,
          produto_nome: produto.nome,
          codigo: produto.codigo || '',
          quantidade: Number(qtdLista) || 1,
          obs: obsLista || '',
        }];
      }
      await base44.entities.ListaCompras.update(listaId, { itens: novosItens });
      toast.success(criandoNova ? 'Lista criada e item adicionado!' : 'Item adicionado à lista!');
      qc.invalidateQueries(['listas-compras']);
      qc.invalidateQueries(['listas-compras-abertas']);
      onClose();
    } catch (e) {
      toast.error('Erro ao adicionar à lista');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            Estoque Baixo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-slate-800">{produto.nome}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Estoque atual: <strong>{produto.estoque_atual || 0}</strong> · Mínimo: <strong>{produto.estoque_minimo || 0}</strong>
              {produto.estoque_desejado ? ` · Desejado: ${produto.estoque_desejado}` : ''}
            </p>
          </div>

          {aba === 'escolha' && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAba('corrigir')} className="flex flex-col items-center gap-2 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition">
                <PackagePlus className="w-7 h-7 text-blue-600" />
                <span className="text-sm font-medium text-slate-700 text-center">Corrigir Estoque</span>
              </button>
              <button onClick={() => setAba('lista')} className="flex flex-col items-center gap-2 p-4 border-2 border-slate-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition">
                <ShoppingCart className="w-7 h-7 text-green-600" />
                <span className="text-sm font-medium text-slate-700 text-center">Adicionar à Lista de Compra</span>
              </button>
            </div>
          )}

          {aba === 'corrigir' && (
            <div className="space-y-3">
              <div>
                <Label>Novo estoque atual</Label>
                <Input type="number" min="0" value={novoEstoque} onChange={e => setNovoEstoque(e.target.value)} />
              </div>
              <div>
                <Label>Estoque desejado</Label>
                <Input type="number" min="0" value={novoDesejado} onChange={e => setNovoDesejado(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAba('escolha')}>Voltar</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={corrigirEstoque} disabled={salvando}>
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <PackagePlus className="w-4 h-4 mr-1" />} Salvar
                </Button>
              </div>
            </div>
          )}

          {aba === 'lista' && (
            <div className="space-y-3">
              {!criandoNova ? (
                <>
                  <div className="flex items-center justify-between">
                    <Label>Listas em aberto</Label>
                    <button onClick={() => setCriandoNova(true)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Nova lista
                    </button>
                  </div>
                  {listasAbertas.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4 border rounded-lg bg-slate-50">Nenhuma lista em aberto. Crie uma nova.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {listasAbertas.map(l => (
                        <button key={l.id} onClick={() => setListaSelecionada(l.id)}
                          className={`w-full text-left p-2 rounded-lg border text-sm flex items-center justify-between ${listaSelecionada === l.id ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <span className="font-medium">{l.nome}</span>
                          <span className="text-xs text-slate-500">{(l.itens?.length || 0) + (l.itens_livres?.length || 0)} itens</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input type="number" min="1" value={qtdLista} onChange={e => setQtdLista(e.target.value)} />
                    </div>
                    {sugerido > 0 && (
                      <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setQtdLista(sugerido)}>
                        Usar sugestão ({sugerido})
                      </Button>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Observação</Label>
                    <Input value={obsLista} onChange={e => setObsLista(e.target.value)} placeholder="Observação..." />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label>Nome da nova lista</Label>
                    <Input value={nomeNova} onChange={e => setNomeNova(e.target.value)} placeholder="Ex: Reposição..." />
                  </div>
                  <div>
                    <Label className="text-xs">Quantidade</Label>
                    <Input type="number" min="1" value={qtdLista} onChange={e => setQtdLista(e.target.value)} />
                  </div>
                  <button onClick={() => setCriandoNova(false)} className="text-xs text-slate-500 hover:underline">← Escolher lista existente</button>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAba('escolha')}>Voltar</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={adicionarNaLista} disabled={salvando}>
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShoppingCart className="w-4 h-4 mr-1" />} Adicionar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}