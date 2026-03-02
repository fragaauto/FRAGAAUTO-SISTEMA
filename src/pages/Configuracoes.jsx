import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, Loader2, Save, Plus, Trash2, Gift, UserCheck, Car, TrendingUp, Bell } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GerenciarStatus from '@/components/configuracoes/GerenciarStatus';

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
    whatsapp_atendimento: config.whatsapp_atendimento || '',
    mensagem_link_cliente: config.mensagem_link_cliente || '',
    mensagem_remarketing: config.mensagem_remarketing || '',
    formas_pagamento: config.formas_pagamento || [
      { nome: 'Dinheiro', ativa: true },
      { nome: 'PIX', ativa: true },
      { nome: 'Cartão de Débito', ativa: true },
      { nome: 'Cartão de Crédito', ativa: true }
    ],
    condicoes_especiais: config.condicoes_especiais || [],
    status_atendimento_personalizados: config.status_atendimento_personalizados || [],
    cliente_nome_obrigatorio: config.cliente_nome_obrigatorio ?? true,
    cliente_telefone_obrigatorio: config.cliente_telefone_obrigatorio ?? true,
    cliente_cpf_obrigatorio: config.cliente_cpf_obrigatorio ?? false,
    cliente_nascimento_obrigatorio: config.cliente_nascimento_obrigatorio ?? false,
    cliente_endereco_obrigatorio: config.cliente_endereco_obrigatorio ?? false,
    os_placa_obrigatorio: config.os_placa_obrigatorio ?? true,
    os_modelo_obrigatorio: config.os_modelo_obrigatorio ?? true,
    os_km_obrigatorio: config.os_km_obrigatorio ?? false,
    os_queixa_obrigatorio: config.os_queixa_obrigatorio ?? false,
    dias_minimos_reenvio: config.dias_minimos_reenvio || 30,
    dias_validade_oferta: config.dias_validade_oferta || 7,
    oferta_padrao_remarketing: config.oferta_padrao_remarketing || '',
    condicao_pagamento_remarketing: config.condicao_pagamento_remarketing || '',
    lembrete_checklist_ativo: config.lembrete_checklist_ativo ?? false,
    lembrete_checklist_intervalo: config.lembrete_checklist_intervalo || 30,
    lembrete_checklist_whatsapp: config.lembrete_checklist_whatsapp || '',
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
        whatsapp_atendimento: config.whatsapp_atendimento || '',
        mensagem_link_cliente: config.mensagem_link_cliente || '',
        mensagem_remarketing: config.mensagem_remarketing || '',
        formas_pagamento: config.formas_pagamento || [
          { nome: 'Dinheiro', ativa: true },
          { nome: 'PIX', ativa: true },
          { nome: 'Cartão de Débito', ativa: true },
          { nome: 'Cartão de Crédito', ativa: true }
        ],
        condicoes_especiais: config.condicoes_especiais || [],
        status_atendimento_personalizados: config.status_atendimento_personalizados || [],
        cliente_nome_obrigatorio: config.cliente_nome_obrigatorio ?? true,
        cliente_telefone_obrigatorio: config.cliente_telefone_obrigatorio ?? true,
        cliente_cpf_obrigatorio: config.cliente_cpf_obrigatorio ?? false,
        cliente_nascimento_obrigatorio: config.cliente_nascimento_obrigatorio ?? false,
        cliente_endereco_obrigatorio: config.cliente_endereco_obrigatorio ?? false,
        os_placa_obrigatorio: config.os_placa_obrigatorio ?? true,
        os_modelo_obrigatorio: config.os_modelo_obrigatorio ?? true,
        os_km_obrigatorio: config.os_km_obrigatorio ?? false,
        os_queixa_obrigatorio: config.os_queixa_obrigatorio ?? false,
        dias_minimos_reenvio: config.dias_minimos_reenvio || 30,
        dias_validade_oferta: config.dias_validade_oferta || 7,
        oferta_padrao_remarketing: config.oferta_padrao_remarketing || '',
        condicao_pagamento_remarketing: config.condicao_pagamento_remarketing || '',
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

        <Card>
          <CardHeader>
            <CardTitle>Mensagens Personalizadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Mensagem para Link do Cliente</Label>
              <Textarea
                value={formData.mensagem_link_cliente}
                onChange={(e) => setFormData(prev => ({ ...prev, mensagem_link_cliente: e.target.value }))}
                placeholder="O link abaixo é seu orçamento, clique para acessar. Caso não seja clicável para você, é só adicionar nosso contato que dá certo!"
                className="min-h-[100px]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Esta mensagem aparecerá junto com o link de aprovação do orçamento
              </p>
            </div>

            <div>
              <Label>Mensagem de Remarketing (Serviços Reprovados)</Label>
              <Textarea
                value={formData.mensagem_remarketing}
                onChange={(e) => setFormData(prev => ({ ...prev, mensagem_remarketing: e.target.value }))}
                placeholder="Olá! Tudo bem? Aqui é da {nome_empresa}! 😊&#10;&#10;Vimos que você consultou alguns serviços para seu {modelo} e preparamos uma oferta especial!&#10;&#10;"
                className="min-h-[120px]"
              />
              <p className="text-xs text-slate-500 mt-1">
                Mensagem inicial para ofertas de remarketing (aparecerá antes da lista de serviços)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">Selecione as formas de pagamento disponíveis que aparecerão no orçamento do cliente</p>
            {formData.formas_pagamento?.map((forma, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Label htmlFor={`forma-${idx}`}>{forma.nome}</Label>
                <Switch
                  id={`forma-${idx}`}
                  checked={forma.ativa}
                  onCheckedChange={(checked) => {
                    const novasFormas = [...formData.formas_pagamento];
                    novasFormas[idx].ativa = checked;
                    setFormData(prev => ({ ...prev, formas_pagamento: novasFormas }));
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-500" />
                Condições Especiais
              </CardTitle>
              <Button
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    condicoes_especiais: [
                      ...prev.condicoes_especiais,
                      {
                        valor_minimo: 0,
                        tipo: 'desconto',
                        descricao: '',
                        valor_desconto_percentual: 0,
                        parcelas_sem_juros: 0,
                        ativa: true
                      }
                    ]
                  }));
                }}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Condição
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Configure brindes, descontos e parcelamentos especiais baseados no valor do orçamento
            </p>

            {formData.condicoes_especiais?.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Gift className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Nenhuma condição especial configurada</p>
                <p className="text-sm">Clique em "Adicionar Condição" para criar uma</p>
              </div>
            ) : (
              formData.condicoes_especiais?.map((condicao, idx) => (
                <Card key={idx} className="border-2">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={condicao.ativa}
                          onCheckedChange={(checked) => {
                            const novasCondicoes = [...formData.condicoes_especiais];
                            novasCondicoes[idx].ativa = checked;
                            setFormData(prev => ({ ...prev, condicoes_especiais: novasCondicoes }));
                          }}
                        />
                        <Label>Ativa</Label>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const novasCondicoes = formData.condicoes_especiais.filter((_, i) => i !== idx);
                          setFormData(prev => ({ ...prev, condicoes_especiais: novasCondicoes }));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor Mínimo (R$)</Label>
                        <Input
                          type="number"
                          value={condicao.valor_minimo}
                          onChange={(e) => {
                            const novasCondicoes = [...formData.condicoes_especiais];
                            novasCondicoes[idx].valor_minimo = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, condicoes_especiais: novasCondicoes }));
                          }}
                          placeholder="Ex: 300"
                        />
                      </div>

                      <div>
                        <Label>Tipo de Condição</Label>
                        <Select
                          value={condicao.tipo}
                          onValueChange={(value) => {
                            const novasCondicoes = [...formData.condicoes_especiais];
                            novasCondicoes[idx].tipo = value;
                            setFormData(prev => ({ ...prev, condicoes_especiais: novasCondicoes }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desconto">Desconto</SelectItem>
                            <SelectItem value="parcelamento">Parcelamento</SelectItem>
                            <SelectItem value="brinde">Brinde</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={condicao.descricao}
                        onChange={(e) => {
                          const novasCondicoes = [...formData.condicoes_especiais];
                          novasCondicoes[idx].descricao = e.target.value;
                          setFormData(prev => ({ ...prev, condicoes_especiais: novasCondicoes }));
                        }}
                        placeholder="Ex: Ganhe uma lavagem de cortesia"
                      />
                    </div>

                    {condicao.tipo === 'desconto' && (
                      <div>
                        <Label>Desconto (%)</Label>
                        <Input
                          type="number"
                          value={condicao.valor_desconto_percentual || ''}
                          onChange={(e) => {
                            const novasCondicoes = [...formData.condicoes_especiais];
                            novasCondicoes[idx].valor_desconto_percentual = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, condicoes_especiais: novasCondicoes }));
                          }}
                          placeholder="Ex: 10"
                        />
                      </div>
                    )}

                    {condicao.tipo === 'parcelamento' && (
                      <div>
                        <Label>Parcelas sem juros</Label>
                        <Input
                          type="number"
                          value={condicao.parcelas_sem_juros || ''}
                          onChange={(e) => {
                            const novasCondicoes = [...formData.condicoes_especiais];
                            novasCondicoes[idx].parcelas_sem_juros = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, condicoes_especiais: novasCondicoes }));
                          }}
                          placeholder="Ex: 6"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
        {/* Campos Obrigatórios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-500" />
              Campos Obrigatórios — Cadastro de Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Defina quais campos são obrigatórios ao cadastrar um novo cliente.</p>
            {[
              { key: 'cliente_nome_obrigatorio', label: 'Nome' },
              { key: 'cliente_telefone_obrigatorio', label: 'Telefone' },
              { key: 'cliente_cpf_obrigatorio', label: 'CPF / CNPJ' },
              { key: 'cliente_nascimento_obrigatorio', label: 'Data de Nascimento' },
              { key: 'cliente_endereco_obrigatorio', label: 'Endereço' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Label>{label}</Label>
                <Switch
                  checked={!!formData[key]}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <GerenciarStatus
          statusPersonalizados={formData.status_atendimento_personalizados}
          onChange={(val) => setFormData(prev => ({ ...prev, status_atendimento_personalizados: val }))}
        />

        {/* REMARKETING */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Configurações de Remarketing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dias mínimos para reenvio</Label>
                <Input
                  type="number"
                  value={formData.dias_minimos_reenvio || 30}
                  onChange={(e) => setFormData(prev => ({ ...prev, dias_minimos_reenvio: parseInt(e.target.value) || 30 }))}
                  placeholder="30"
                />
                <p className="text-xs text-slate-500 mt-1">Não reenvia antes de X dias do último contato</p>
              </div>
              <div>
                <Label>Dias de validade da oferta</Label>
                <Input
                  type="number"
                  value={formData.dias_validade_oferta || 7}
                  onChange={(e) => setFormData(prev => ({ ...prev, dias_validade_oferta: parseInt(e.target.value) || 7 }))}
                  placeholder="7"
                />
              </div>
            </div>
            <div>
              <Label>Oferta Padrão</Label>
              <Input
                value={formData.oferta_padrao_remarketing || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, oferta_padrao_remarketing: e.target.value }))}
                placeholder="Ex: 10% de desconto à vista"
              />
            </div>
            <div>
              <Label>Condição de Pagamento Padrão</Label>
              <Input
                value={formData.condicao_pagamento_remarketing || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, condicao_pagamento_remarketing: e.target.value }))}
                placeholder="Ex: 6x sem juros no cartão"
              />
            </div>
            <div>
              <Label>Texto Base da Mensagem de Remarketing</Label>
              <Textarea
                value={formData.mensagem_remarketing || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, mensagem_remarketing: e.target.value }))}
                className="min-h-[180px] font-mono text-sm"
                placeholder={`Olá {nome} 👋\n\nNa sua última visita identificamos que no seu {veiculo} ficou pendente:\n\n{lista_servicos}\n\nTotal do serviço: R$ {total}\n\nTenho uma condição especial pra você!\n\n{oferta}\nCondição: {condicao}\n\nConsigo manter essa condição até {data_validade}.\n\nPosso agendar para você?`}
              />
              <p className="text-xs text-slate-500 mt-1">
                Variáveis: {'{nome}'} {'{veiculo}'} {'{lista_servicos}'} {'{total}'} {'{oferta}'} {'{condicao}'} {'{data_validade}'} {'{nome_empresa}'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-orange-500" />
              Campos Obrigatórios — Abertura de OS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Defina quais campos são obrigatórios ao criar um novo atendimento.</p>
            {[
              { key: 'os_placa_obrigatorio', label: 'Placa do Veículo' },
              { key: 'os_modelo_obrigatorio', label: 'Modelo do Veículo' },
              { key: 'os_km_obrigatorio', label: 'KM Atual' },
              { key: 'os_queixa_obrigatorio', label: 'Queixa Inicial' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Label>{label}</Label>
                <Switch
                  checked={!!formData[key]}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}