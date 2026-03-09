import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

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