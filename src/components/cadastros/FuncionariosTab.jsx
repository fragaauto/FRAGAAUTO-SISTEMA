import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, UserCog, Mail, Edit, Trash2, Loader2, Settings, Shield, UserPlus, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { TODOS_MODULOS } from '@/components/modulos';
import { motion } from 'framer-motion';
import Paginacao from '@/components/ui/Paginacao';

export default function FuncionariosTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showFuncaoModal, setShowFuncaoModal] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState(null);
  const [deleteFuncaoId, setDeleteFuncaoId] = useState(null);
  const [activeSection, setActiveSection] = useState('funcionarios'); // 'funcionarios' | 'usuarios' | 'funcoes'
  const [showConvidarModal, setShowConvidarModal] = useState(false);
  const [convidandoEmail, setConvidandoEmail] = useState('');
  const [convidandoFuncaoId, setConvidandoFuncaoId] = useState('');
  const [convidando, setConvidando] = useState(false);
  const [editUserModal, setEditUserModal] = useState(null);
  const [editUserFuncaoId, setEditUserFuncaoId] = useState('');
  const [paginaAtualUsuarios, setPaginaAtualUsuarios] = useState(1);
  const [paginaAtualFuncoes, setPaginaAtualFuncoes] = useState(1);
  const [paginaAtualFuncionarios, setPaginaAtualFuncionarios] = useState(1);
  const itensPorPagina = 20;
  const [showFuncionarioModal, setShowFuncionarioModal] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [funcionarioForm, setFuncionarioForm] = useState({
    nome_completo: '', cpf: '', telefone: '', email: '', data_nascimento: '', endereco: '',
    funcao_id: '', data_admissao: '', status: 'ativo', login_usuario: '', senha_hash: '', observacoes: ''
  });
  const [senhaVisivel, setSenhaVisivel] = useState('');

  const [funcaoForm, setFuncaoForm] = useState({
    nome: '', descricao: '', modulos_liberados: [], pode_ver_relatorio_proprio: false,
    pode_ver_dashboards: true, pode_acessar_manual: true, pode_acessar_configuracoes: false, pode_acessar_usuarios: false,
    abas_atendimento: ['lista', 'novo'],
    abas_os: ['queixa', 'checklist', 'orcamento', 'autorizacao', 'pagamento'],
    percentual_comissao: 0, meta_mensal: 0, regra_premiacao: ''
  });

  const { data: funcoes = [], isLoading: loadingFuncoes } = useQuery({
    queryKey: ['funcoes_funcionario'],
    queryFn: () => base44.entities.FuncaoFuncionario.list('-created_date'),
  });

  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: funcionarios = [], isLoading: loadingFuncionarios } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => base44.entities.Funcionario.list('-created_date'),
  });

  const createFuncaoMutation = useMutation({
    mutationFn: (data) => base44.entities.FuncaoFuncionario.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funcoes_funcionario'] }); toast.success('Função criada!'); closeFuncaoModal(); }
  });
  const updateFuncaoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FuncaoFuncionario.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funcoes_funcionario'] }); toast.success('Função atualizada!'); closeFuncaoModal(); }
  });
  const deleteFuncaoMutation = useMutation({
    mutationFn: (id) => base44.entities.FuncaoFuncionario.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funcoes_funcionario'] }); toast.success('Função excluída!'); setDeleteFuncaoId(null); }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }); toast.success('Usuário atualizado!'); setEditUserModal(null); }
  });

  const createFuncionarioMutation = useMutation({
    mutationFn: (data) => base44.entities.Funcionario.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funcionarios'] }); toast.success('Funcionário cadastrado!'); closeFuncionarioModal(); }
  });
  const updateFuncionarioMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Funcionario.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funcionarios'] }); toast.success('Funcionário atualizado!'); closeFuncionarioModal(); }
  });
  const deleteFuncionarioMutation = useMutation({
    mutationFn: (id) => base44.entities.Funcionario.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['funcionarios'] }); toast.success('Funcionário excluído!'); }
  });

  const openFuncaoModal = (f = null) => {
    if (f) { setEditingFuncao(f); setFuncaoForm({ nome: f.nome, descricao: f.descricao || '', modulos_liberados: f.modulos_liberados || [], pode_ver_relatorio_proprio: f.pode_ver_relatorio_proprio || false, pode_ver_dashboards: f.pode_ver_dashboards !== false, pode_acessar_manual: f.pode_acessar_manual !== false, pode_acessar_configuracoes: f.pode_acessar_configuracoes || false, pode_acessar_usuarios: f.pode_acessar_usuarios || false, abas_atendimento: f.abas_atendimento || ['lista', 'novo'], abas_os: f.abas_os || ['queixa', 'checklist', 'orcamento', 'autorizacao', 'pagamento'], percentual_comissao: f.percentual_comissao || 0, meta_mensal: f.meta_mensal || 0, regra_premiacao: f.regra_premiacao || '' }); }
    else { setEditingFuncao(null); setFuncaoForm({ nome: '', descricao: '', modulos_liberados: [], pode_ver_relatorio_proprio: false, pode_ver_dashboards: true, pode_acessar_manual: true, pode_acessar_configuracoes: false, pode_acessar_usuarios: false, abas_atendimento: ['lista', 'novo'], abas_os: ['queixa', 'checklist', 'orcamento', 'autorizacao', 'pagamento'], percentual_comissao: 0, meta_mensal: 0, regra_premiacao: '' }); }
    setShowFuncaoModal(true);
  };
  const closeFuncaoModal = () => { setShowFuncaoModal(false); setEditingFuncao(null); };

  const handleSaveFuncao = () => {
    if (!funcaoForm.nome) return toast.error('Informe o nome da função');
    if (editingFuncao) updateFuncaoMutation.mutate({ id: editingFuncao.id, data: funcaoForm });
    else createFuncaoMutation.mutate(funcaoForm);
  };

  const toggleModulo = (moduloId) => {
    setFuncaoForm(p => ({
      ...p,
      modulos_liberados: p.modulos_liberados.includes(moduloId)
        ? p.modulos_liberados.filter(m => m !== moduloId)
        : [...p.modulos_liberados, moduloId]
    }));
  };

  const handleConvidar = async () => {
    if (!convidandoEmail) return toast.error('Informe o e-mail');
    setConvidando(true);
    try {
      await base44.users.inviteUser(convidandoEmail, 'user');
      toast.success(`Convite enviado para ${convidandoEmail}!`);
      setConvidandoEmail('');
      setConvidandoFuncaoId('');
      setShowConvidarModal(false);
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    } catch (e) {
      toast.error(e?.message || 'Erro ao enviar convite');
    } finally {
      setConvidando(false);
    }
  };

  const openEditUser = (u) => {
    setEditUserModal(u);
    setEditUserFuncaoId(u.funcao_id || '');
  };

  const handleSaveUserFuncao = () => {
    if (!editUserModal) return;
    const funcao = funcoes.find(f => f.id === editUserFuncaoId);
    updateUserMutation.mutate({
      id: editUserModal.id,
      data: {
        funcao_id: editUserFuncaoId || null,
        funcao_nome: funcao?.nome || null,
        modulos_liberados: funcao?.modulos_liberados || []
      }
    });
  };

  const openFuncionarioModal = (f = null) => {
    if (f) {
      setEditingFuncionario(f);
      setFuncionarioForm({
        nome_completo: f.nome_completo || '', cpf: f.cpf || '', telefone: f.telefone || '', email: f.email || '',
        data_nascimento: f.data_nascimento || '', endereco: f.endereco || '', funcao_id: f.funcao_id || '',
        data_admissao: f.data_admissao || '', status: f.status || 'ativo', login_usuario: f.login_usuario || '',
        senha_hash: '', observacoes: f.observacoes || ''
      });
      setSenhaVisivel('');
    } else {
      setEditingFuncionario(null);
      setFuncionarioForm({
        nome_completo: '', cpf: '', telefone: '', email: '', data_nascimento: '', endereco: '',
        funcao_id: '', data_admissao: new Date().toISOString().split('T')[0], status: 'ativo',
        login_usuario: '', senha_hash: '', observacoes: ''
      });
      setSenhaVisivel('');
    }
    setShowFuncionarioModal(true);
  };
  const closeFuncionarioModal = () => { setShowFuncionarioModal(false); setEditingFuncionario(null); setSenhaVisivel(''); };

  const handleSaveFuncionario = () => {
    if (!funcionarioForm.nome_completo) return toast.error('Informe o nome completo');
    const funcao = funcoes.find(f => f.id === funcionarioForm.funcao_id);
    const dataToSave = {
      ...funcionarioForm,
      funcao_nome: funcao?.nome || null,
      senha_hash: senhaVisivel || funcionarioForm.senha_hash
    };
    if (editingFuncionario) updateFuncionarioMutation.mutate({ id: editingFuncionario.id, data: dataToSave });
    else createFuncionarioMutation.mutate(dataToSave);
  };

  const filteredUsuarios = usuarios.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const filteredFuncionarios = funcionarios.filter(f => !search || f.nome_completo?.toLowerCase().includes(search.toLowerCase()) || f.cpf?.includes(search) || f.email?.toLowerCase().includes(search.toLowerCase()));

  const totalPaginasUsuarios = Math.ceil(filteredUsuarios.length / itensPorPagina);
  const usuariosPaginados = filteredUsuarios.slice((paginaAtualUsuarios - 1) * itensPorPagina, paginaAtualUsuarios * itensPorPagina);

  const totalPaginasFuncoes = Math.ceil(funcoes.length / itensPorPagina);
  const funcoesPaginadas = funcoes.slice((paginaAtualFuncoes - 1) * itensPorPagina, paginaAtualFuncoes * itensPorPagina);

  const totalPaginasFuncionarios = Math.ceil(filteredFuncionarios.length / itensPorPagina);
  const funcionariosPaginados = filteredFuncionarios.slice((paginaAtualFuncionarios - 1) * itensPorPagina, paginaAtualFuncionarios * itensPorPagina);

  return (
    <>
      <div className="flex border-b mb-4 overflow-x-auto">
        <button onClick={() => setActiveSection('funcionarios')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeSection === 'funcionarios' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          📋 Funcionários
        </button>
        <button onClick={() => setActiveSection('usuarios')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeSection === 'usuarios' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          👤 Usuários (Login)
        </button>
        <button onClick={() => setActiveSection('funcoes')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeSection === 'funcoes' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          ⚙️ Funções/Cargos
        </button>
      </div>

      {activeSection === 'funcionarios' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-sm">{funcionarios.length} funcionários cadastrados</p>
            <Button onClick={() => openFuncionarioModal()} className="bg-orange-500 hover:bg-orange-600" size="sm">
              <Plus className="w-4 h-4 mr-1" />Novo Funcionário
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar por nome, CPF ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {loadingFuncionarios ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
          ) : funcionarios.length === 0 ? (
            <Card className="py-10">
              <CardContent className="text-center">
                <UserCog className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 mb-3">Nenhum funcionário cadastrado</p>
                <Button onClick={() => openFuncionarioModal()} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-1" />Cadastrar Primeiro Funcionário
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {funcionariosPaginados.map(f => {
                const funcao = funcoes.find(fn => fn.id === f.funcao_id);
                const statusColors = { ativo: 'bg-green-100 text-green-700', inativo: 'bg-red-100 text-red-700', ferias: 'bg-blue-100 text-blue-700', afastado: 'bg-yellow-100 text-yellow-700' };
                return (
                  <Card key={f.id} className="hover:shadow-sm transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <UserCog className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-800">{f.nome_completo}</p>
                              <Badge className={statusColors[f.status] || 'bg-slate-100 text-slate-700'}>{f.status}</Badge>
                              {funcao && <Badge className="bg-blue-100 text-blue-700 text-xs">{funcao.nome}</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              {f.cpf && <span>CPF: {f.cpf}</span>}
                              {f.telefone && <span>Tel: {f.telefone}</span>}
                              {f.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{f.email}</span>}
                            </div>
                            {f.login_usuario && (
                              <p className="text-xs text-blue-600 mt-1">🔑 Login: {f.login_usuario}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openFuncionarioModal(f)}><Edit className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Excluir funcionário?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteFuncionarioMutation.mutate(f.id)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {totalPaginasFuncionarios > 1 && (
            <div className="mt-6">
              <Paginacao paginaAtual={paginaAtualFuncionarios} totalPaginas={totalPaginasFuncionarios} onPaginaChange={setPaginaAtualFuncionarios} />
            </div>
          )}
        </>
      )}

      {activeSection === 'usuarios' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-sm">{usuarios.length} usuários</p>
            <Button onClick={() => setShowConvidarModal(true)} className="bg-orange-500 hover:bg-orange-600" size="sm">
              <UserPlus className="w-4 h-4 mr-1" />Convidar Funcionário
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {loadingUsuarios ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
          ) : (
            <div className="space-y-2">
              {usuariosPaginados.map(u => {
                const funcao = funcoes.find(f => f.id === u.funcao_id);
                return (
                  <Card key={u.id} className="hover:shadow-sm transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <UserCog className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800">{u.full_name || '—'}</p>
                              {u.role === 'admin' && <Badge className="bg-red-100 text-red-700 text-xs"><Shield className="w-3 h-3 mr-1" />Admin</Badge>}
                              {funcao && <Badge className="bg-blue-100 text-blue-700 text-xs">{funcao.nome}</Badge>}
                            </div>
                            <p className="text-sm text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEditUser(u)}><Edit className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {totalPaginasUsuarios > 1 && (
            <div className="mt-6">
              <Paginacao
                paginaAtual={paginaAtualUsuarios}
                totalPaginas={totalPaginasUsuarios}
                onPaginaChange={setPaginaAtualUsuarios}
              />
            </div>
          )}
        </>
      )}

      {activeSection === 'funcoes' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-sm">{funcoes.length} funções cadastradas</p>
            <Button onClick={() => openFuncaoModal()} className="bg-orange-500 hover:bg-orange-600" size="sm">
              <Plus className="w-4 h-4 mr-1" />Nova Função
            </Button>
          </div>
          {loadingFuncoes ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
          ) : funcoes.length === 0 ? (
            <Card className="py-10"><CardContent className="text-center"><Settings className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p className="text-slate-500 mb-3">Nenhuma função criada ainda</p><Button onClick={() => openFuncaoModal()} className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-1" />Criar Função</Button></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {funcoesPaginadas.map((f, i) => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card className="hover:shadow-sm transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-800">{f.nome}</h3>
                          {f.descricao && <p className="text-sm text-slate-500">{f.descricao}</p>}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(f.modulos_liberados || []).slice(0, 4).map(m => {
                              const mod = TODOS_MODULOS.find(x => x.id === m);
                              return mod ? <Badge key={m} variant="outline" className="text-xs">{mod.nome}</Badge> : null;
                            })}
                            {(f.modulos_liberados || []).length > 4 && <Badge variant="outline" className="text-xs">+{(f.modulos_liberados || []).length - 4}</Badge>}
                          </div>
                          {f.percentual_comissao > 0 && <p className="text-xs text-green-600 mt-1">Comissão: {f.percentual_comissao}%</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openFuncaoModal(f)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteFuncaoId(f.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          {totalPaginasFuncoes > 1 && (
            <div className="mt-6">
              <Paginacao
                paginaAtual={paginaAtualFuncoes}
                totalPaginas={totalPaginasFuncoes}
                onPaginaChange={setPaginaAtualFuncoes}
              />
            </div>
          )}
        </>
      )}

      {/* Modal Nova Função */}
      <Dialog open={showFuncaoModal} onOpenChange={setShowFuncaoModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingFuncao ? 'Editar Função' : 'Nova Função'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
            <div><Label>Nome da Função *</Label><Input value={funcaoForm.nome} onChange={e => setFuncaoForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Técnico, Recepcionista, Gerente" /></div>
            <div><Label>Descrição</Label><Input value={funcaoForm.descricao} onChange={e => setFuncaoForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div>
              <Label className="mb-2 block">Módulos Liberados</Label>
              <div className="space-y-2">
                {TODOS_MODULOS.map(m => {
                  const ativo = funcaoForm.modulos_liberados.includes(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => toggleModulo(m.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${ativo ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <span className={`text-sm font-medium ${ativo ? 'text-orange-700' : 'text-slate-700'}`}>{m.nome}</span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${ativo ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                        {ativo && <span className="text-white text-xs font-bold">✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <Label>Pode ver Visão Geral e Dashboards</Label>
                  <p className="text-xs text-slate-500">Exibe estatísticas na página inicial</p>
                </div>
                <Switch checked={funcaoForm.pode_ver_dashboards} onCheckedChange={v => setFuncaoForm(p => ({ ...p, pode_ver_dashboards: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <Label>Pode ver próprio relatório de produção</Label>
                  <p className="text-xs text-slate-500">Permite que veja seu próprio desempenho</p>
                </div>
                <Switch checked={funcaoForm.pode_ver_relatorio_proprio} onCheckedChange={v => setFuncaoForm(p => ({ ...p, pode_ver_relatorio_proprio: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <Label>Pode acessar Manual de Treinamento</Label>
                  <p className="text-xs text-slate-500">Acesso ao manual de procedimentos</p>
                </div>
                <Switch checked={funcaoForm.pode_acessar_manual} onCheckedChange={v => setFuncaoForm(p => ({ ...p, pode_acessar_manual: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <Label>Pode acessar Configurações</Label>
                  <p className="text-xs text-slate-500">Acesso às configurações do sistema</p>
                </div>
                <Switch checked={funcaoForm.pode_acessar_configuracoes} onCheckedChange={v => setFuncaoForm(p => ({ ...p, pode_acessar_configuracoes: v }))} />
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <Label>Pode acessar Usuários</Label>
                  <p className="text-xs text-slate-500">Gerenciar usuários e permissões</p>
                </div>
                <Switch checked={funcaoForm.pode_acessar_usuarios} onCheckedChange={v => setFuncaoForm(p => ({ ...p, pode_acessar_usuarios: v }))} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Abas do Menu Atendimentos</Label>
              <div className="space-y-2">
                {[
                  { id: 'lista', nome: 'Lista de OS' },
                  { id: 'novo', nome: 'Nova OS' },
                  { id: 'aprovacoes', nome: 'Aprovações Pendentes' },
                  { id: 'reprovados', nome: 'Serviços Reprovados' },
                  { id: 'vendas_diretas', nome: 'Vendas Diretas' }
                ].map(aba => {
                  const ativo = (funcaoForm.abas_atendimento || []).includes(aba.id);
                  return (
                    <button
                      type="button"
                      key={aba.id}
                      onClick={() => {
                        const current = funcaoForm.abas_atendimento || [];
                        setFuncaoForm(p => ({
                          ...p,
                          abas_atendimento: ativo
                            ? current.filter(a => a !== aba.id)
                            : [...current, aba.id]
                        }));
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${ativo ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <span className={`text-sm font-medium ${ativo ? 'text-green-700' : 'text-slate-700'}`}>{aba.nome}</span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${ativo ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                        {ativo && <span className="text-white text-xs font-bold">✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Abas Internas da OS</Label>
              <p className="text-xs text-slate-500 mb-2">Abas visíveis ao editar um atendimento</p>
              <div className="space-y-2">
                {[
                  { id: 'queixa', nome: 'Queixa' },
                  { id: 'checklist', nome: 'Checklist' },
                  { id: 'orcamento', nome: 'Orçamento' },
                  { id: 'autorizacao', nome: 'Autorização' },
                  { id: 'pagamento', nome: 'Pagamento' }
                ].map(aba => {
                  const ativo = (funcaoForm.abas_os || []).includes(aba.id);
                  return (
                    <button
                      type="button"
                      key={aba.id}
                      onClick={() => {
                        const current = funcaoForm.abas_os || [];
                        setFuncaoForm(p => ({
                          ...p,
                          abas_os: ativo
                            ? current.filter(a => a !== aba.id)
                            : [...current, aba.id]
                        }));
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${ativo ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <span className={`text-sm font-medium ${ativo ? 'text-purple-700' : 'text-slate-700'}`}>{aba.nome}</span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${ativo ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`}>
                        {ativo && <span className="text-white text-xs font-bold">✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Comissão (%)</Label><Input type="number" value={funcaoForm.percentual_comissao} onChange={e => setFuncaoForm(p => ({ ...p, percentual_comissao: parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
              <div><Label>Meta Mensal (R$)</Label><Input type="number" value={funcaoForm.meta_mensal} onChange={e => setFuncaoForm(p => ({ ...p, meta_mensal: parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
            </div>
            <div><Label>Regras de Premiação</Label><Textarea value={funcaoForm.regra_premiacao} onChange={e => setFuncaoForm(p => ({ ...p, regra_premiacao: e.target.value }))} placeholder="Descreva as regras de premiação para esta função..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeFuncaoModal}>Cancelar</Button>
            <Button onClick={handleSaveFuncao} disabled={createFuncaoMutation.isPending || updateFuncaoMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {(createFuncaoMutation.isPending || updateFuncaoMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Convidar */}
      <Dialog open={showConvidarModal} onOpenChange={setShowConvidarModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-orange-500" />Convidar Funcionário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>E-mail *</Label><Input type="email" value={convidandoEmail} onChange={e => setConvidandoEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
            <div>
              <Label>Função</Label>
              <Select value={convidandoFuncaoId} onValueChange={setConvidandoFuncaoId}>
                <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sem função definida</SelectItem>
                  {funcoes.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">O funcionário receberá um e-mail de convite. Após aceitar, você poderá editar os módulos de acesso.</p>
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleConvidar} disabled={convidando || !convidandoEmail}>
              {convidando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}Enviar Convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal editar função do usuário */}
      <Dialog open={!!editUserModal} onOpenChange={() => setEditUserModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Função — {editUserModal?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Função/Cargo</Label>
              <Select value={editUserFuncaoId} onValueChange={setEditUserFuncaoId}>
                <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sem função</SelectItem>
                  {funcoes.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editUserFuncaoId && funcoes.find(f => f.id === editUserFuncaoId) && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-2">Módulos liberados por esta função:</p>
                <div className="flex flex-wrap gap-1">
                  {(funcoes.find(f => f.id === editUserFuncaoId)?.modulos_liberados || []).map(m => {
                    const mod = TODOS_MODULOS.find(x => x.id === m);
                    return mod ? <Badge key={m} variant="outline" className="text-xs">{mod.nome}</Badge> : null;
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserModal(null)}>Cancelar</Button>
            <Button onClick={handleSaveUserFuncao} disabled={updateUserMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {updateUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFuncaoId} onOpenChange={() => setDeleteFuncaoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir função?</AlertDialogTitle><AlertDialogDescription>Os funcionários com esta função não perderão o acesso imediatamente, mas a função deixará de existir.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteFuncaoMutation.mutate(deleteFuncaoId)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Cadastrar/Editar Funcionário */}
      <Dialog open={showFuncionarioModal} onOpenChange={setShowFuncionarioModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nome Completo *</Label><Input value={funcionarioForm.nome_completo} onChange={e => setFuncionarioForm(p => ({ ...p, nome_completo: e.target.value }))} placeholder="Nome completo" /></div>
              <div><Label>CPF</Label><Input value={funcionarioForm.cpf} onChange={e => setFuncionarioForm(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
              <div><Label>Telefone</Label><Input value={funcionarioForm.telefone} onChange={e => setFuncionarioForm(p => ({ ...p, telefone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
              <div><Label>E-mail</Label><Input type="email" value={funcionarioForm.email} onChange={e => setFuncionarioForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
              <div><Label>Data de Nascimento</Label><Input type="date" value={funcionarioForm.data_nascimento} onChange={e => setFuncionarioForm(p => ({ ...p, data_nascimento: e.target.value }))} /></div>
              <div className="col-span-2"><Label>Endereço</Label><Input value={funcionarioForm.endereco} onChange={e => setFuncionarioForm(p => ({ ...p, endereco: e.target.value }))} placeholder="Endereço completo" /></div>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-3">Dados Profissionais</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Função/Cargo</Label>
                  <Select value={funcionarioForm.funcao_id} onValueChange={v => setFuncionarioForm(p => ({ ...p, funcao_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sem função</SelectItem>
                      {funcoes.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Data de Admissão</Label><Input type="date" value={funcionarioForm.data_admissao} onChange={e => setFuncionarioForm(p => ({ ...p, data_admissao: e.target.value }))} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={funcionarioForm.status} onValueChange={v => setFuncionarioForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="ferias">Férias</SelectItem>
                      <SelectItem value="afastado">Afastado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-2">Dados de Login (Opcional - Apenas Referência)</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <p className="font-semibold mb-1">⚠️ Login não funcional neste cadastro</p>
                  <p>Funcionários cadastrados aqui podem ser atribuídos a serviços e aparecer nos relatórios, mas <strong>não podem fazer login no sistema</strong>.</p>
                  <p className="mt-1">Para acesso ao sistema, convide-os na aba "Usuários (Login)" através do email.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Usuário (apenas registro)</Label><Input value={funcionarioForm.login_usuario} onChange={e => setFuncionarioForm(p => ({ ...p, login_usuario: e.target.value }))} placeholder="usuario123" /></div>
                <div><Label>Senha (apenas registro)</Label><Input type="text" value={senhaVisivel} onChange={e => setSenhaVisivel(e.target.value)} placeholder={editingFuncionario ? "Deixe vazio para não alterar" : "Digite a senha"} /></div>
              </div>
              <p className="text-xs text-slate-400 mt-2">💡 Estes campos são apenas para registro interno (ex: credenciais de acesso a outros sistemas).</p>
            </div>
            <div><Label>Observações</Label><Textarea value={funcionarioForm.observacoes} onChange={e => setFuncionarioForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Anotações gerais sobre o funcionário..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeFuncionarioModal}>Cancelar</Button>
            <Button onClick={handleSaveFuncionario} disabled={createFuncionarioMutation.isPending || updateFuncionarioMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {(createFuncionarioMutation.isPending || updateFuncionarioMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}