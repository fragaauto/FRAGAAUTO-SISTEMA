import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, RefreshCw, Edit, FileText, Globe, Loader2, Brain, Shield } from 'lucide-react';

export default function BaseConhecimentoIA() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [form, setForm] = useState({ titulo: '', conteudo: '', fonte_tipo: 'manual', fonte_url: '', ativo: true });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['base_conhecimento'],
    queryFn: () => base44.entities.BaseConhecimento.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BaseConhecimento.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['base_conhecimento']); toast.success('Criado!'); setShowModal(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BaseConhecimento.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['base_conhecimento']); toast.success('Atualizado!'); setShowModal(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BaseConhecimento.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['base_conhecimento']); toast.success('Excluído!'); setDeleteId(null); }
  });

  const handleSync = async (registro) => {
    if (!registro.fonte_url) return toast.error('URL do Google Docs não configurada');
    setSyncing(registro.id);
    try {
      const res = await base44.functions.invoke('syncBaseConhecimento', {
        record_id: registro.id,
        docs_url: registro.fonte_url
      });
      if (res.data.error) throw new Error(res.data.error);
      queryClient.invalidateQueries(['base_conhecimento']);
      toast.success(`Sincronizado! ${res.data.chars} caracteres importados.`);
    } catch (e) {
      toast.error(e.message || 'Erro na sincronização');
    } finally {
      setSyncing(null);
    }
  };

  const openModal = (reg = null) => {
    if (reg) {
      setEditing(reg);
      setForm({ titulo: reg.titulo, conteudo: reg.conteudo || '', fonte_tipo: reg.fonte_tipo || 'manual', fonte_url: reg.fonte_url || '', ativo: reg.ativo !== false });
    } else {
      setEditing(null);
      setForm({ titulo: '', conteudo: '', fonte_tipo: 'manual', fonte_url: '', ativo: true });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.titulo) return toast.error('Informe o título');
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-red-400" />
            <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-slate-500">Esta área é exclusiva para administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              Base de Conhecimento IA
            </h1>
            <p className="text-slate-500">Informações que o Assistente IA usa para responder os usuários</p>
          </div>
          <Button onClick={() => openModal()} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="mb-4 bg-purple-50 border-purple-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-purple-700 flex items-start gap-2">
              <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Os documentos aqui cadastrados são usados pelo Assistente IA para responder perguntas dos usuários. 
              Você pode digitar o conteúdo manualmente ou sincronizar com um Google Docs público.</span>
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : registros.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Brain className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Nenhum documento na base de conhecimento</p>
              <Button onClick={() => openModal()} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Primeiro Documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {registros.map(reg => (
              <Card key={reg.id} className={!reg.ativo ? 'opacity-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {reg.fonte_tipo === 'google_docs' ? (
                          <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-slate-800">{reg.titulo}</h3>
                        <Badge variant="outline" className={reg.ativo ? 'border-green-300 text-green-700' : 'border-slate-300 text-slate-500'}>
                          {reg.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {reg.fonte_tipo === 'google_docs' && (
                          <Badge variant="outline" className="border-blue-300 text-blue-700">Google Docs</Badge>
                        )}
                      </div>
                      {reg.conteudo && (
                        <p className="text-sm text-slate-500 truncate">{reg.conteudo.substring(0, 120)}...</p>
                      )}
                      {reg.ultima_sincronizacao && (
                        <p className="text-xs text-slate-400 mt-1">
                          Última sincronização: {new Date(reg.ultima_sincronizacao).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {reg.fonte_tipo === 'google_docs' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleSync(reg)}
                          disabled={syncing === reg.id}
                          title="Sincronizar com Google Docs"
                        >
                          {syncing === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openModal(reg)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeleteId(reg.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Manual de Procedimentos, FAQ, Preços..." />
            </div>
            <div>
              <Label>Tipo de Fonte</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, fonte_tipo: 'manual' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${form.fonte_tipo === 'manual' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <FileText className="w-4 h-4" /> Texto Manual
                </button>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, fonte_tipo: 'google_docs' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${form.fonte_tipo === 'google_docs' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <Globe className="w-4 h-4" /> Google Docs
                </button>
              </div>
            </div>
            {form.fonte_tipo === 'google_docs' && (
              <div>
                <Label>URL do Google Docs</Label>
                <Input
                  value={form.fonte_url}
                  onChange={e => setForm(p => ({ ...p, fonte_url: e.target.value }))}
                  placeholder="https://docs.google.com/document/d/..."
                />
                <p className="text-xs text-slate-500 mt-1">O documento precisa estar compartilhado como "Qualquer pessoa com o link pode visualizar".</p>
              </div>
            )}
            <div>
              <Label>Conteúdo {form.fonte_tipo === 'google_docs' ? '(preenchido automaticamente ao sincronizar)' : '*'}</Label>
              <Textarea
                value={form.conteudo}
                onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))}
                placeholder="Digite o conteúdo que o assistente deve conhecer..."
                className="min-h-[200px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={form.ativo}
                onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))}
              />
              <Label htmlFor="ativo">Ativo (o assistente usa este documento)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}