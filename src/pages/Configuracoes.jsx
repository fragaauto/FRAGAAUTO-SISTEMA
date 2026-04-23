import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Building2, DollarSign, ClipboardCheck, TrendingUp, Plug, Package, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TabEmpresa from '@/components/configuracoes/TabEmpresa';
import TabFinanceiro from '@/components/configuracoes/TabFinanceiro';
import TabAtendimento from '@/components/configuracoes/TabAtendimento';
import TabMarketing from '@/components/configuracoes/TabMarketing';
import TabIntegracoes from '@/components/configuracoes/TabIntegracoes';
import { TODOS_MODULOS } from '@/components/modulos';

const DEFAULT_FORMAS = [
  { nome: 'Dinheiro', ativa: true },
  { nome: 'PIX', ativa: true },
  { nome: 'Cartão de Crédito', ativa: true },
  { nome: 'Cartão de Débito', ativa: true },
  { nome: 'Transferência', ativa: false },
  { nome: 'Boleto', ativa: false },
  { nome: 'Faturado', ativa: false },
];

const DEFAULT_FORM = {
  nome_empresa: '',
  endereco: '',
  telefone: '',
  email: '',
  logo_url: '',
  cnpj: '',
  site: '',
  instagram: '',
  whatsapp_atendimento: '',
  mensagem_link_cliente: '',
  mensagem_remarketing: '',
  formas_pagamento: DEFAULT_FORMAS,
  taxas_pagamento: [],
  parcelas_credito: [],
  impostos: [],
  condicoes_especiais: [],
  status_atendimento_personalizados: [],
  cliente_nome_obrigatorio: true,
  cliente_telefone_obrigatorio: true,
  cliente_cpf_obrigatorio: false,
  cliente_nascimento_obrigatorio: false,
  cliente_endereco_obrigatorio: false,
  os_placa_obrigatorio: true,
  os_modelo_obrigatorio: true,
  os_km_obrigatorio: false,
  os_queixa_obrigatorio: false,
  os_tecnico_obrigatorio: false,
  dias_minimos_reenvio: 30,
  dias_validade_oferta: 7,
  oferta_padrao_remarketing: '',
  condicao_pagamento_remarketing: '',
  lembrete_checklist_ativo: false,
  lembrete_checklist_intervalo: 30,
  lembrete_checklist_whatsapp: '',
  agenda_google_sheets_id: '',
  agenda_google_sheets_aba: '',
  agenda_google_calendar_id: '',
  agenda_google_api_key: '',
  agenda_sheets_col_data: '',
  agenda_sheets_col_hora: '',
  agenda_sheets_col_cliente: '',
  agenda_sheets_col_servico: '',
  agenda_sheets_col_placa: '',
  agenda_sheets_col_obs: '',
  evolution_api_url: '',
  evolution_api_key: '',
  evolution_instance: '',
  modulos_ativos: TODOS_MODULOS.map(m => m.id),
};

export default function Configuracoes() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [configId, setConfigId] = useState(null);

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
  });

  useEffect(() => {
    if (configs.length > 0) {
      const c = configs[0];
      setConfigId(c.id);
      setFormData({
        ...DEFAULT_FORM,
        ...c,
        formas_pagamento: c.formas_pagamento?.length ? c.formas_pagamento : DEFAULT_FORMAS,
      });
    }
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: (data) => configId
      ? base44.entities.Configuracao.update(configId, data)
      : base44.entities.Configuracao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracoes']);
      toast.success('Configurações salvas!');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => saveMutation.mutate(formData);

  const commonProps = {
    formData,
    onChange: handleChange,
    onSave: handleSave,
    isSaving: saveMutation.isPending,
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Configurações</h1>

      <Tabs defaultValue="empresa">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
          <TabsTrigger value="empresa" className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />Empresa
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />Financeiro
          </TabsTrigger>
          <TabsTrigger value="atendimento" className="flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4" />Atendimento
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />Marketing
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="flex items-center gap-1.5">
            <Plug className="w-4 h-4" />Integrações
          </TabsTrigger>
          <TabsTrigger value="modulos" className="flex items-center gap-1.5">
            <Package className="w-4 h-4" />Módulos
          </TabsTrigger>
        </TabsList>

        <div className="mb-4">
          <Link
            to={createPageUrl('GerenciarUnidades')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm font-medium"
          >
            <Layers className="w-4 h-4" />
            Gerenciar Unidades (Auto Portas / Lava Jato)
          </Link>
        </div>

        <TabsContent value="empresa">
          <TabEmpresa {...commonProps} />
        </TabsContent>

        <TabsContent value="financeiro">
          <TabFinanceiro {...commonProps} />
        </TabsContent>

        <TabsContent value="atendimento">
          <TabAtendimento {...commonProps} />
        </TabsContent>

        <TabsContent value="marketing">
          <TabMarketing {...commonProps} />
        </TabsContent>

        <TabsContent value="integracoes">
          <TabIntegracoes {...commonProps} setFormData={setFormData} />
        </TabsContent>

        <TabsContent value="modulos">
          <ModulosTab formData={formData} onChange={handleChange} onSave={handleSave} isSaving={saveMutation.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModulosTab({ formData, onChange, onSave, isSaving }) {
  const modulosAtivos = formData.modulos_ativos || TODOS_MODULOS.map(m => m.id);

  const toggleModulo = (id) => {
    const modulo = TODOS_MODULOS.find(m => m.id === id);
    if (modulo?.essencial) return;
    if (modulosAtivos.includes(id)) {
      onChange('modulos_ativos', modulosAtivos.filter(m => m !== id));
    } else {
      onChange('modulos_ativos', [...modulosAtivos, id]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        Ative ou desative módulos do sistema. Módulos essenciais não podem ser desativados.
      </div>
      <div className="space-y-3">
        {TODOS_MODULOS.map(modulo => {
          const ativo = modulosAtivos.includes(modulo.id);
          return (
            <div key={modulo.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
              <div>
                <p className="font-medium text-slate-800">{modulo.nome}</p>
                <p className="text-sm text-slate-500">{modulo.descricao}</p>
                {modulo.essencial && <span className="text-xs text-orange-500 font-medium">Essencial</span>}
              </div>
              <label className={`relative inline-flex items-center ${modulo.essencial ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={() => toggleModulo(modulo.id)}
                  disabled={modulo.essencial}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Módulos'}
        </button>
      </div>
    </div>
  );
}