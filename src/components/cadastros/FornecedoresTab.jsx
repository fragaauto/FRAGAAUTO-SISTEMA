import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Truck, Phone, Mail, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { motion } from 'framer-motion';
import Paginacao from '@/components/ui/Paginacao';

const CATEGORIAS = [
  { value: 'pecas', label: 'Peças' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'materiais', label: 'Materiais' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'outros', label: 'Outros' },
];

const CATEGORY_COLORS = {
  pecas: 'bg-blue-100 text-blue-700',
  servicos: 'bg-green-100 text-green-700',
  materiais: 'bg-orange-100 text-orange-700',
  equipamentos: 'bg-purple-100 text-purple-700',
  outros: 'bg-slate-100 text-slate-700',
};

export default function FornecedoresTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ nome: '', razao_social: '', cnpj: '', telefone: '', email: '', contato: '', endereco: '', categoria: 'pecas', observacoes: '' });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => base44.entities.Fornecedor.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Fornecedor.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['fornecedores']); toast.success('Fornecedor cadastrado!'); closeModal(); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Fornecedor.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['fornecedores']); toast.success('Fornecedor atualizado!'); closeModal(); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Fornecedor.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['fornecedores']); toast.success('Excluído!'); setDeleteId(null); }
  });

  const filtered = fornecedores.filter(f =>
    !search || f.nome?.toLowerCase().includes(search.toLowerCase()) || f.cnpj?.includes(search) || f.telefone?.includes(search)
  );

  const totalPaginas = Math.ceil(filtered.length / itensPorPagina);
  const fornecedoresPaginados = filtered.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  const openModal = (f = null) => {
    if (f) { setEditing(f); setForm({ nome: f.nome, razao_social: f.razao_social || '', cnpj: f.cnpj || '', telefone: f.telefone || '', email: f.email || '', contato: f.contato || '', endereco: f.endereco || '', categoria: f.categoria || 'pecas', observacoes: f.observacoes || '' }); }
    else { setEditing(null); setForm({ nome: '', razao_social: '', cnpj: '', telefone: '', email: '', contato: '', endereco: '', categoria: 'pecas', observacoes: '' }); }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSave = () => {
    if (!form.nome) return toast.error('Informe o nome do fornecedor');
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">{fornecedores.length} fornecedores cadastrados</p>
        <Button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600" size="sm">
          <Plus className="w-4 h-4 mr-1" />Novo Fornecedor
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por nome, CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : filtered.length === 0 ? (
        <Card className="py-10"><CardContent className="text-center"><Truck className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p className="text-slate-500 mb-3">Nenhum fornecedor cadastrado</p><Button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-1" />Cadastrar Fornecedor</Button></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {fornecedoresPaginados.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center"><Truck className="w-5 h-5 text-orange-600" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{f.nome}</h3>
                          <Badge className={`text-xs ${CATEGORY_COLORS[f.categoria] || CATEGORY_COLORS.outros}`}>{CATEGORIAS.find(c => c.value === f.categoria)?.label || f.categoria}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5 text-sm text-slate-500">
                          {f.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{f.telefone}</span>}
                          {f.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{f.email}</span>}
                          {f.contato && <span className="text-xs text-slate-400">Contato: {f.contato}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openModal(f)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(f.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="mt-6">
          <Paginacao
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            onPaginaChange={setPaginaAtual}
          />
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div><Label>Nome Fantasia *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do fornecedor" /></div>
            <div><Label>Razão Social</Label><Input value={form.razao_social} onChange={e => setForm(p => ({ ...p, razao_social: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>Nome do Contato</Label><Input value={form.contato} onChange={e => setForm(p => ({ ...p, contato: e.target.value }))} /></div>
            </div>
            <div><Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}