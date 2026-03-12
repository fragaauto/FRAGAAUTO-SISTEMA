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
import { Plus, Search, User, Building2, Phone, Mail, Edit, Trash2, Loader2, FileText, Upload, Ban, Filter, X } from 'lucide-react';
import { toast } from "sonner";
import ImportarClientesModal from '@/components/clientes/ImportarClientesModal';
import { motion } from 'framer-motion';
import Paginacao from '@/components/ui/Paginacao';

export default function ClientesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroBloqueado, setFiltroBloqueado] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showImportar, setShowImportar] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  const [formData, setFormData] = useState({ nome: '', tipo_pessoa: 'fisica', telefone: '', email: '', cpf_cnpj: '', data_nascimento: '', endereco: '' });

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Gera código sequencial automático
      const todos = await base44.entities.Cliente.list();
      const maxCodigo = todos.reduce((max, c) => Math.max(max, c.codigo || 0), 0);
      return base44.entities.Cliente.create({ ...data, codigo: maxCodigo + 1 });
    },
    onSuccess: () => { queryClient.invalidateQueries(['clientes']); toast.success('Cliente cadastrado!'); closeModal(); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['clientes']); toast.success('Cliente atualizado!'); closeModal(); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['clientes']); toast.success('Cliente excluído!'); setDeleteId(null); }
  });

  const filteredClientes = clientes.filter(c => {
    const matchSearch = !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.telefone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.cpf_cnpj?.includes(search);
    const matchTipo = filtroTipo === 'todos' || (c.tipo_pessoa || 'fisica') === filtroTipo;
    const matchBloqueado = filtroBloqueado === 'todos' || (filtroBloqueado === 'bloqueado' ? c.bloqueado : !c.bloqueado);
    return matchSearch && matchTipo && matchBloqueado;
  });

  const totalPaginas = Math.ceil(filteredClientes.length / itensPorPagina);
  const clientesPaginados = filteredClientes.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  const openModal = (cliente = null) => {
    if (cliente) { setEditingCliente(cliente); setFormData({ nome: cliente.nome, tipo_pessoa: cliente.tipo_pessoa || 'fisica', telefone: cliente.telefone, email: cliente.email || '', cpf_cnpj: cliente.cpf_cnpj || '', data_nascimento: cliente.data_nascimento || '', endereco: cliente.endereco || '' }); }
    else { setEditingCliente(null); setFormData({ nome: '', tipo_pessoa: 'fisica', telefone: '', email: '', cpf_cnpj: '', data_nascimento: '', endereco: '' }); }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingCliente(null); setFormData({ nome: '', tipo_pessoa: 'fisica', telefone: '', email: '', cpf_cnpj: '', data_nascimento: '', endereco: '' }); };

  const handleSave = () => {
    if (!formData.nome || !formData.telefone) return toast.error('Preencha nome e telefone');
    if (editingCliente) updateMutation.mutate({ id: editingCliente.id, data: formData });
    else createMutation.mutate(formData);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-slate-500 text-sm">{clientes.length} clientes cadastrados</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportar(true)} size="sm"><Upload className="w-4 h-4 mr-1" />Importar</Button>
          <Button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600" size="sm"><Plus className="w-4 h-4 mr-1" />Novo Cliente</Button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por nome, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="fisica">Pessoa Física</SelectItem>
            <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroBloqueado} onValueChange={setFiltroBloqueado}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="bloqueado">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
        {(filtroTipo !== 'todos' || filtroBloqueado !== 'todos') && (
          <Button variant="ghost" size="sm" onClick={() => { setFiltroTipo('todos'); setFiltroBloqueado('todos'); }}>
            <X className="w-3 h-3 mr-1" />Limpar
          </Button>
        )}
        <span className="text-sm text-slate-500 ml-auto self-center">{filteredClientes.length} resultado(s)</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : filteredClientes.length === 0 ? (
        <Card className="py-10"><CardContent className="text-center"><User className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p className="text-slate-500">Nenhum cliente encontrado</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {clientesPaginados.map((cliente, index) => (
            <motion.div key={cliente.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(cliente.tipo_pessoa || 'fisica') === 'juridica' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                        {(cliente.tipo_pessoa || 'fisica') === 'juridica' ? <Building2 className="w-5 h-5 text-purple-600" /> : <User className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {cliente.codigo && (
                            <span className="font-mono text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">#{String(cliente.codigo).padStart(4, '0')}</span>
                          )}
                          <h3 className="font-semibold text-slate-800">{cliente.nome}</h3>
                          {cliente.bloqueado && <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 rounded px-1.5 py-0.5"><Ban className="w-3 h-3" />Bloqueado</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefone}</span>
                          {cliente.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cliente.email}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openModal(cliente)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => updateMutation.mutate({ id: cliente.id, data: { bloqueado: !cliente.bloqueado } })} className={cliente.bloqueado ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}><Ban className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(cliente.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Tipo de Pessoa *</Label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setFormData({ ...formData, tipo_pessoa: 'fisica' })} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm font-medium transition-all ${formData.tipo_pessoa === 'fisica' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}><User className="w-4 h-4" />Pessoa Física</button>
                <button type="button" onClick={() => setFormData({ ...formData, tipo_pessoa: 'juridica' })} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm font-medium transition-all ${formData.tipo_pessoa === 'juridica' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500'}`}><Building2 className="w-4 h-4" />Pessoa Jurídica</button>
              </div>
            </div>
            <div><Label>Nome *</Label><Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome completo" /></div>
            <div><Label>Telefone *</Label><Input value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} placeholder="(11) 99999-9999" /></div>
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" /></div>
            <div><Label>{formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}</Label><Input value={formData.cpf_cnpj} onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })} /></div>
            <div><Label>Data de Nascimento</Label><Input type="date" value={formData.data_nascimento} onChange={e => setFormData({ ...formData, data_nascimento: e.target.value })} /></div>
            <div><Label>Endereço</Label><Input value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showImportar && <ImportarClientesModal onClose={() => setShowImportar(false)} onImportado={() => { queryClient.invalidateQueries(['clientes']); setShowImportar(false); }} />}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir cliente?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}