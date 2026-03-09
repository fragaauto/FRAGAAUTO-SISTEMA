import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Loader2, Building2, DollarSign, ClipboardList, TrendingUp, Zap, ArrowLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createPageUrl } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import TabEmpresa from '@/components/configuracoes/TabEmpresa';
import TabFinanceiro from '@/components/configuracoes/TabFinanceiro';
import TabAtendimento from '@/components/configuracoes/TabAtendimento';
import TabMarketing from '@/components/configuracoes/TabMarketing';
import TabIntegracoes from '@/components/configuracoes/TabIntegracoes';

const DEFAULT_FORM = {
  nome_empresa: 'Fraga Auto Portas',
  endereco: '',
  telefone: '',
  email: '',
  cnpj: '',
  site: '',
  instagram: '',
  logo_url: '',
  whatsapp_atendimento: '',
  mensagem_link_cliente: '',
  mensagem_remarketing: '',
  formas_pagamento: [
    { nome: 'Dinheiro', ativa: true },
    { nome: 'PIX', ativa: true },
    { nome: 'Cartão de Débito', ativa: true },
    { nome: 'Cartão de Crédito', ativa: true }
  ],
  condicoes_especiais: [],
  status_atendimento_personalizados: [],
  taxas_pagamento: [],
  parcelas_credito: [],
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
  agenda_google_api_key: '',
  agenda_google_sheets_id: '',
  agenda_google_sheets_aba: 'Agendamentos',
  agenda_sheets_col_data: 'A',
  agenda_sheets_col_hora: 'B',
  agenda_sheets_col_cliente: 'C',
  agenda_sheets_col_servico: 'D',
  agenda_sheets_col_placa: 'E',
  agenda_sheets_col_obs: 'F',
  agenda_google_calendar_id: '',
  evolution_api_url: '',
  evolution_api_key: '',
  evolution_instance: '',
  impostos: [],
};

function buildForm(config) {
  return {
    nome_empresa: config.nome_empresa || DEFAULT_FORM.nome_empresa,
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
    formas_pagamento: config.formas_pagamento || DEFAULT_FORM.formas_pagamento,
    condicoes_especiais: config.condicoes_especiais || [],
    status_atendimento_personalizados: config.status_atendimento_personalizados || [],
    taxas_pagamento: config.taxas_pagamento || [],
    parcelas_credito: config.parcelas_credito || [],
    cliente_nome_obrigatorio: config.cliente_nome_obrigatorio ?? true,
    cliente_telefone_obrigatorio: config.cliente_telefone_obrigatorio ?? true,
    cliente_cpf_obrigatorio: config.cliente_cpf_obrigatorio ?? false,
    cliente_nascimento_obrigatorio: config.cliente_nascimento_obrigatorio ?? false,
    cliente_endereco_obrigatorio: config.cliente_endereco_obrigatorio ?? false,
    os_placa_obrigatorio: config.os_placa_obrigatorio ?? true,
    os_modelo_obrigatorio: config.os_modelo_obrigatorio ?? true,
    os_km_obrigatorio: config.os_km_obrigatorio ?? false,
    os_queixa_obrigatorio: config.os_queixa_obrigatorio ?? false,
    os_tecnico_obrigatorio: config.os_tecnico_obrigatorio ?? false,
    dias_minimos_reenvio: config.dias_minimos_reenvio || 30,
    dias_validade_oferta: config.dias_validade_oferta || 7,
    oferta_padrao_remarketing: config.oferta_padrao_remarketing || '',
    condicao_pagamento_remarketing: config.condicao_pagamento_remarketing || '',
    lembrete_checklist_ativo: config.lembrete_checklist_ativo ?? false,
    lembrete_checklist_intervalo: config.lembrete_checklist_intervalo || 30,
    lembrete_checklist_whatsapp: config.lembrete_checklist_whatsapp || '',
    agenda_google_api_key: config.agenda_google_api_key || '',
    agenda_google_sheets_id: config.agenda_google_sheets_id || '',
    agenda_google_sheets_aba: config.agenda_google_sheets_aba || 'Agendamentos',
    agenda_sheets_col_data: config.agenda_sheets_col_data || 'A',
    agenda_sheets_col_hora: config.agenda_sheets_col_hora || 'B',
    agenda_sheets_col_cliente: config.agenda_sheets_col_cliente || 'C',
    agenda_sheets_col_servico: config.agenda_sheets_col_servico || 'D',
    agenda_sheets_col_placa: config.agenda_sheets_col_placa || 'E',
    agenda_sheets_col_obs: config.agenda_sheets_col_obs || 'F',
    agenda_google_calendar_id: config.agenda_google_calendar_id || '',
    evolution_api_url: config.evolution_api_url || '',
    evolution_api_key: config.evolution_api_key || '',
    evolution_instance: config.evolution_instance || '',
    impostos: config.impostos || [],
  };
}

export default function Configuracoes() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [dirty, setDirty] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000
  });

  const config = configs[0] || {};

  useEffect(() => {
    if (config.id) {
      setFormData(buildForm(config));
      setDirty(false);
    }
  }, [config.id]);

  const onChange = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: (data) => config.id
      ? base44.entities.Configuracao.update(config.id, data)
      : base44.entities.Configuracao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracoes']);
      toast.success('Configurações salvas!');
      setDirty(false);
    }
  });

  const handleSave = () => saveMutation.mutate(formData);

  const handleNavigate = (url) => {
    if (dirty) {
      setPendingNavUrl(url);
      setShowExitDialog(true);
    } else {
      navigate(url);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const tabProps = {
    formData,
    onChange,
    setFormData,
    onSave: handleSave,
    isSaving: saveMutation.isPending,
  };

  const TABS = [
    { value: 'empresa', label: 'Empresa', icon: Building2 },
    { value: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { value: 'atendimento', label: 'Atendimento', icon: ClipboardList },
    { value: 'marketing', label: 'Marketing', icon: TrendingUp },
    { value: 'integracoes', label: 'Integrações', icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(createPageUrl('Home'))}
                className="text-slate-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-500" />
                  Configurações
                </h1>
                {dirty && <p className="text-xs text-amber-600 font-medium">● Alterações não salvas</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="empresa">
          <TabsList className="w-full flex-wrap h-auto gap-1 mb-6 bg-white border border-slate-200 p-1 rounded-xl">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-2 flex-1 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="empresa">
            <TabEmpresa {...tabProps} />
          </TabsContent>

          <TabsContent value="financeiro">
            <TabFinanceiro {...tabProps} />
          </TabsContent>

          <TabsContent value="atendimento">
            <TabAtendimento {...tabProps} />
          </TabsContent>

          <TabsContent value="marketing">
            <TabMarketing {...tabProps} />
          </TabsContent>

          <TabsContent value="integracoes">
            <TabIntegracoes {...tabProps} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogo sair sem salvar */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Se sair agora, as alterações serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => { setShowExitDialog(false); navigate(pendingNavUrl); }}
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}