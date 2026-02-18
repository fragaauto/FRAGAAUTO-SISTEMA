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
  Calculator,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChecklistSection from '../components/checklist/ChecklistSection';
import ItemOrcamento from '../components/orcamento/ItemOrcamento';
import SeletorProdutos from '../components/orcamento/SeletorProdutos';
import ModalCadastroProduto from '../components/produtos/ModalCadastroProduto';
import BuscarClienteModal from '../components/atendimento/BuscarClienteModal';

export default function NovoAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('dados');
  const [openSections, setOpenSections] = useState({});
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showCadastroProduto, setShowCadastroProduto] = useState(false);
  const [cadastrandoProduto, setCadastrandoProduto] = useState(false);
  const [showBuscarCliente, setShowBuscarCliente] = useState(false);
  const [criandoCliente, setCriandoCliente] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    placa: '',
    modelo: '',
    marca: '',
    ano: '',
    km_atual: '',
    data_entrada: new Date().toISOString(),
    queixa_inicial: '',
    itens_queixa: [],
    checklist: {},
    pre_diagnostico: '',
    itens_orcamento: [],
    subtotal_queixa: 0,
    subtotal_checklist: 0,
    subtotal: 0,
    desconto: 0,
    valor_final: 0,
    observacoes: '',
    status: 'queixa_pendente'
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const items = await base44.entities.ChecklistItem.list();
      return items.filter(i => i.ativo).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    },
    staleTime: 10 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      console.log('📤 [CRIAR ATENDIMENTO] Enviando dados:', data);
      return base44.entities.Atendimento.create(data);
    },
    onSuccess: (result) => {
      console.log('✅ [CRIAR ATENDIMENTO] Sucesso:', result);
      toast.success('Atendimento criado com sucesso!');
      queryClient.invalidateQueries(['atendimentos']);
      navigate(createPageUrl(`VerAtendimento?id=${result.id}`));
    },
    onError: (error) => {
      console.error('🔴 [CRIAR ATENDIMENTO] Erro:', error);
      toast.error(`Erro ao criar atendimento: ${error.message || 'Verifique os dados'}`);
    }
  });

  // Calculate totals and consolidate products from checklist
  useEffect(() => {
    // Consolidar produtos do checklist
    const produtosDoChecklist = [];
    Object.entries(formData.checklist).forEach(([itemId, data]) => {
      if (data.produtos && data.produtos.length > 0) {
        data.produtos.forEach(pv => {
          const produto = produtos.find(p => p.id === pv.id);
          if (produto) {
            const valorUnitario = pv.valor_customizado !== undefined ? pv.valor_customizado : produto.valor;
            produtosDoChecklist.push({
              produto_id: produto.id,
              codigo_produto: produto.codigo || '',
              nome: produto.nome,
              quantidade: pv.quantidade,
              valor_unitario: valorUnitario,
              valor_total: valorUnitario * pv.quantidade,
              vantagens: produto.vantagens || '',
              desvantagens: produto.desvantagens || '',
              status_aprovacao: 'pendente',
              status_servico: 'aguardando_autorizacao',
              observacao_item: pv.observacao || '',
              comentario_tecnico: data.comentario || '',
              origem: 'checklist',
              item_checklist: data.item
            });
          }
        });
      }
    });

    // Consolidar TODOS os produtos (queixa + checklist), eliminando duplicatas e somando quantidades
    const todosOsItens = [...formData.itens_queixa, ...produtosDoChecklist];
    const produtosConsolidados = {};
    
    todosOsItens.forEach(item => {
      if (produtosConsolidados[item.produto_id]) {
        // Produto já existe - somar quantidade
        produtosConsolidados[item.produto_id].quantidade += item.quantidade;
        produtosConsolidados[item.produto_id].valor_total = 
          produtosConsolidados[item.produto_id].quantidade * produtosConsolidados[item.produto_id].valor_unitario;
        // Manter múltiplas origens
        if (!produtosConsolidados[item.produto_id].origens) {
          produtosConsolidados[item.produto_id].origens = [produtosConsolidados[item.produto_id].origem || 'queixa'];
        }
        if (item.origem && !produtosConsolidados[item.produto_id].origens.includes(item.origem)) {
          produtosConsolidados[item.produto_id].origens.push(item.origem);
        }
      } else {
        produtosConsolidados[item.produto_id] = { 
          ...item,
          origem: item.origem || 'queixa'
        };
      }
    });

    const itensConsolidados = Object.values(produtosConsolidados);

    // Calcular subtotais separadamente para exibição
    const subtotal_queixa = formData.itens_queixa.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const subtotal_checklist = produtosDoChecklist.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    
    // Subtotal REAL sem duplicatas
    const subtotal = itensConsolidados.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const valor_final = subtotal - (formData.desconto || 0);
    
    setFormData(prev => ({ 
      ...prev, 
      itens_orcamento: itensConsolidados,
      subtotal_queixa, 
      subtotal_checklist, 
      subtotal, 
      valor_final 
    }));
  }, [formData.checklist, formData.itens_queixa, formData.desconto, produtos]);

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

    // Se marcou como defeito e tem produtos padrão, adicionar automaticamente ao orçamento
    if (value.status === 'com_defeito' && value.incluir_orcamento) {
      const checklistItem = checklistItems.find(i => i.id === itemId);
      if (checklistItem?.produtos_padrao?.length > 0) {
        const produtosParaAdicionar = produtos.filter(p => 
          checklistItem.produtos_padrao.includes(p.id)
        );
        
        const novosItens = produtosParaAdicionar.map(produto => ({
          produto_id: produto.id,
          nome: produto.nome,
          quantidade: 1,
          valor_unitario: produto.valor,
          valor_total: produto.valor,
          vantagens: produto.vantagens || '',
          desvantagens: produto.desvantagens || '',
          status_aprovacao: 'pendente'
        }));

        setFormData(prev => ({
          ...prev,
          itens_orcamento: [...prev.itens_orcamento, ...novosItens]
        }));

        if (novosItens.length > 0) {
          toast.success(`${novosItens.length} serviço(s) adicionado(s) ao orçamento`);
        }
      }
    }
  };

  const handleAddProduto = (produto) => {
    // Verificar se já existe em QUALQUER lugar (queixa, checklist ou orçamento)
    const jaExisteNaQueixa = formData.itens_queixa.some(i => i.produto_id === produto.id);
    const jaExisteNoChecklist = Object.values(formData.checklist).some(data => 
      data.produtos?.some(p => p.id === produto.id)
    );
    const jaExisteNoOrcamento = formData.itens_orcamento.some(i => i.produto_id === produto.id);
    
    if (jaExisteNaQueixa || jaExisteNoChecklist || jaExisteNoOrcamento) {
      toast.error('Este produto já foi adicionado ao orçamento.');
      return;
    }

    const newItem = {
      produto_id: produto.id,
      codigo_produto: produto.codigo || '',
      nome: produto.nome,
      quantidade: 1,
      valor_unitario: produto.valor,
      valor_total: produto.valor,
      vantagens: produto.vantagens || '',
      desvantagens: produto.desvantagens || '',
      status_aprovacao: 'pendente'
    };
    
    if (activeTab === 'queixa') {
      setFormData(prev => ({
        ...prev,
        itens_queixa: [...prev.itens_queixa, newItem]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        itens_orcamento: [...prev.itens_orcamento, newItem]
      }));
    }
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
    console.log('💾 [SALVAR] Iniciando salvamento...');
    
    if (!formData.placa || !formData.modelo) {
      toast.error('❌ Preencha placa e modelo do veículo');
      setActiveTab('dados');
      return;
    }

    const checklistArray = Object.entries(formData.checklist).map(([id, data]) => ({
      item_id: id,
      ...data
    }));

    const dataToSave = {
      cliente_nome: formData.cliente_nome || '',
      cliente_telefone: formData.cliente_telefone || '',
      placa: formData.placa.toUpperCase(),
      modelo: formData.modelo,
      marca: formData.marca || '',
      ano: formData.ano || '',
      km_atual: formData.km_atual || '',
      data_entrada: formData.data_entrada,
      queixa_inicial: formData.queixa_inicial || '',
      itens_queixa: formData.itens_queixa || [],
      checklist: checklistArray,
      pre_diagnostico: formData.pre_diagnostico || '',
      itens_orcamento: formData.itens_orcamento || [],
      subtotal_queixa: formData.subtotal_queixa || 0,
      subtotal_checklist: formData.subtotal_checklist || 0,
      subtotal: formData.subtotal || 0,
      desconto: formData.desconto || 0,
      valor_final: formData.valor_final || 0,
      observacoes: formData.observacoes || '',
      status: formData.status || 'queixa_pendente',
      historico_edicoes: [{
        data: new Date().toISOString(),
        usuario: 'Sistema',
        campo_editado: 'criacao',
        descricao: 'Atendimento criado'
      }]
    };

    console.log('📦 [SALVAR] Payload preparado:', {
      placa: dataToSave.placa,
      itens_queixa: dataToSave.itens_queixa.length,
      checklist: dataToSave.checklist.length,
      itens_orcamento: dataToSave.itens_orcamento.length,
      valor_final: dataToSave.valor_final
    });

    createMutation.mutate(dataToSave);
  };

  const toggleSection = (categoria) => {
    setOpenSections(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  const createProdutoMutation = useMutation({
    mutationFn: (data) => base44.entities.Produto.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['produtos']);
      toast.success('Produto cadastrado e adicionado!');
      setCadastrandoProduto(false);
      setShowCadastroProduto(false);
      
      // Adicionar ao orçamento automaticamente
      const newItem = {
        produto_id: result.id,
        codigo_produto: result.codigo || '',
        nome: result.nome,
        quantidade: 1,
        valor_unitario: result.valor,
        valor_total: result.valor,
        vantagens: result.vantagens || '',
        desvantagens: result.desvantagens || '',
        status_aprovacao: 'pendente'
      };
      
      if (activeTab === 'queixa') {
        setFormData(prev => ({
          ...prev,
          itens_queixa: [...prev.itens_queixa, newItem]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          itens_orcamento: [...prev.itens_orcamento, newItem]
        }));
      }
    },
    onError: () => {
      toast.error('Erro ao cadastrar produto');
      setCadastrandoProduto(false);
    }
  });

  const createClienteMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['clientes']);
      setFormData(prev => ({
        ...prev,
        cliente_nome: result.nome,
        cliente_telefone: result.telefone
      }));
      setCriandoCliente(false);
      setShowBuscarCliente(false);
      toast.success('Cliente cadastrado!');
    },
    onError: () => {
      toast.error('Erro ao cadastrar cliente');
      setCriandoCliente(false);
    }
  });

  const handleSelecionarCliente = (cliente) => {
    setFormData(prev => ({
      ...prev,
      cliente_nome: cliente.nome,
      cliente_telefone: cliente.telefone
    }));
    setShowBuscarCliente(false);
    toast.success(`Cliente ${cliente.nome} selecionado`);
  };

  const handleCriarCliente = (data) => {
    setCriandoCliente(true);
    createClienteMutation.mutate(data);
  };

  const handleCadastrarProduto = (data) => {
    setCadastrandoProduto(true);
    createProdutoMutation.mutate({
      codigo: data.codigo,
      nome: data.nome,
      categoria: data.categoria,
      valor: parseFloat(data.valor),
      descricao: data.descricao,
      vantagens: data.vantagens,
      desvantagens: data.desvantagens,
      ativo: true
    });
  };

  const tabs = [
    { id: 'dados', label: 'Dados', icon: Car },
    { id: 'queixa', label: 'Queixa', icon: FileText },
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
                  onClick={() => setActiveTab('queixa')}
                  className="bg-slate-800 hover:bg-slate-700"
                >
                  Próximo: Queixa Inicial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* QUEIXA TAB */}
          {activeTab === 'queixa' && (
            <motion.div
              key="queixa"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Queixa Inicial do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Descreva a queixa inicial do cliente..."
                    value={formData.queixa_inicial}
                    onChange={(e) => handleInputChange('queixa_inicial', e.target.value)}
                    className="min-h-[100px] text-base"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Orçamento da Queixa</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowProdutoModal(true)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Existente
                    </Button>
                    <Button
                      onClick={() => setShowCadastroProduto(true)}
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Novo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.itens_queixa.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>Adicione serviços/produtos relacionados à queixa</p>
                    </div>
                  ) : (
                    formData.itens_queixa.map((item, index) => (
                    <div key={index}>
                      <ItemOrcamento
                        item={item}
                        onUpdate={(updated) => {
                          setFormData(prev => ({
                            ...prev,
                            itens_queixa: prev.itens_queixa.map((it, i) => i === index ? updated : it)
                          }));
                        }}
                        onRemove={() => {
                          setFormData(prev => ({
                            ...prev,
                            itens_queixa: prev.itens_queixa.filter((_, i) => i !== index)
                          }));
                        }}
                      />
                      {item.vantagens && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs font-semibold text-green-800 mb-1">✓ Benefícios de realizar:</p>
                          <p className="text-sm text-green-700">{item.vantagens}</p>
                        </div>
                      )}
                      {item.desvantagens && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Riscos de não realizar:</p>
                          <p className="text-sm text-amber-700">{item.desvantagens}</p>
                        </div>
                      )}
                    </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {formData.itens_queixa.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Subtotal da Queixa:</span>
                      <span className="text-blue-600">R$ {formData.subtotal_queixa.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('dados')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
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
              {checklistItems.length === 0 ? (
                <Card className="py-8">
                  <CardContent className="text-center text-slate-500">
                    <p>Nenhum item no checklist</p>
                    <p className="text-sm mt-2">Configure os itens em <strong>Gerenciar Checklist</strong></p>
                  </CardContent>
                </Card>
              ) : (
                (() => {
                  const categorias = [...new Set(checklistItems.map(i => i.categoria))];
                  return categorias.map(categoria => (
                    <ChecklistSection
                      key={categoria}
                      categoria={categoria}
                      items={checklistItems.filter(item => item.categoria === categoria)}
                      values={formData.checklist}
                      onChange={handleChecklistChange}
                      isOpen={openSections[categoria] ?? false}
                      onToggle={() => toggleSection(categoria)}
                      produtos={produtos}
                      onOpenCadastro={() => setShowCadastroProduto(true)}
                    />
                  ));
                })()
              )}

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
                  onClick={() => setActiveTab('queixa')}
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
                    Orçamento Consolidado
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowProdutoModal(true)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Existente
                    </Button>
                    <Button
                      onClick={() => setShowCadastroProduto(true)}
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Cadastrar Novo
                    </Button>
                  </div>
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
                    <>
                      {formData.itens_orcamento.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className={item.origem === 'checklist' ? 'pl-3 border-l-2 border-blue-400' : ''}>
                            {item.origem === 'checklist' && (
                              <p className="text-xs text-blue-600 mb-1">↳ Do Checklist: {item.item_checklist}</p>
                            )}
                            {item.origens?.length > 1 && (
                              <p className="text-xs text-amber-600 mb-1 font-semibold">
                                ⚠️ Item presente em: {item.origens.join(' + ')}
                              </p>
                            )}
                            <ItemOrcamento
                              item={item}
                              onUpdate={(updated) => handleUpdateItem(index, updated)}
                              onRemove={() => handleRemoveItem(index)}
                            />
                            {item.vantagens && (
                              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs font-semibold text-green-800 mb-1">✓ Benefícios de realizar:</p>
                                <p className="text-sm text-green-700">{item.vantagens}</p>
                              </div>
                            )}
                            {item.desvantagens && (
                              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Riscos de não realizar:</p>
                                <p className="text-sm text-amber-700">{item.desvantagens}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Totals */}
              <Card className="bg-slate-800 text-white">
                <CardContent className="pt-6 space-y-4">
                  {formData.subtotal_queixa > 0 && (
                    <div className="flex justify-between items-center text-blue-300">
                      <span>Queixa:</span>
                      <span className="font-semibold">R$ {formData.subtotal_queixa.toFixed(2)}</span>
                    </div>
                  )}
                  {formData.subtotal_checklist > 0 && (
                    <div className="flex justify-between items-center text-green-300">
                      <span>Checklist:</span>
                      <span className="font-semibold">R$ {formData.subtotal_checklist.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-white/20 pt-4">
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

      <ModalCadastroProduto
        open={showCadastroProduto}
        onClose={() => setShowCadastroProduto(false)}
        onSave={handleCadastrarProduto}
        isLoading={cadastrandoProduto}
      />
    </div>
  );
}