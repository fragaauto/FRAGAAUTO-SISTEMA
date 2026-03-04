import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Edit, Save, X, Loader2, MessageCircle } from 'lucide-react';

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const LEMBRETE_VAZIO = {
  nome: '',
  mensagem: '',
  horario: '08:00',
  dias_semana: [],
  tipo: 'personalizado',
  ativo: true,
};

function FormLembrete({ lembrete, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(lembrete);

  const toggleDia = (dia) => {
    const atual = form.dias_semana || [];
    if (atual.includes(dia)) {
      setForm(f => ({ ...f, dias_semana: atual.filter(d => d !== dia) }));
    } else {
      setForm(f => ({ ...f, dias_semana: [...atual, dia].sort() }));
    }
  };

  return (
    <div className="space-y-4 p-4 border border-orange-200 bg-orange-50 rounded-xl">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nome do lembrete *</Label>
          <Input
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Ex: Resumo diário da agenda"
          />
        </div>
        <div>
          <Label>Horário de envio *</Label>
          <Input
            type="time"
            value={form.horario}
            onChange={e => setForm(f => ({ ...f, horario: e.target.value }))}
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personalizado">Personalizado</SelectItem>
              <SelectItem value="resumo_agenda">Resumo da Agenda (automático)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Dias da semana (vazio = todos os dias)</Label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {DIAS_SEMANA.map(d => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDia(d.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                (form.dias_semana || []).includes(d.value)
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-orange-400'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>
          Mensagem {form.tipo === 'resumo_agenda' ? '(opcional — gerada automaticamente)' : '*'}
        </Label>
        <Textarea
          value={form.mensagem}
          onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
          placeholder={
            form.tipo === 'resumo_agenda'
              ? 'Deixe vazio para usar o resumo automático dos agendamentos.'
              : 'Digite a mensagem que será enviada...'
          }
          className="min-h-[100px]"
        />
        {form.tipo === 'personalizado' && (
          <p className="text-xs text-slate-500 mt-1">Esta mensagem será enviada a todos os contatos ativos do WhatsApp.</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} size="sm">
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
        <Button
          onClick={() => onSave(form)}
          disabled={isSaving || !form.nome || !form.horario}
          className="bg-orange-500 hover:bg-orange-600"
          size="sm"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

export default function LembretesWhatsApp() {
  const qc = useQueryClient();
  const [editandoId, setEditandoId] = useState(null);
  const [criandoNovo, setCriandoNovo] = useState(false);

  const { data: lembretes = [], isLoading } = useQuery({
    queryKey: ['lembretes-whatsapp'],
    queryFn: () => base44.entities.LembreteWhatsApp.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LembreteWhatsApp.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['lembretes-whatsapp']);
      setCriandoNovo(false);
      toast.success('Lembrete criado!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LembreteWhatsApp.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['lembretes-whatsapp']);
      setEditandoId(null);
      toast.success('Lembrete atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LembreteWhatsApp.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['lembretes-whatsapp']);
      toast.success('Lembrete removido!');
    },
  });

  const toggleAtivo = (l) => {
    updateMutation.mutate({ id: l.id, data: { ativo: !l.ativo } });
  };

  const labelDias = (dias) => {
    if (!dias || dias.length === 0) return 'Todos os dias';
    return dias.map(d => DIAS_SEMANA.find(s => s.value === d)?.label).join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-500" />
            Lembretes e Mensagens Automáticas — WhatsApp
          </CardTitle>
          {!criandoNovo && (
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => { setCriandoNovo(true); setEditandoId(null); }}
            >
              <Plus className="w-4 h-4 mr-1" /> Novo Lembrete
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          Configure mensagens automáticas para serem enviadas a todos os contatos ativos do assistente WhatsApp em horários programados.
          O <strong>Resumo da Agenda</strong> já está pré-configurado para as 17h30 todos os dias.
        </p>

        {criandoNovo && (
          <FormLembrete
            lembrete={LEMBRETE_VAZIO}
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setCriandoNovo(false)}
            isSaving={createMutation.isPending}
          />
        )}

        {isLoading && <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-400" /></div>}

        {!isLoading && lembretes.length === 0 && !criandoNovo && (
          <div className="text-center py-8 text-slate-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Nenhum lembrete configurado.</p>
            <p className="text-sm">Clique em "Novo Lembrete" para criar.</p>
          </div>
        )}

        {lembretes.map(l => (
          <div key={l.id}>
            {editandoId === l.id ? (
              <FormLembrete
                lembrete={l}
                onSave={(data) => updateMutation.mutate({ id: l.id, data })}
                onCancel={() => setEditandoId(null)}
                isSaving={updateMutation.isPending}
              />
            ) : (
              <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <Switch checked={!!l.ativo} onCheckedChange={() => toggleAtivo(l)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{l.nome}</span>
                    <Badge className={l.ativo ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}>
                      {l.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {l.tipo === 'resumo_agenda' ? '📅 Resumo Agenda' : '✉️ Personalizado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    🕐 {l.horario} &nbsp;·&nbsp; 📆 {labelDias(l.dias_semana)}
                  </p>
                  {l.mensagem && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{l.mensagem}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditandoId(l.id); setCriandoNovo(false); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteMutation.mutate(l.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}