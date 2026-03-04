import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  User,
  Phone,
  Mail,
  Edit,
  Trash2,
  Loader2,
  Car,
  FileText,
  Upload,
  Ban
} from 'lucide-react';
import ImportarClientesModal from '../components/clientes/ImportarClientesModal';
import { motion } from 'framer-motion';

export default function Clientes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showImportar, setShowImportar] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpf_cnpj: '',
    endereco: ''
  });

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => base44.entities.Atendimento.list(),
    staleTime: 2 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      toast.success('Cliente cadastrado!');
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      toast.success('Cliente atualizado!');
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      toast.success('Cliente excluído!');
      setDeleteId(null);
    }
  });

  const filteredClientes = clientes.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getClienteAtendimentos = (clienteNome) => {
    return atendimentos.filter(a => 
      a.cliente_nome?.toLowerCase() === clienteNome?.toLowerCase()
    ).length;
  };

  const openModal = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        endereco: cliente.endereco || ''
      });
    } else {
      setEditingCliente(null);
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        cpf_cnpj: '',
        endereco: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCliente(null);
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      cpf_cnpj: '',
      endereco: ''
    });
  };

  const handleSave = () => {
    if (!formData.nome || !formData.telefone) {
      toast.error('Preencha nome e telefone');
      return;
    }

    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
              <p className="text-slate-500">{clientes.length} cadastrados</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowImportar(true)}
                className="flex-1 sm:flex-none"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Planilha
              </Button>
              <Button 
                onClick={() => openModal()}
                className="bg-orange-500 hover:bg-orange-600 flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredClientes.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Nenhum cliente encontrado</p>
              <Button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredClientes.map((cliente, index) => {
              const atendimentosCount = getClienteAtendimentos(cliente.nome);
              return (
                <motion.div
                  key={cliente.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800">{cliente.nome}</h3>
                              {cliente.bloqueado && (
                                <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                                  <Ban className="w-3 h-3" /> Bloqueado
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {cliente.telefone}
                              </span>
                              {cliente.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {cliente.email}
                                </span>
                              )}
                              {atendimentosCount > 0 && (
                                <span className="flex items-center gap-1 text-orange-600">
                                  <FileText className="w-3 h-3" />
                                  {atendimentosCount} atendimento{atendimentosCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openModal(cliente)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={cliente.bloqueado ? 'Desbloquear' : 'Bloquear remarketing'}
                          onClick={() => updateMutation.mutate({ id: cliente.id, data: { bloqueado: !cliente.bloqueado } })}
                          className={cliente.bloqueado ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-red-500'}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(cliente.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
                className="h-12"
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="h-12"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="h-12"
              />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                placeholder="000.000.000-00"
                className="h-12"
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Endereço completo"
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}