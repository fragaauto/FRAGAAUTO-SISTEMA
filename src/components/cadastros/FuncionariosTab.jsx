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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { TODOS_MODULOS } from '@/components/modulos';
import { motion } from 'framer-motion';

export default function FuncionariosTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showFuncaoModal, setShowFuncaoModal] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState(null);
  const [deleteFuncaoId, setDeleteFuncaoId] = useState(null);
  const [activeSection, setActiveSection] = useState('usuarios'); // 'usuarios' | 'funcoes'
  const [showConvidarModal, setShowConvidarModal] = useState(false);
  const [convidandoEmail, setConvidandoEmail] = useState('');
  const [convidandoFuncaoId, setConvidandoFuncaoId] = useState('');
  const [convidando, setConvidando] = useState(false);
  const [editUserModal, setEditUserModal] = useState(null);
  const [editUserFuncaoId, setEditUserFuncaoId] = useState('');

  const [funcaoForm, setFuncaoForm] = useState({
    nome: '', descricao: '', modulos_liberados: [], pode_ver_relatorio_proprio: false,
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

  const openFuncaoModal = (f = null) => {
    if (f) { setEditingFuncao(f); setFuncaoForm({ nome: f.nome, descricao: f.descricao || '', modulos_liberados: f.modulos_liberados || [], pode_ver_relatorio_proprio: f.pode_ver_relatorio_proprio || false, percentual_comissao: f.percentual_comissao || 0, meta_mensal: f.meta_mensal || 0, regra_premiacao: f.regra_premiacao || '' }); }
    else { setEditingFuncao(null); setFuncaoForm({ nome: '', descricao: '', modulos_liberados: [], pode_ver_relatorio_proprio: false, percentual_comissao: 0, meta_mensal: 0, regra_premiacao: '' }); }
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
      queryClient.invalidateQueries(['usuarios']);
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

  const filteredUsuarios = usuarios.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="flex border-b mb-4">
        <button onClick={() => setActiveSection('usuarios')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${activeSection === 'usuarios' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Funcionários/Usuários
        </button>
        <button onClick={() => setActiveSection('funcoes')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${activeSection === 'funcoes' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          Funções/Cargos
        </button>
      </div>

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
              {filteredUsuarios.map(u => {
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
              {funcoes.map((f, i) => (
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
                {TODOS_MODULOS.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm">{m.nome}</span>
                    <Switch checked={funcaoForm.modulos_liberados.includes(m.id)} onCheckedChange={() => toggleModulo(m.id)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <Label>Pode ver próprio relatório de produção</Label>
                <p className="text-xs text-slate-500">Permite que o funcionário veja seu próprio desempenho</p>
              </div>
              <Switch checked={funcaoForm.pode_ver_relatorio_proprio} onCheckedChange={v => setFuncaoForm(p => ({ ...p, pode_ver_relatorio_proprio: v }))} />
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
    </>
  );
}