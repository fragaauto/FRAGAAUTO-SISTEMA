import React, { useState, useMemo } from 'react';
import { useUnidade } from '@/lib/UnidadeContext';

const UNIDADE_AUTO_PORTAS_ID = '69ea76b72f920804f5d68eab';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Calendar, Clock, User, Car, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, RefreshCw, MessageCircle, ArrowRight } from 'lucide-react';
import { format, addDays, subDays, startOfDay, endOfDay, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS = {
  agendado: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmado: 'bg-green-100 text-green-700 border-green-200',
  em_andamento: 'bg-orange-100 text-orange-700 border-orange-200',
  concluido: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelado: 'bg-red-100 text-red-600 border-red-200',
};

const STATUS_LABELS = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  convertido_atendimento: 'Convertido em OS',
};

const EMPTY_FORM = {
  titulo: '',
  cliente_nome: '',
  cliente_telefone: '',
  placa: '',
  modelo: '',
  data_hora: '',
  duracao_minutos: 60,
  tecnico: '',
  observacoes: '',
  status: 'agendado',
};

function AgendamentoModal({ open, onClose, agendamento, onSaved, unidadeId, dataHoraInicial }) {
  const isEdicao = !!(agendamento?.id);
  const [form, setForm] = useState(() => {
    if (isEdicao) {
      return {
        ...agendamento,
        data_hora: agendamento.data_hora ? format(new Date(agendamento.data_hora), "yyyy-MM-dd'T'HH:mm") : '',
      };
    }
    return { ...EMPTY_FORM, data_hora: dataHoraInicial || '' };
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.titulo || !form.data_hora) return toast.error('Informe título e data/hora');
    setSaving(true);
    const data = { ...form, data_hora: new Date(form.data_hora).toISOString(), duracao_minutos: parseInt(form.duracao_minutos) || 60 };
    if (isEdicao) {
      await base44.entities.Agendamento.update(agendamento.id, data);
    } else {
      await base44.entities.Agendamento.create({ ...data, unidade_id: unidadeId });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Serviço / Título *</Label>
            <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Troca de película, Instalação alarme..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data e Hora *</Label>
              <Input type="datetime-local" value={form.data_hora} onChange={e => set('data_hora', e.target.value)} />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input type="number" value={form.duracao_minutos} onChange={e => set('duracao_minutos', e.target.value)} min={15} step={15} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <Input value={form.cliente_nome} onChange={e => set('cliente_nome', e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.cliente_telefone} onChange={e => set('cliente_telefone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Placa</Label>
              <Input value={form.placa} onChange={e => set('placa', e.target.value.toUpperCase())} placeholder="ABC-1234" />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="Ex: Civic, HB20..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Técnico</Label>
              <Input value={form.tecnico} onChange={e => set('tecnico', e.target.value)} placeholder="Nome do técnico" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Anotações adicionais..." className="min-h-[70px]" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {agendamento ? 'Salvar Alterações' : 'Criar Agendamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Agenda() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dataBase, setDataBase] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [confirmandoPresenca, setConfirmandoPresenca] = useState(null);
  const [msgConfirmacao, setMsgConfirmacao] = useState('');

  const { unidadeAtual } = useUnidade();

  const { data: agendamentosBrutos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => base44.entities.Agendamento.list('data_hora'),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const agendamentos = useMemo(() => {
    if (!unidadeAtual) return agendamentosBrutos;
    return agendamentosBrutos.filter(a => {
      if (a.unidade_id) return a.unidade_id === unidadeAtual.id;
      return unidadeAtual.id === UNIDADE_AUTO_PORTAS_ID;
    });
  }, [agendamentosBrutos, unidadeAtual]);

  // Real-time
  React.useEffect(() => {
    const unsub = base44.entities.Agendamento.subscribe(() => {
      qc.invalidateQueries(['agendamentos']);
    });
    return unsub;
  }, []);

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Agendamento.delete(id),
    onSuccess: () => { toast.success('Agendamento excluído'); qc.invalidateQueries(['agendamentos']); },
  });

  const diasVisiveis = [dataBase, addDays(dataBase, 1), addDays(dataBase, 2)];

  const agDoDia = (dia) => agendamentos
    .filter(a => {
      if (!a.data_hora) return false;
      const d = new Date(a.data_hora);
      return d >= startOfDay(dia) && d <= endOfDay(dia);
    })
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const onSaved = () => {
    setShowModal(false);
    setEditando(null);
    qc.invalidateQueries(['agendamentos']);
    toast.success('Agendamento salvo!');
  };

  const { data: todosAtendimentos = [] } = useQuery({
    queryKey: ['atendimentos-count'],
    queryFn: () => base44.entities.Atendimento.list(),
    staleTime: 60 * 1000
  });

  const converterEmAtendimento = async (ag) => {
    const maxOs = todosAtendimentos.reduce((max, a) => Math.max(max, a.numero_os || 0), 0);
    const novoNumeroOs = maxOs + 1;
    const result = await base44.entities.Atendimento.create({
      unidade_id: ag.unidade_id || '',
      numero_os: novoNumeroOs,
      cliente_nome: ag.cliente_nome || '',
      cliente_telefone: ag.cliente_telefone || '',
      placa: ag.placa || '',
      modelo: ag.modelo || '',
      tecnico: ag.tecnico || '',
      observacoes: ag.observacoes || '',
      data_entrada: new Date().toISOString(),
      status: 'queixa_pendente',
      historico_edicoes: [{ data: new Date().toISOString(), usuario: 'Sistema', campo_editado: 'criacao', descricao: `Convertido do agendamento: ${ag.titulo}` }]
    });
    await base44.entities.Agendamento.update(ag.id, { status: 'convertido_atendimento' });
    qc.invalidateQueries(['agendamentos']);
    toast.success('Atendimento criado com sucesso!');
    navigate(createPageUrl(`VerAtendimento?id=${result.id}`));
  };

  const abrirConfirmacaoPresenca = (ag) => {
    const horario = ag.data_hora ? new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    setMsgConfirmacao(`Olá ${ag.cliente_nome || ''}! Seu agendamento está marcado para hoje às ${horario}. Você vai conseguir vir mesmo?`);
    setConfirmandoPresenca(ag);
  };

  const enviarConfirmacaoPresenca = () => {
    const telefone = confirmandoPresenca?.cliente_telefone?.replace(/\D/g, '');
    if (!telefone) { toast.error('Cliente sem telefone'); return; }
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(msgConfirmacao)}`, '_blank');
    setConfirmandoPresenca(null);
  };

  const sincronizarSheets = async () => {
    setSincronizando(true);
    try {
      const res = await base44.functions.invoke('sincronizarAgenda', { unidade_id: unidadeAtual?.id || null });
      const msg = res.data?.message || 'Sincronizado!';
      toast.success(msg);
      qc.invalidateQueries(['agendamentos']);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Erro ao sincronizar com Google Sheets');
    } finally {
      setSincronizando(false);
    }
  };

  const labelDia = (dia) => {
    if (isToday(dia)) return 'Hoje';
    if (isTomorrow(dia)) return 'Amanhã';
    return format(dia, "EEE", { locale: ptBR });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-orange-500" /> Agenda de Serviços
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Serviços agendados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={sincronizarSheets} disabled={sincronizando}>
              {sincronizando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Sync Sheets
            </Button>
            <Button onClick={() => { setEditando(null); setShowModal(true); }} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-1" /> Novo Agendamento
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Navegação de datas */}
        <div className="flex items-center justify-between mb-5">
          <Button variant="outline" size="icon" onClick={() => setDataBase(d => subDays(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setDataBase(new Date())} className="text-orange-600 border-orange-200 hover:bg-orange-50">
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDataBase(addDays(new Date(), 1))}>
              Amanhã
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDataBase(d => addDays(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Colunas de dias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {diasVisiveis.map((dia, idx) => {
            const ags = agDoDia(dia);
            const isHoje = isToday(dia);
            return (
              <div key={idx}>
                <div className={`rounded-xl border-2 overflow-hidden ${isHoje ? 'border-orange-300' : 'border-slate-200'}`}>
                  {/* Cabeçalho do dia */}
                  <div className={`px-4 py-3 flex items-center justify-between ${isHoje ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <div>
                      <p className="font-bold text-sm">{labelDia(dia)}</p>
                      <p className={`text-xs ${isHoje ? 'text-orange-100' : 'text-slate-500'}`}>
                        {format(dia, "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge className={`${isHoje ? 'bg-white text-orange-600' : 'bg-white text-slate-700'} text-xs font-bold`}>
                      {ags.length} serviço{ags.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Lista */}
                  <div className="p-3 space-y-2 min-h-[100px] bg-white">
                    {isLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                    ) : ags.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-4">Sem serviços</p>
                    ) : (
                      ags.map(ag => (
                        <div key={ag.id} className={`p-3 rounded-lg border text-sm ${STATUS_COLORS[ag.status] || STATUS_COLORS.agendado}`}>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span className="font-bold text-xs">{format(new Date(ag.data_hora), 'HH:mm')}</span>
                                {ag.duracao_minutos && <span className="text-xs opacity-70">· {ag.duracao_minutos}min</span>}
                              </div>
                              <p className="font-semibold truncate">{ag.titulo}</p>
                              {ag.cliente_nome && (
                                <p className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
                                  <User className="w-3 h-3" /> {ag.cliente_nome}
                                </p>
                              )}
                              {ag.placa && (
                                <p className="text-xs opacity-80 flex items-center gap-1">
                                  <Car className="w-3 h-3" /> {ag.placa}{ag.modelo ? ` · ${ag.modelo}` : ''}
                                </p>
                              )}
                              {ag.tecnico && <p className="text-xs opacity-70 mt-0.5">Téc: {ag.tecnico}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                              <button onClick={() => abrirConfirmacaoPresenca(ag)} className="opacity-60 hover:opacity-100" title="Confirmar presença">
                                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                              </button>
                              <button onClick={() => converterEmAtendimento(ag)} className="opacity-60 hover:opacity-100" title="Converter em atendimento">
                                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                              <button onClick={() => { setEditando(ag); setShowModal(true); }} className="opacity-60 hover:opacity-100">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="opacity-60 hover:opacity-100">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                                    <AlertDialogDescription>"{ag.titulo}" será removido permanentemente.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(ag.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          {ag.observacoes && <p className="text-xs opacity-70 mt-1.5 border-t border-current/20 pt-1.5">{ag.observacoes}</p>}
                        </div>
                      ))
                    )}

                    {/* Botão rápido de adicionar */}
                    <button
                      onClick={() => {
                        const dataStr = format(dia, "yyyy-MM-dd") + 'T09:00';
                        setEditando({ ...EMPTY_FORM, data_hora: dataStr });
                        setShowModal(true);
                      }}
                      className="w-full text-xs text-slate-400 hover:text-orange-500 py-1.5 border border-dashed border-slate-200 hover:border-orange-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <AgendamentoModal
          open={showModal}
          onClose={() => { setShowModal(false); setEditando(null); }}
          agendamento={editando?.id ? editando : null}
          dataHoraInicial={!editando?.id ? editando?.data_hora : undefined}
          onSaved={onSaved}
          unidadeId={unidadeAtual?.id}
        />
      )}

      {/* Modal confirmação de presença */}
      <Dialog open={!!confirmandoPresenca} onOpenChange={() => setConfirmandoPresenca(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Presença via WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Edite a mensagem antes de enviar:</p>
            <Textarea
              value={msgConfirmacao}
              onChange={e => setMsgConfirmacao(e.target.value)}
              className="min-h-[100px]"
            />
            <Button onClick={enviarConfirmacaoPresenca} className="w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-4 h-4 mr-2" /> Abrir WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}