import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageSquare,
  Send,
  Check,
  Inbox,
  AlertTriangle,
  Lightbulb,
  MessageCircle,
  Loader2,
  CheckCheck,
  Eye,
  ShieldCheck
} from 'lucide-react';

const TIPOS = {
  comentario: { label: 'Comentário', icon: MessageCircle, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  queixa: { label: 'Queixa', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  reclamacao: { label: 'Reclamação', icon: AlertTriangle, color: 'bg-red-100 text-red-700 border-red-200' },
  sugestao: { label: 'Sugestão', icon: Lightbulb, color: 'bg-green-100 text-green-700 border-green-200' }
};

export default function MuralAnonimo() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({ tipo: 'comentario', categoria: '', mensagem: '' });
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [respondendoId, setRespondendoId] = useState(null);
  const [respostaTexto, setRespostaTexto] = useState('');

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null)).finally(() => setAuthChecked(true));
  }, []);

  const isAdmin = user?.role === 'admin';

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MuralAnonimo.create(data),
    onSuccess: () => {
      toast.success('Registro enviado! A administração foi notificada.');
      setForm({ tipo: 'comentario', categoria: '', mensagem: '' });
      qc.invalidateQueries(['mural-anonimo']);
    },
    onError: (e) => toast.error('Erro ao enviar: ' + (e.message || 'tente novamente'))
  });

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['mural-anonimo', filtroTipo],
    queryFn: () => base44.entities.MuralAnonimo.list('-created_date', 500),
    enabled: isAdmin,
    staleTime: 30 * 1000
  });

  const filtrados = filtroTipo === 'todos' ? registros : registros.filter(r => r.tipo === filtroTipo);
  const naoLidos = registros.filter(r => !r.lida).length;

  const marcarLida = async (r) => {
    if (r.lida) return;
    try {
      await base44.entities.MuralAnonimo.update(r.id, { lida: true });
      qc.invalidateQueries(['mural-anonimo']);
    } catch { toast.error('Erro ao marcar como lido'); }
  };

  const marcarTodasLidas = async () => {
    const pendentes = registros.filter(r => !r.lida);
    if (pendentes.length === 0) return;
    try {
      for (const r of pendentes) {
        await base44.entities.MuralAnonimo.update(r.id, { lida: true });
      }
      qc.invalidateQueries(['mural-anonimo']);
      toast.success(`${pendentes.length} registro(s) marcado(s) como lido(s)`);
    } catch { toast.error('Erro ao atualizar'); }
  };

  const enviarResposta = async (r) => {
    if (!respostaTexto.trim()) { toast.error('Digite a resposta'); return; }
    try {
      await base44.entities.MuralAnonimo.update(r.id, {
        resposta_admin: respostaTexto.trim(),
        respondido: true,
        data_resposta: new Date().toISOString(),
        respondido_por: user?.email || 'admin',
        lida: true
      });
      toast.success('Resposta registrada');
      setRespondendoId(null);
      setRespostaTexto('');
      qc.invalidateQueries(['mural-anonimo']);
    } catch { toast.error('Erro ao responder'); }
  };

  const submit = () => {
    if (!form.mensagem.trim()) { toast.error('Escreva a mensagem'); return; }
    createMutation.mutate({
      tipo: form.tipo,
      categoria: form.categoria.trim(),
      mensagem: form.mensagem.trim()
    });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mural Anônimo</h1>
            <p className="text-sm text-slate-500">
              {isAdmin ? 'Gerencie comentários, queixas e reclamações da equipe' : 'Envie comentários, queixas e reclamações à administração'}
            </p>
          </div>
        </div>

        {/* Formulário de envio (todos os usuários) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="w-5 h-5 text-orange-500" />
              Novo Registro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-600">
                Seu envio é <strong>anônimo</strong>. A administração não verá seu nome, apenas o conteúdo. Seja claro e respeitoso.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS).map(([k, t]) => (
                      <SelectItem key={k} value={k}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Categoria (opcional)</Label>
                <Input
                  placeholder="Ex: Atendimento, Ambiente, Processos..."
                  value={form.categoria}
                  onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Mensagem</Label>
              <Textarea
                placeholder="Escreva aqui seu comentário, queixa ou reclamação..."
                value={form.mensagem}
                onChange={(e) => setForm(f => ({ ...f, mensagem: e.target.value }))}
                className="min-h-[140px]"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={createMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Painel da administração */}
        {isAdmin && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-5 text-center">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-slate-800">{registros.length}</p>
                </CardContent>
              </Card>
              <Card className={naoLidos > 0 ? 'border-red-300 bg-red-50' : ''}>
                <CardContent className="pt-5 text-center">
                  <p className="text-xs text-slate-500">Não lidos</p>
                  <p className={`text-2xl font-bold ${naoLidos > 0 ? 'text-red-600' : 'text-slate-800'}`}>{naoLidos}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 text-center">
                  <p className="text-xs text-slate-500">Respondidos</p>
                  <p className="text-2xl font-bold text-green-600">{registros.filter(r => r.respondido).length}</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {Object.entries(TIPOS).map(([k, t]) => (
                      <SelectItem key={k} value={k}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {naoLidos > 0 && (
                <Button variant="outline" size="sm" onClick={marcarTodasLidas}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Marcar todos como lidos
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : filtrados.length === 0 ? (
              <Card className="py-10">
                <CardContent className="text-center text-slate-500">
                  <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  Nenhum registro encontrado
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtrados.map((r) => {
                  const T = TIPOS[r.tipo] || TIPOS.comentario;
                  const Icon = T.icon;
                  return (
                    <Card key={r.id} className={!r.lida ? 'border-l-4 border-l-orange-400' : ''}>
                      <CardContent className="pt-5 space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge className={T.color + ' border'}>
                              <Icon className="w-3 h-3 mr-1" />
                              {T.label}
                            </Badge>
                            {r.categoria && (
                              <Badge variant="outline">{r.categoria}</Badge>
                            )}
                            {!r.lida && (
                              <Badge className="bg-red-100 text-red-700 border border-red-200">Nova</Badge>
                            )}
                            {r.respondido && (
                              <Badge className="bg-green-100 text-green-700 border border-green-200">
                                <Check className="w-3 h-3 mr-1" /> Respondido
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {r.created_date ? format(new Date(r.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                          </p>
                        </div>

                        <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
                          {r.mensagem}
                        </p>

                        {r.resposta_admin && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Resposta da administração
                            </p>
                            <p className="text-sm text-green-700 whitespace-pre-wrap">{r.resposta_admin}</p>
                            {r.data_resposta && (
                              <p className="text-xs text-green-600 mt-1">
                                {r.respondido_por ? `${r.respondido_por} · ` : ''}
                                {format(new Date(r.data_resposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                          {!r.lida && (
                            <Button variant="ghost" size="sm" onClick={() => marcarLida(r)}>
                              <Eye className="w-4 h-4 mr-1" /> Marcar como lido
                            </Button>
                          )}
                          {!r.respondido && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRespondendoId(respondendoId === r.id ? null : r.id);
                                setRespostaTexto(r.resposta_admin || '');
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {respondendoId === r.id ? 'Cancelar' : 'Responder'}
                            </Button>
                          )}
                        </div>

                        {respondendoId === r.id && (
                          <div className="space-y-2 pt-2 border-t">
                            <Textarea
                              placeholder="Digite a resposta/parecer..."
                              value={respostaTexto}
                              onChange={(e) => setRespostaTexto(e.target.value)}
                              className="min-h-[80px]"
                            />
                            <div className="flex justify-end">
                              <Button size="sm" onClick={() => enviarResposta(r)} className="bg-green-600 hover:bg-green-700">
                                <Send className="w-3 h-3 mr-1" /> Registrar resposta
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}