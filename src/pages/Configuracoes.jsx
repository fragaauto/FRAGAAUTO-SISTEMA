import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, Upload, Loader2, Save } from 'lucide-react';

export default function Configuracoes() {
  const queryClient = useQueryClient();
  const [uploadingLogo, setUploadingLogo] = React.useState(false);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000
  });

  const config = configs[0] || {};

  const [formData, setFormData] = React.useState({
    nome_empresa: config.nome_empresa || 'Fraga Auto Portas',
    endereco: config.endereco || '',
    telefone: config.telefone || '',
    email: config.email || '',
    cnpj: config.cnpj || '',
    site: config.site || '',
    instagram: config.instagram || '',
    logo_url: config.logo_url || '',
    whatsapp_atendimento: config.whatsapp_atendimento || ''
  });

  React.useEffect(() => {
    if (config.id) {
      setFormData({
        nome_empresa: config.nome_empresa || 'Fraga Auto Portas',
        endereco: config.endereco || '',
        telefone: config.telefone || '',
        email: config.email || '',
        cnpj: config.cnpj || '',
        site: config.site || '',
        instagram: config.instagram || '',
        logo_url: config.logo_url || '',
        whatsapp_atendimento: config.whatsapp_atendimento || ''
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (config.id) {
        return base44.entities.Configuracao.update(config.id, data);
      }
      return base44.entities.Configuracao.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracoes']);
      toast.success('Configurações salvas!');
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo enviado!');
    } catch (error) {
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-6 h-6 text-orange-500" />
                Configurações da Empresa
              </h1>
              <p className="text-slate-500">Personalize os dados que aparecem nos orçamentos</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Logotipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.logo_url && (
              <div className="flex justify-center p-4 bg-slate-50 rounded-lg">
                <img 
                  src={formData.logo_url} 
                  alt="Logo" 
                  className="max-h-32 object-contain"
                />
              </div>
            )}
            <div>
              <Label htmlFor="logo">Upload do Logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="cursor-pointer"
              />
              {uploadingLogo && <p className="text-sm text-slate-500 mt-2">Enviando...</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da Empresa *</Label>
              <Input
                value={formData.nome_empresa}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_empresa: e.target.value }))}
                placeholder="Fraga Auto Portas"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>
            <div>
              <Label>Endereço Completo</Label>
              <Input
                value={formData.endereco}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <Label>Site</Label>
                <Input
                  value={formData.site}
                  onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
                  placeholder="www.empresa.com"
                />
              </div>
            </div>
            <div>
              <Label>Instagram</Label>
              <Input
                value={formData.instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="@empresa"
              />
            </div>
            <div>
              <Label>WhatsApp Atendimento</Label>
              <Input
                value={formData.whatsapp_atendimento}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_atendimento: e.target.value }))}
                placeholder="5511999999999 (apenas números com DDI)"
              />
              <p className="text-xs text-slate-500 mt-1">
                Digite apenas números com código do país (ex: 5511999999999)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}