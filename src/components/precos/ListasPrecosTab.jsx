import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Tag, Users, User, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from "sonner";
import { useUnidade } from '@/lib/UnidadeContext';
import ListaPrecosModal from './ListaPrecosModal';

export default function ListasPrecosTab() {
  const queryClient = useQueryClient();
  const { unidadeAtual } = useUnidade();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: listas = [], isLoading } = useQuery({
    queryKey: ['listas-precos', unidadeAtual?.id],
    queryFn: () => base44.entities.ListaPrecos.filter({ unidade_id: unidadeAtual?.id }),
    enabled: !!unidadeAtual?.id,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-clientes', unidadeAtual?.id],
    queryFn: () => base44.entities.GrupoClientes.filter({ unidade_id: unidadeAtual?.id }),
    enabled: !!unidadeAtual?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ListaPrecos.create({ ...data, unidade_id: unidadeAtual?.id }),
    onSuccess: () => { queryClient.invalidateQueries(['listas-precos']); toast.success('Lista criada!'); setShowModal(false); setEditing(null); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ListaPrecos.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['listas-precos']); toast.success('Lista atualizada!'); setShowModal(false); setEditing(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ListaPrecos.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['listas-precos']); toast.success('Lista excluída!'); setDeleteId(null); }
  });

  const handleSave = (formData) => {
    if (editing) updateMutation.mutate({ id: editing.id, data: formData });
    else createMutation.mutate(formData);
  };

  const toggleAtiva = (lista) => {
    updateMutation.mutate({ id: lista.id, data: { ativa: !lista.ativa } });
  };

  const openModal = (lista = null) => {
    setEditing(lista);
    setShowModal(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">{listas.length} lista(s)</p>
        <Button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nova Lista
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Carregando...</div>
      ) : listas.length === 0 ? (
        <Card className="py-10">
          <CardContent className="text-center">
            <Tag className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Nenhuma lista de preços criada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listas.map(lista => {
            const clientesVinculados = clientes.filter(c => (lista.cliente_ids || []).includes(c.id));
            const gruposVinculados = grupos.filter(g => (lista.grupo_ids || []).includes(g.id));
            const totalVinculos = clientesVinculados.length + gruposVinculados.length;

            return (
              <Card key={lista.id} className={!lista.ativa ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Tag className="w-4 h-4 text-orange-500" />
                        <h3 className="font-semibold text-slate-800">{lista.nome}</h3>
                        <Badge variant={lista.ativa ? 'default' : 'secondary'} className={lista.ativa ? 'bg-green-100 text-green-800 border-green-200' : ''}>
                          {lista.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Badge variant="outline">
                          {lista.tipo === 'geral' ? '🌐 Geral' : `📋 ${(lista.itens || []).length} produto(s)`}
                        </Badge>
                      </div>

                      {lista.descricao && <p className="text-sm text-slate-500 mb-2">{lista.descricao}</p>}

                      {lista.tipo === 'geral' && lista.ajuste_valor !== 0 && (
                        <p className="text-sm text-slate-600 mb-2">
                          Ajuste: <span className={lista.ajuste_valor < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {lista.ajuste_valor > 0 ? '+' : ''}{lista.ajuste_valor}{lista.ajuste_tipo === 'percentual' ? '%' : ' R$'}
                          </span>
                        </p>
                      )}

                      {totalVinculos > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {gruposVinculados.map(g => (
                            <span key={g.id} className="text-xs bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Users className="w-3 h-3" />{g.nome}
                            </span>
                          ))}
                          {clientesVinculados.slice(0, 3).map(c => (
                            <span key={c.id} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <User className="w-3 h-3" />{c.nome}
                            </span>
                          ))}
                          {clientesVinculados.length > 3 && (
                            <span className="text-xs text-slate-400">+{clientesVinculados.length - 3} cliente(s)</span>
                          )}
                        </div>
                      )}
                      {totalVinculos === 0 && (
                        <p className="text-xs text-slate-400 mt-1">Sem vínculos definidos</p>
                      )}
                    </div>

                    <div className="flex gap-1 ml-3 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => toggleAtiva(lista)} title={lista.ativa ? 'Desativar' : 'Ativar'}>
                        {lista.ativa ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openModal(lista)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeleteId(lista.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <ListaPrecosModal
          lista={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
          isSaving={isSaving}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir lista de preços?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}