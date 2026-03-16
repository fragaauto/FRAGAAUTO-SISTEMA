import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Package, Check, Loader2, Trash2, Search, Edit, ChevronDown, ChevronUp, ShoppingBag, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function NovaListaModal({ open, onClose, produtos, onSaved }) {
  const [nome, setNome] = useState('');
  const [obs, setObs] = useState('');
  const [itens, setItens] = useState([]); // produtos cadastrados
  const [itensLivres, setItensLivres] = useState([]); // produtos não cadastrados
  const [busca, setBusca] = useState('');
  const [novoLivre, setNovoLivre] = useState({ nome: '', quantidade: 1, obs: '' });
  const [saving, setSaving] = useState(false);

  const produtosFiltrados = busca.length > 1
    ? produtos.filter(p =>
        p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(busca.toLowerCase())
      ).slice(0, 8)
    : [];

  const addProduto = (p) => {
    setBusca('');
    if (itens.find(i => i.produto_id === p.id)) return toast.error('Já adicionado');
    setItens(prev => [...prev, { produto_id: p.id, produto_nome: p.nome, codigo: p.codigo, quantidade: 1, obs: '' }]);
  };

  const updateItem = (idx, field, val) => {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const addLivre = () => {
    if (!novoLivre.nome.trim()) return toast.error('Informe o nome do produto');
    setItensLivres(prev => [...prev, { ...novoLivre, quantidade: parseInt(novoLivre.quantidade) || 1 }]);
    setNovoLivre({ nome: '', quantidade: 1, obs: '' });
  };

  const save = async () => {
    if (!nome.trim()) return toast.error('Informe o nome da lista');
    if (itens.length === 0 && itensLivres.length === 0) return toast.error('Adicione ao menos 1 item');
    setSaving(true);
    await base44.entities.ListaCompras.create({
      nome,
      observacoes: obs,
      itens,
      itens_livres: itensLivres,
      status: 'aberta',
    });
    setSaving(false);
    toast.success('Lista criada!');
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-blue-600" /> Nova Lista de Compras</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da lista *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Compras da semana, Reposição março..." />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Anotações gerais..." className="min-h-[60px]" />
          </div>

          {/* Produtos cadastrados */}
          <div className="border rounded-xl p-4 space-y-3 bg-slate-50">
            <p className="font-semibold text-slate-700 text-sm">📦 Produtos do Estoque</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto cadastrado..." className="pl-9" />
              {produtosFiltrados.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full border rounded-lg bg-white shadow-lg max-h-44 overflow-y-auto">
                  {produtosFiltrados.map(p => (
                    <button key={p.id} onClick={() => addProduto(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-0 flex items-center justify-between">
                      <span><strong>{p.nome}</strong> <span className="text-slate-400 text-xs">{p.codigo}</span></span>
                      <Plus className="w-4 h-4 text-blue-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {itens.length > 0 && (
              <div className="space-y-2">
                {itens.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white border rounded-lg p-2">
                    <span className="text-sm flex-1 truncate font-medium">{it.produto_nome}</span>
                    <Input type="number" min={1} value={it.quantidade}
                      onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value) || 1)}
                      className="w-16 text-center h-8" />
                    <Input value={it.obs} onChange={e => updateItem(idx, 'obs', e.target.value)} placeholder="Obs..." className="w-28 h-8 text-xs" />
                    <button onClick={() => setItens(p => p.filter((_, i) => i !== idx))}><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Produtos não cadastrados */}
          <div className="border rounded-xl p-4 space-y-3 bg-orange-50 border-orange-200">
            <p className="font-semibold text-slate-700 text-sm">✏️ Produtos Não Cadastrados</p>
            <div className="flex gap-2">
              <Input value={novoLivre.nome} onChange={e => setNovoLivre(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do produto..." className="flex-1 h-8 text-sm" />
              <Input type="number" min={1} value={novoLivre.quantidade} onChange={e => setNovoLivre(p => ({ ...p, quantidade: e.target.value }))} className="w-16 text-center h-8 text-sm" />
              <Input value={novoLivre.obs} onChange={e => setNovoLivre(p => ({ ...p, obs: e.target.value }))} placeholder="Obs..." className="w-28 h-8 text-xs" />
              <Button size="sm" onClick={addLivre} className="h-8 bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4" /></Button>
            </div>
            {itensLivres.length > 0 && (
              <div className="space-y-1">
                {itensLivres.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-2 py-1.5 text-sm">
                    <span className="flex-1 font-medium">{it.nome}</span>
                    <span className="text-slate-500 text-xs">x{it.quantidade}</span>
                    {it.obs && <span className="text-slate-400 text-xs italic">{it.obs}</span>}
                    <button onClick={() => setItensLivres(p => p.filter((_, i) => i !== idx))}><X className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={save} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
            Criar Lista
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditarListaModal({ lista, produtos, onClose, onSaved }) {
  const [nome, setNome] = useState(lista.nome || '');
  const [obs, setObs] = useState(lista.observacoes || '');
  const [itens, setItens] = useState(lista.itens ? [...lista.itens] : []);
  const [itensLivres, setItensLivres] = useState(lista.itens_livres ? [...lista.itens_livres] : []);
  const [busca, setBusca] = useState('');
  const [novoLivre, setNovoLivre] = useState({ nome: '', quantidade: 1, obs: '' });
  const [saving, setSaving] = useState(false);

  const produtosFiltrados = busca.length > 1
    ? produtos.filter(p =>
        (p.nome?.toLowerCase().includes(busca.toLowerCase()) || p.codigo?.toLowerCase().includes(busca.toLowerCase())) &&
        !itens.find(i => i.produto_id === p.id)
      ).slice(0, 8)
    : [];

  const addProduto = (p) => {
    setBusca('');
    setItens(prev => [...prev, { produto_id: p.id, produto_nome: p.nome, codigo: p.codigo, quantidade: 1, obs: '' }]);
  };

  const updateItem = (idx, field, val) => {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const addLivre = () => {
    if (!novoLivre.nome.trim()) return toast.error('Informe o nome do produto');
    setItensLivres(prev => [...prev, { ...novoLivre, quantidade: parseInt(novoLivre.quantidade) || 1 }]);
    setNovoLivre({ nome: '', quantidade: 1, obs: '' });
  };

  const save = async () => {
    if (!nome.trim()) return toast.error('Informe o nome da lista');
    setSaving(true);
    await base44.entities.ListaCompras.update(lista.id, { nome, observacoes: obs, itens, itens_livres: itensLivres });
    setSaving(false);
    toast.success('Lista atualizada!');
    onSaved();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-blue-600" /> Editar Lista: {lista.nome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da lista *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Anotações gerais..." className="min-h-[60px]" />
          </div>

          {/* Produtos cadastrados */}
          <div className="border rounded-xl p-4 space-y-3 bg-slate-50">
            <p className="font-semibold text-slate-700 text-sm">📦 Produtos do Estoque</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto para adicionar..." className="pl-9" />
              {produtosFiltrados.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full border rounded-lg bg-white shadow-lg max-h-44 overflow-y-auto">
                  {produtosFiltrados.map(p => (
                    <button key={p.id} onClick={() => addProduto(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-0 flex items-center justify-between">
                      <span><strong>{p.nome}</strong> <span className="text-slate-400 text-xs">{p.codigo}</span></span>
                      <Plus className="w-4 h-4 text-blue-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {itens.length > 0 ? (
              <div className="space-y-2">
                {itens.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white border rounded-lg p-2">
                    <span className="text-sm flex-1 truncate font-medium">{it.produto_nome}</span>
                    <Input type="number" min={1} value={it.quantidade}
                      onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value) || 1)}
                      className="w-16 text-center h-8" />
                    <Input value={it.obs || ''} onChange={e => updateItem(idx, 'obs', e.target.value)} placeholder="Obs..." className="w-28 h-8 text-xs" />
                    <button onClick={() => setItens(p => p.filter((_, i) => i !== idx))}><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 text-center py-2">Nenhum produto do estoque</p>}
          </div>

          {/* Produtos livres */}
          <div className="border rounded-xl p-4 space-y-3 bg-orange-50 border-orange-200">
            <p className="font-semibold text-slate-700 text-sm">✏️ Produtos Não Cadastrados</p>
            <div className="flex gap-2">
              <Input value={novoLivre.nome} onChange={e => setNovoLivre(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do produto..." className="flex-1 h-8 text-sm" />
              <Input type="number" min={1} value={novoLivre.quantidade} onChange={e => setNovoLivre(p => ({ ...p, quantidade: e.target.value }))} className="w-16 text-center h-8 text-sm" />
              <Button size="sm" onClick={addLivre} className="h-8 bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4" /></Button>
            </div>
            {itensLivres.length > 0 ? (
              <div className="space-y-1">
                {itensLivres.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-2 py-1.5 text-sm">
                    <span className="flex-1 font-medium">{it.nome}</span>
                    <Input type="number" min={1} value={it.quantidade} onChange={e => setItensLivres(prev => prev.map((x, i) => i === idx ? { ...x, quantidade: parseInt(e.target.value) || 1 } : x))} className="w-14 h-7 text-center text-xs" />
                    <button onClick={() => setItensLivres(p => p.filter((_, i) => i !== idx))}><X className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 text-center py-2">Nenhum item livre</p>}
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListaCard({ lista, produtos, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editando, setEditando] = useState(false);
  const qc = useQueryClient();

  const fecharMutation = useMutation({
    mutationFn: () => base44.entities.ListaCompras.update(lista.id, { status: 'concluida' }),
    onSuccess: () => { toast.success('Lista concluída!'); qc.invalidateQueries(['listas-compras']); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ListaCompras.delete(lista.id),
    onSuccess: () => { toast.success('Lista excluída'); qc.invalidateQueries(['listas-compras']); },
  });

  const totalItens = (lista.itens?.length || 0) + (lista.itens_livres?.length || 0);

  return (
    <>
      <Card className={`border-2 ${lista.status === 'concluida' ? 'border-green-200 opacity-70' : 'border-blue-100'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => setExpanded(e => !e)}>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800">{lista.nome}</p>
                <Badge className={lista.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                  {lista.status === 'concluida' ? 'Concluída' : 'Aberta'}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{totalItens} itens · criada {lista.created_date ? format(new Date(lista.created_date), "dd/MM/yyyy", { locale: ptBR }) : ''}</p>
              {lista.observacoes && <p className="text-xs text-slate-400 mt-0.5">{lista.observacoes}</p>}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {lista.status !== 'concluida' && (
                <button onClick={() => setEditando(true)} className="text-blue-400 hover:text-blue-600" title="Editar lista">
                  <Edit className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button><Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" /></button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir lista "{lista.nome}"?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {expanded && (
            <div className="mt-4 space-y-3">
              {lista.itens?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">📦 Produtos do Estoque</p>
                  <div className="space-y-1">
                    {lista.itens.map((it, idx) => {
                      const prod = produtos.find(p => p.id === it.produto_id);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                          <span className="font-medium">{it.produto_nome}</span>
                          <div className="flex items-center gap-3 text-slate-500">
                            {it.obs && <span className="text-xs italic">{it.obs}</span>}
                            <span>x{it.quantidade}</span>
                            {prod && <span className="text-xs text-slate-400">Estoque: {prod.estoque_atual || 0}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {lista.itens_livres?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-600 mb-1.5">✏️ Produtos Não Cadastrados</p>
                  <div className="space-y-1">
                    {lista.itens_livres.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium">{it.nome}</span>
                        <div className="flex items-center gap-3 text-slate-500">
                          {it.obs && <span className="text-xs italic">{it.obs}</span>}
                          <span>x{it.quantidade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lista.status !== 'concluida' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditando(true)} className="flex-1 gap-1">
                    <Edit className="w-3.5 h-3.5" /> Editar Itens
                  </Button>
                  <Button size="sm" onClick={() => fecharMutation.mutate()} disabled={fecharMutation.isPending} className="bg-green-600 hover:bg-green-700 flex-1">
                    {fecharMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    Concluir Lista
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {editando && (
        <EditarListaModal
          lista={lista}
          produtos={produtos}
          onClose={() => setEditando(false)}
          onSaved={() => { setEditando(false); qc.invalidateQueries(['listas-compras']); }}
        />
      )}
    </>
  );
}

export default function ListaComprasTab() {
  const qc = useQueryClient();
  const [showNova, setShowNova] = useState(false);
  const [filtro, setFiltro] = useState('aberta'); // aberta | concluida | todas

  const { data: listas = [], isLoading } = useQuery({
    queryKey: ['listas-compras'],
    queryFn: () => base44.entities.ListaCompras.list('-created_date'),
    staleTime: 30 * 1000,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-estoque'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
    staleTime: 60 * 1000,
  });

  const listasFiltradas = listas.filter(l => filtro === 'todas' ? true : l.status === filtro);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[['aberta', 'Abertas'], ['concluida', 'Concluídas'], ['todas', 'Todas']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${filtro === v ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>{l}</button>
          ))}
        </div>
        <Button onClick={() => setShowNova(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" /> Nova Lista
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : listasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p>Nenhuma lista {filtro === 'aberta' ? 'aberta' : filtro === 'concluida' ? 'concluída' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listasFiltradas.map(l => (
            <ListaCard key={l.id} lista={l} produtos={produtos} />
          ))}
        </div>
      )}

      <NovaListaModal
        open={showNova}
        onClose={() => setShowNova(false)}
        produtos={produtos}
        onSaved={() => { setShowNova(false); qc.invalidateQueries(['listas-compras']); }}
      />
    </div>
  );
}