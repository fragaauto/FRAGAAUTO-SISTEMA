import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Bell, CalendarDays } from 'lucide-react';
import EvolutionAPIConfig from './EvolutionAPIConfig';

export default function TabIntegracoes({ formData, onChange, setFormData, onSave, isSaving }) {
  return (
    <div className="space-y-6">
      <EvolutionAPIConfig formData={formData} setFormData={setFormData} />

      {/* Lembrete Automático de Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-500" />
            Lembrete Automático de Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            O sistema verificará periodicamente atendimentos ativos sem checklist e alertará sua equipe.
          </p>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <Label>Ativar lembrete automático</Label>
            <Switch checked={!!formData.lembrete_checklist_ativo} onCheckedChange={(v) => onChange('lembrete_checklist_ativo', v)} />
          </div>
          {formData.lembrete_checklist_ativo && (
            <>
              <div>
                <Label>Intervalo entre lembretes</Label>
                <Select
                  value={String(formData.lembrete_checklist_intervalo || 30)}
                  onValueChange={(v) => onChange('lembrete_checklist_intervalo', parseInt(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">A verificação ocorre nesse intervalo enquanto houver atendimentos ativos sem checklist.</p>
              </div>
              <div>
                <Label>WhatsApp(s) para receber lembretes</Label>
                <Textarea
                  value={formData.lembrete_checklist_whatsapp || ''}
                  onChange={e => onChange('lembrete_checklist_whatsapp', e.target.value)}
                  placeholder={"5511999999999\n5521888888888\n(um número por linha, com DDI)"}
                  className="min-h-[80px] font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Adicione um ou mais números, um por linha. Se vazio, usará o WhatsApp de atendimento.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Agenda Google */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-500" />
            Agenda — Integração Google
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-500">
            Configure a integração com Google Sheets e/ou Google Calendar para exibir agendamentos.
          </p>

          <div>
            <Label>🔑 Chave de API do Google (API Key)</Label>
            <Input
              value={formData.agenda_google_api_key}
              onChange={e => onChange('agenda_google_api_key', e.target.value)}
              placeholder="AIzaSy..."
              type="password"
            />
            <p className="text-xs text-slate-500 mt-1">
              Crie em <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-500 underline">console.cloud.google.com</a> → Credenciais → Criar Credencial → Chave de API.
            </p>
          </div>

          <hr />

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="text-green-600">📊</span> Google Sheets
            </h3>
            <div>
              <Label>ID da Planilha</Label>
              <Input
                value={formData.agenda_google_sheets_id}
                onChange={e => onChange('agenda_google_sheets_id', e.target.value)}
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              />
              <p className="text-xs text-slate-500 mt-1">
                Encontre na URL: docs.google.com/spreadsheets/d/<strong>[ID AQUI]</strong>/edit
              </p>
            </div>
            <div>
              <Label>Nome da Aba</Label>
              <Input
                value={formData.agenda_google_sheets_aba}
                onChange={e => onChange('agenda_google_sheets_aba', e.target.value)}
                placeholder="Agendamentos"
              />
            </div>
            <p className="text-xs font-medium text-slate-600">Mapeamento de colunas (letra da coluna):</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'agenda_sheets_col_data', label: 'Data' },
                { key: 'agenda_sheets_col_hora', label: 'Hora' },
                { key: 'agenda_sheets_col_cliente', label: 'Cliente' },
                { key: 'agenda_sheets_col_servico', label: 'Serviço' },
                { key: 'agenda_sheets_col_placa', label: 'Placa' },
                { key: 'agenda_sheets_col_obs', label: 'Observações' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={formData[key]}
                    onChange={e => onChange(key, e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={2}
                    className="uppercase"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              ⚠️ A planilha precisa estar compartilhada como "Qualquer pessoa com o link pode visualizar".
            </p>
          </div>

          <hr />

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="text-blue-600">📅</span> Google Calendar
            </h3>
            <div>
              <Label>ID do Calendário</Label>
              <Input
                value={formData.agenda_google_calendar_id}
                onChange={e => onChange('agenda_google_calendar_id', e.target.value)}
                placeholder="primary ou email@group.calendar.google.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                O calendário precisa estar configurado como <strong>público</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Integrações
        </Button>
      </div>
    </div>
  );
}