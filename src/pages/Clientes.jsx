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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  User,
  Building2,
  Phone,
  Mail,
  Edit,
  Trash2,
  Loader2,
  Car,
  FileText,
  Upload,
  Ban,
  Filter,
  X
} from 'lucide-react';
import ImportarClientesModal from '@/components/clientes/ImportarClientesModal';
import { motion } from 'framer-motion';
import Paginacao from '@/components/ui/Paginacao';

export default function Clientes() {
  const navigate = useNavigate();
  React.useEffect(() => { navigate('/Cadastros'); }, [navigate]);
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroBloqueado, setFiltroBloqueado] = useState('todos');
  const [filtroAtendimento, setFiltroAtendimento] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showImportar, setShowImportar] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo_pessoa: 'fisica',
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
    queryFn: () => base44.entities.Atendimento.list('-created_date', 500),
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

  const filteredClientes = clientes.filter(c => {
    const matchSearch = !search ||
      c.nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf_cnpj?.includes(search);
    const matchTipo = filtroTipo === 'todos' || (c.tipo_pessoa || 'fisica') === filtroTipo;
    const matchBloqueado = filtroBloqueado === 'todos' || (filtroBloqueado === 'bloqueado' ? c.bloqueado : !c.bloqueado);
    const qtdAt = getClienteAtendimentos(c.nome);
    const matchAtendimento = filtroAtendimento === 'todos' ||
      (filtroAtendimento === 'com' && qtdAt > 0) ||
      (filtroAtendimento === 'sem' && qtdAt === 0);
    return matchSearch && matchTipo && matchBloqueado && matchAtendimento;
  });

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
        tipo_pessoa: cliente.tipo_pessoa || 'fisica',
        telefone: cliente.telefone,
        email: cliente.email || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        endereco: cliente.endereco || ''
      });
    } else {
      setEditingCliente(null);
      setFormData({
        nome: '',
        tipo_pessoa: 'fisica',
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
      tipo_pessoa: 'fisica',
      telefone: '',
      email: '',
      cpf_cnpj: '',
      endereco: ''
    });
  };

  const filtrosAtivos = filtroTipo !== 'todos' || filtroBloqueado !== 'todos' || filtroAtendimento !== 'todos';
  const limparFiltros = () => { setFiltroTipo('todos'); setFiltroBloqueado('todos'); setFiltroAtendimento('todos'); setPagina(1); };

  const totalPaginas = Math.ceil(filteredClientes.length / POR_PAGINA);
  const clientesPaginados = filteredClientes.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

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

      {/* Search + Filters */}
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por nome, telefone, email ou CPF/CNPJ..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagina(1); }}
            className="pl-10 h-12"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Tipo de pessoa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="fisica">Pessoa Física</SelectItem>
              <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroBloqueado} onValueChange={setFiltroBloqueado}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Status remarketing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos no remarketing</SelectItem>
              <SelectItem value="bloqueado">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroAtendimento} onValueChange={setFiltroAtendimento}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Atendimentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="com">Com atendimentos</SelectItem>
              <SelectItem value="sem">Sem atendimentos</SelectItem>
            </SelectContent>
          </Select>
          {filtrosAtivos && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-slate-500 h-9">
              <X className="w-3 h-3 mr-1" /> Limpar filtros
            </Button>
          )}
          <span className="text-sm text-slate-500 ml-auto">{filteredClientes.length} resultado(s)</span>
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
          <>
          <div className="space-y-3">
            {clientesPaginados.map((cliente, index) => {
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
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${(cliente.tipo_pessoa || 'fisica') === 'juridica' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {(cliente.tipo_pessoa || 'fisica') === 'juridica'
                              ? <Building2 className="w-6 h-6 text-purple-600" />
                              : <User className="w-6 h-6 text-blue-600" />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-800">{cliente.nome}</h3>
                              <Badge variant="outline" className={`text-xs px-1.5 py-0 ${(cliente.tipo_pessoa || 'fisica') === 'juridica' ? 'border-purple-300 text-purple-700' : 'border-blue-300 text-blue-700'}`}>
                                {(cliente.tipo_pessoa || 'fisica') === 'juridica' ? 'PJ' : 'PF'}
                              </Badge>
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
          <Paginacao
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onMudar={(p) => { setPagina(p); window.scrollTo(0, 0); }}
            totalRegistros={filteredClientes.length}
            porPagina={POR_PAGINA}
          />
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
              <Label>Tipo de Pessoa *</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo_pessoa: 'fisica' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${formData.tipo_pessoa === 'fisica' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <User className="w-4 h-4" /> Pessoa Física
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo_pessoa: 'juridica' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${formData.tipo_pessoa === 'juridica' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <Building2 className="w-4 h-4" /> Pessoa Jurídica
                </button>
              </div>
            </div>
            <div>
              <Label>Nome {formData.tipo_pessoa === 'juridica' ? '/ Razão Social' : ''} *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder={formData.tipo_pessoa === 'juridica' ? 'Razão social ou nome fantasia' : 'Nome completo'}
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
              <Label>{formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}</Label>
              <Input
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0001-00' : '000.000.000-00'}
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

      {showImportar && (
        <ImportarClientesModal
          onClose={() => setShowImportar(false)}
          onImportado={() => {
            queryClient.invalidateQueries(['clientes']);
            setShowImportar(false);
          }}
        />
      )}

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