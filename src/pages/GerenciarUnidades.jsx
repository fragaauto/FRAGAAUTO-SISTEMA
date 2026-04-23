import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Plus, Edit, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUnidade } from '@/lib/UnidadeContext';

const EMPTY_FORM = { nome: '', status: 'ativo' };

export default function GerenciarUnidades() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { reload } = useUnidade();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades-all'],
    queryFn: () => base44.entities.Unidade.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingId
      ? base44.entities.Unidade.update(editingId, data)
      : base44.entities.Unidade.create(data),
    onSuccess: () => {
      toast.success(editingId ? 'Unidade atualizada!' : 'Unidade criada!');
      qc.invalidateQueries(['unidades-all']);
      reload();
      setShowDialog(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    },
    onError: () => toast.error('Erro ao salvar unidade'),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowDialog(true);
  };

  const openEdit = (u) => {
    setForm({ nome: u.nome, status: u.status });
    setEditingId(u.id);
    setShowDialog(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Configuracoes'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-orange-500" /> Gerenciar Unidades
              </h1>
              <p className="text-slate-500 text-sm">Controle as unidades do sistema (Auto Portas, Lava Jato, etc.)</p>
            </div>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nova Unidade
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Unidades cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              </div>
            ) : unidades.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhuma unidade cadastrada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unidades.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{u.nome}</p>
                        <Badge className={u.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                          {u.status === 'ativo' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                      <Edit className="w-3 h-3 mr-1" /> Editar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Auto Portas" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativa</SelectItem>
                  <SelectItem value="inativo">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.nome || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}