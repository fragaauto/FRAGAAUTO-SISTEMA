import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Car, 
  User, 
  ClipboardCheck, 
  FileText,
  Save,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Percent,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHECKLIST_ITEMS, CATEGORIAS } from '../components/checklist/ChecklistData';
import ChecklistSection from '../components/checklist/ChecklistSection';
import ItemOrcamento from '../components/orcamento/ItemOrcamento';
import SeletorProdutos from '../components/orcamento/SeletorProdutos';

export default function NovoAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('dados');
  const [openSections, setOpenSections] = useState({});
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    placa: '',
    modelo: '',
    marca: '',
    ano: '',
    km_atual: '',
    data_entrada: new Date().toISOString(),
    checklist: {},
    pre_diagnostico: '',
    itens_orcamento: [],
    subtotal: 0,
    desconto: 0,
    valor_final: 0,
    observacoes: '',
    status: 'em_andamento'
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list()
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Atendimento.create(data),
    onSuccess: (result) => {
      toast.success('Atendimento criado com sucesso!');
      queryClient.invalidateQueries(['atendimentos']);
      navigate(createPageUrl(`VerAtendimento?id=${result.id}`));
    },
    onError: () => {
      toast.error('Erro ao criar atendimento');
    }
  });

  // Calculate totals
  useEffect(() => {
    const subtotal = formData.itens_orcamento.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const valor_final = subtotal - (formData.desconto || 0);
    setFormData(prev => ({ ...prev, subtotal, valor_final }));
  }, [formData.itens_orcamento, formData.desconto]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleChecklistChange = (itemId, value) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [itemId]: value
      }
    }));
  };

  const handleAddProduto = (produto) => {
    const newItem = {
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: 1,
      valor_unitario: produto.valor,
      valor_total: produto.valor
    };
    setFormData(prev => ({
      ...prev,
      itens_orcamento: [...prev.itens_orcamento, newItem]
    }));
    setShowProdutoModal(false);
    toast.success('Produto adicionado ao orçamento');
  };

  const handleUpdateItem = (index, updatedItem) => {
    setFormData(prev => ({
      ...prev,
      itens_orcamento: prev.itens_orcamento.map((item, i) => 
        i === index ? updatedItem : item
      )
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      itens_orcamento: prev.itens_orcamento.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!formData.placa || !formData.modelo) {
      toast.error('Preencha os dados do veículo');
      setActiveTab('dados');
      return;
    }

    const checklistArray = Object.entries(formData.checklist).map(([id, data]) => ({
      id,
      ...data
    }));

    createMutation.mutate({
      ...formData,
      checklist: checklistArray,
      placa: formData.placa.toUpperCase()
    });
  };

  const toggleSection = (categoria) => {
    setOpenSections(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  const tabs = [
    { id: 'dados', label: 'Dados', icon: Car },
    { id: 'checklist', label: 'Checklist', icon: ClipboardCheck },
    { id: 'orcamento', label: 'Orçamento', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl('Home'))}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Novo Atendimento</h1>
                <p className="text-sm text-slate-500">Checklist e orçamento</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-[73px] z-30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* DADOS TAB */}
          {activeTab === 'dados' && (
            <motion.div
              key="dados"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Vehicle */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Car className="w-5 h-5 text-orange-500" />
                    Dados do Veículo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Placa *</Label>
                      <Input
                        placeholder="ABC-1234"
                        value={formData.placa}
                        onChange={(e) => handleInputChange('placa', e.target.value.toUpperCase())}
                        className="h-12 text-lg uppercase"
                      />
                    </div>
                    <div>
                      <Label>KM Atual</Label>
                      <Input
                        placeholder="50.000"
                        value={formData.km_atual}
                        onChange={(e) => handleInputChange('km_atual', e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Marca</Label>
                      <Input
                        placeholder="Volkswagen"
                        value={formData.marca}
                        onChange={(e) => handleInputChange('marca', e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Label>Modelo *</Label>
                      <Input
                        placeholder="Gol"
                        value={formData.modelo}
                        onChange={(e) => handleInputChange('modelo', e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Label>Ano</Label>
                      <Input
                        placeholder="2020"
                        value={formData.ano}
                        onChange={(e) => handleInputChange('ano', e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5 text-blue-500" />
                    Dados do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome do Cliente</Label>
                    <Input
                      placeholder="Nome completo"
                      value={formData.cliente_nome}
                      onChange={(e) => handleInputChange('cliente_nome', e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formData.cliente_telefone}
                      onChange={(e) => handleInputChange('cliente_telefone', e.target.value)}
                      className="h-12"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setActiveTab('checklist')}
                  className="bg-slate-800 hover:bg-slate-700"
                >
                  Próximo: Checklist
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {CATEGORIAS.map(categoria => (
                <ChecklistSection
                  key={categoria}
                  categoria={categoria}
                  items={CHECKLIST_ITEMS.filter(item => item.categoria === categoria)}
                  values={formData.checklist}
                  onChange={handleChecklistChange}
                  isOpen={openSections[categoria] ?? false}
                  onToggle={() => toggleSection(categoria)}
                />
              ))}

              {/* Pre-diagnosis */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Pré-Diagnóstico Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Descreva o pré-diagnóstico geral do veículo, serviços recomendados, etc..."
                    value={formData.pre_diagnostico}
                    onChange={(e) => handleInputChange('pre_diagnostico', e.target.value)}
                    className="min-h-[120px] text-base"
                  />
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('dados')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  onClick={() => setActiveTab('orcamento')}
                  className="bg-slate-800 hover:bg-slate-700"
                >
                  Próximo: Orçamento
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ORÇAMENTO TAB */}
          {activeTab === 'orcamento' && (
            <motion.div
              key="orcamento"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="w-5 h-5 text-green-500" />
                    Itens do Orçamento
                  </CardTitle>
                  <Button
                    onClick={() => setShowProdutoModal(true)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.itens_orcamento.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum item adicionado ao orçamento</p>
                      <Button
                        variant="link"
                        onClick={() => setShowProdutoModal(true)}
                        className="text-orange-600 mt-2"
                      >
                        Clique para adicionar produtos/serviços
                      </Button>
                    </div>
                  ) : (
                    formData.itens_orcamento.map((item, index) => (
                      <ItemOrcamento
                        key={index}
                        item={item}
                        onUpdate={(updated) => handleUpdateItem(index, updated)}
                        onRemove={() => handleRemoveItem(index)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Totals */}
              <Card className="bg-slate-800 text-white">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span className="font-semibold">R$ {formData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      <span>Desconto:</span>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.desconto}
                      onChange={(e) => handleInputChange('desconto', parseFloat(e.target.value) || 0)}
                      className="w-32 h-10 bg-white/10 border-white/20 text-white text-right"
                    />
                  </div>
                  <div className="border-t border-white/20 pt-4 flex justify-between items-center text-xl font-bold">
                    <span>VALOR FINAL:</span>
                    <span className="text-orange-400">R$ {formData.valor_final.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Observations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Observações adicionais para o orçamento..."
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    className="min-h-[100px]"
                  />
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('checklist')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Atendimento
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SeletorProdutos
        open={showProdutoModal}
        onClose={() => setShowProdutoModal(false)}
        produtos={produtos}
        onSelect={handleAddProduto}
      />
    </div>
  );
}

import { Package } from 'lucide-react';