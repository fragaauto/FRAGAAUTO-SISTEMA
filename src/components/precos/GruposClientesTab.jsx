import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, Search, X, Check } from 'lucide-react';
import { toast } from "sonner";
import { useUnidade } from '@/lib/UnidadeContext';

export default function GruposClientesTab() {
  const queryClient = useQueryClient();
  const { unidadeAtual } = useUnidade();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [searchClientes, setSearchClientes] = useState('');
  const [formData, setFormData] = useState({ nome: '', descricao: '', cliente_ids: [] });

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['grupos-clientes', unidadeAtual?.id],
    queryFn: () => base44.entities.GrupoClientes.filter({ unidade_id: unidadeAtual?.id }),
    enabled: !!unidadeAtual?.id,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GrupoClientes.create({ ...data, unidade_id: unidadeAtual?.id }),
    onSuccess: () => { queryClient.invalidateQueries(['grupos-clientes']); toast.success('Grupo criado!'); closeModal(); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GrupoClientes.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['grupos-clientes']); toast.success('Grupo atualizado!'); closeModal(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GrupoClientes.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['grupos-clientes']); toast.success('Grupo excluído!'); setDeleteId(null); }
  });

  const openModal = (grupo = null) => {
    if (grupo) {
      setEditing(grupo);
      setFormData({ nome: grupo.nome, descricao: grupo.descricao || '', cliente_ids: grupo.cliente_ids || [] });
    } else {
      setEditing(null);
      setFormData({ nome: '', descricao: '', cliente_ids: [] });
    }
    setSearchClientes('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); setSearchClientes(''); };

  const toggleCliente = (id) => {
    setFormData(prev => ({
      ...prev,
      cliente_ids: prev.cliente_ids.includes(id)
        ? prev.cliente_ids.filter(c => c !== id)
        : [...prev.cliente_ids, id]
    }));
  };

  const handleSave = () => {
    if (!formData.nome) return toast.error('Informe o nome do grupo');
    if (editing) updateMutation.mutate({ id: editing.id, data: formData });
    else createMutation.mutate(formData);
  };

  const clientesFiltrados = clientes.filter(c =>
    !searchClientes || c.nome?.toLowerCase().includes(searchClientes.toLowerCase()) || c.telefone?.includes(searchClientes)
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">{grupos.length} grupo(s)</p>
        <Button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Novo Grupo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Carregando...</div>
      ) : grupos.length === 0 ? (
        <Card className="py-10">
          <CardContent className="text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Nenhum grupo criado ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grupos.map(grupo => {
            const membros = clientes.filter(c => (grupo.cliente_ids || []).includes(c.id));
            return (
              <Card key={grupo.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-orange-500" />
                        <h3 className="font-semibold text-slate-800">{grupo.nome}</h3>
                        <Badge variant="outline">{membros.length} cliente(s)</Badge>
                      </div>
                      {grupo.descricao && <p className="text-sm text-slate-500 mb-2">{grupo.descricao}</p>}
                      {membros.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {membros.slice(0, 5).map(c => (
                            <span key={c.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c.nome}</span>
                          ))}
                          {membros.length > 5 && <span className="text-xs text-slate-400">+{membros.length - 5} mais</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-3">
                      <Button variant="ghost" size="icon" onClick={() => openModal(grupo)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeleteId(grupo.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Grupo' : 'Novo Grupo de Clientes'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Clientes VIP" /></div>
            <div><Label>Descrição</Label><Input value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição opcional" /></div>
            <div>
              <Label>Clientes ({formData.cliente_ids.length} selecionado(s))</Label>
              <div className="relative mt-1 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Buscar cliente..." value={searchClientes} onChange={e => setSearchClientes(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-52 overflow-y-auto border rounded-lg divide-y">
                {clientesFiltrados.map(c => {
                  const selected = formData.cliente_ids.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCliente(c.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${selected ? 'bg-orange-50' : ''}`}>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.nome}</p>
                        <p className="text-xs text-slate-500">{c.telefone}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-orange-500" />}
                    </button>
                  );
                })}
                {clientesFiltrados.length === 0 && <p className="text-center py-4 text-sm text-slate-400">Nenhum cliente encontrado</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir grupo?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}