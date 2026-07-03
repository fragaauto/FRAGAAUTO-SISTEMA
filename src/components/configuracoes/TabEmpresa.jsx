import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Building2, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";

const DIAS_SEMANA = [
  { id: 0, nome: 'Dom' },
  { id: 1, nome: 'Seg' },
  { id: 2, nome: 'Ter' },
  { id: 3, nome: 'Qua' },
  { id: 4, nome: 'Qui' },
  { id: 5, nome: 'Sex' },
  { id: 6, nome: 'Sáb' }
];

export default function TabEmpresa({ formData, onChange, onSave, isSaving }) {
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange('logo_url', file_url);
      toast.success('Logo enviado!');
    } catch {
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Logotipo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {formData.logo_url && (
            <div className="flex justify-center p-4 bg-slate-50 rounded-lg">
              <img src={formData.logo_url} alt="Logo" className="max-h-32 object-contain" />
            </div>
          )}
          <div>
            <Label htmlFor="logo">Upload do Logo</Label>
            <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="cursor-pointer" />
            {uploadingLogo && <p className="text-sm text-slate-500 mt-2">Enviando...</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            Dados da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome da Empresa *</Label>
            <Input value={formData.nome_empresa} onChange={e => onChange('nome_empresa', e.target.value)} placeholder="Fraga Auto Portas" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefone</Label>
              <Input value={formData.telefone} onChange={e => onChange('telefone', e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={formData.email} onChange={e => onChange('email', e.target.value)} placeholder="contato@empresa.com" />
            </div>
          </div>
          <div>
            <Label>Endereço Completo</Label>
            <Input value={formData.endereco} onChange={e => onChange('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade - UF" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CNPJ</Label>
              <Input value={formData.cnpj} onChange={e => onChange('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <Label>Site</Label>
              <Input value={formData.site} onChange={e => onChange('site', e.target.value)} placeholder="www.empresa.com" />
            </div>
          </div>
          <div>
            <Label>Instagram</Label>
            <Input value={formData.instagram} onChange={e => onChange('instagram', e.target.value)} placeholder="@empresa" />
          </div>
          <div>
            <Label>WhatsApp Atendimento</Label>
            <Input value={formData.whatsapp_atendimento} onChange={e => onChange('whatsapp_atendimento', e.target.value)} placeholder="5511999999999" />
            <p className="text-xs text-slate-500 mt-1">Apenas números com código do país (ex: 5511999999999)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Controle de Horário de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <div>
              <Label>Restringir acesso por horário</Label>
              <p className="text-xs text-slate-500">Usuários comuns só acessam no horário e dias permitidos. Administradores sempre têm acesso.</p>
            </div>
            <Switch checked={!!formData.restringir_horario_acesso} onCheckedChange={v => onChange('restringir_horario_acesso', v)} />
          </div>
          {formData.restringir_horario_acesso && (
            <div className="space-y-2">
              <Label className="mb-1 block">Horário por dia da semana</Label>
              <p className="text-xs text-slate-500 mb-2">Ative os dias e defina o horário permitido. Dias desativados ficam bloqueados.</p>
              {DIAS_SEMANA.map(d => {
                const entry = (formData.horarios_acesso || []).find(h => h.dia === d.id);
                const ativo = !!entry;
                return (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg flex-wrap">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <Switch checked={ativo} onCheckedChange={v => {
                        const current = formData.horarios_acesso || [];
                        if (v) {
                          onChange('horarios_acesso', [...current, { dia: d.id, inicio: '08:00', fim: '18:00' }]);
                        } else {
                          onChange('horarios_acesso', current.filter(h => h.dia !== d.id));
                        }
                      }} />
                      <span className="font-medium text-slate-700">{d.nome}</span>
                    </div>
                    {ativo && (
                      <div className="flex items-center gap-2 ml-auto">
                        <Input type="time" value={entry?.inicio || ''} onChange={e => {
                          const current = formData.horarios_acesso || [];
                          onChange('horarios_acesso', current.map(h => h.dia === d.id ? { ...h, inicio: e.target.value } : h));
                        }} className="w-32" />
                        <span className="text-slate-400">até</span>
                        <Input type="time" value={entry?.fim || ''} onChange={e => {
                          const current = formData.horarios_acesso || [];
                          onChange('horarios_acesso', current.map(h => h.dia === d.id ? { ...h, fim: e.target.value } : h));
                        }} className="w-32" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mensagens Personalizadas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Mensagem para Link do Cliente</Label>
            <Textarea
              value={formData.mensagem_link_cliente}
              onChange={e => onChange('mensagem_link_cliente', e.target.value)}
              placeholder="O link abaixo é seu orçamento..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-slate-500 mt-1">Esta mensagem aparecerá junto com o link de aprovação do orçamento</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Empresa
        </Button>
      </div>
    </div>
  );
}