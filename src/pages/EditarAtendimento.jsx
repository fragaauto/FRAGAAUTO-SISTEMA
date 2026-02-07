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
import { toast } from "sonner";
import { 
  ArrowLeft,
  Save,
  Loader2
} from 'lucide-react';
import ChecklistSection from '../components/checklist/ChecklistSection';
import ErrorBoundary from '../components/ErrorBoundary';

export default function EditarAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [formData, setFormData] = useState({
    checklist: {},
    pre_diagnostico: '',
    itens_orcamento: []
  });

  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: atendimento, isLoading } = useQuery({
    queryKey: ['atendimento', id],
    queryFn: async () => {
      if (!id) return null;
      const list = await base44.entities.Atendimento.list();
      const found = list.find(a => a.id === id);
      return found || null;
    },
    enabled: !!id
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const items = await base44.entities.ChecklistItem.list();
      return items.filter(i => i.ativo).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    },
    staleTime: 10 * 60 * 1000
  });

  useEffect(() => {
    if (atendimento && checklistItems.length > 0 && produtos.length > 0) {
      console.log('🔵 [EDITAR CHECKLIST] Carregando dados:', {
        atendimentoId: atendimento.id,
        checklistLength: atendimento.checklist?.length || 0,
        produtosLength: produtos.length,
        checklistItemsLength: checklistItems.length
      });

      try {
        // CRÍTICO: Normalizar checklist para array válido
        const checklistArray = Array.isArray(atendimento.checklist) ? atendimento.checklist : [];
        
        const checklistObj = {};
        
        checklistArray.forEach(item => {
          // PROTEÇÃO: Validar estrutura do item
          if (!item || !item.item) {
            console.warn('⚠️ Item inválido no checklist:', item);
            return;
          }

          const checklistItemConfig = checklistItems.find(ci => ci.item === item.item);
          if (checklistItemConfig) {
            // FONTE ÚNICA DA VERDADE: Se produtos existem no checklist salvo, USAR EXATAMENTE ELES
            const produtosArray = Array.isArray(item.produtos) ? item.produtos : [];
            
            const produtosSalvos = produtosArray.map(p => {
              // PROTEÇÃO: Validar produto
              if (!p || !p.id) {
                console.warn('⚠️ Produto inválido no checklist:', p);
                return null;
              }

              const produtoCadastro = produtos.find(prod => prod.id === p.id);
              
              if (!produtoCadastro) {
                console.warn(`⚠️ Produto ${p.id} não encontrado no cadastro - será ignorado`);
                return null;
              }

              // CRÍTICO: Detectar se é item EDITADO (tem valor_customizado) ou item histórico (sem valor_customizado)
              let valorFinal = 0;
              
              if (p.valor_customizado !== undefined && p.valor_customizado !== null && p.valor_customizado !== 0) {
                // Item JÁ foi editado antes - usar valor salvo
                valorFinal = Number(p.valor_customizado);
              } else {
                // Item antigo SEM valor_customizado - recuperar do orçamento consolidado
                const itemOrcamento = (atendimento.itens_orcamento || []).find(
                  io => io.produto_id === p.id && io.origem === 'checklist'
                );
                
                if (itemOrcamento && itemOrcamento.valor_unitario) {
                  valorFinal = Number(itemOrcamento.valor_unitario);
                } else {
                  // Fallback: usar valor atual do cadastro
                  valorFinal = Number(produtoCadastro.valor) || 0;
                }
              }

              // PROTEÇÃO: Se ainda for zero, usar valor do cadastro
              if (valorFinal === 0) {
                valorFinal = Number(produtoCadastro.valor) || 0;
                console.warn(`⚠️ Produto ${produtoCadastro.nome} estava com valor zero, usando valor do cadastro: ${valorFinal}`);
              }

              return {
                id: p.id,
                quantidade: Number(p.quantidade) || 1,
                valor_customizado: valorFinal,
                observacao: p.observacao || ''
              };
            }).filter(Boolean); // Remove nulls

            checklistObj[checklistItemConfig.id] = {
              item: item.item,
              categoria: item.categoria,
              status: item.status || 'nao_verificado',
              comentario: item.comentario || '',
              incluir_orcamento: item.incluir_orcamento || false,
              produtos: produtosSalvos
            };
          }
        });
        
        console.log('✅ [EDITAR CHECKLIST] Checklist processado:', {
          totalItens: Object.keys(checklistObj).length,
          itensComProdutos: Object.values(checklistObj).filter(i => i.produtos?.length > 0).length
        });
        
        setFormData({
          checklist: checklistObj,
          pre_diagnostico: atendimento.pre_diagnostico || '',
          itens_orcamento: atendimento.itens_orcamento || []
        });
      } catch (error) {
        console.error('🔴 [ERRO CRÍTICO] Falha ao carregar checklist:', error);
        toast.error('Erro ao carregar checklist. Tente recarregar a página.');
      }
    }
  }, [atendimento, checklistItems, produtos]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      console.log('📤 [SALVAR CHECKLIST] Enviando para API:', Object.keys(data));
      return base44.entities.Atendimento.update(id, data);
    },
    onSuccess: (result) => {
      console.log('✅ [SALVAR CHECKLIST] Sucesso:', result);
      queryClient.invalidateQueries(['atendimento', id]);
      queryClient.invalidateQueries(['atendimentos']);
      toast.success('Checklist atualizado com sucesso!');
      navigate(createPageUrl(`VerAtendimento?id=${id}`));
    },
    onError: (error) => {
      console.error('🔴 [SALVAR CHECKLIST] Erro:', error);
      toast.error(`Erro ao salvar: ${error.message || 'Tente novamente'}`);
    }
  });

  const handleChecklistChange = (itemId, value) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [itemId]: value
      }
    }));
  };

  const handleSave = () => {
    console.log('💾 [SALVAR CHECKLIST] Botão clicado - iniciando...');
    console.log('📦 [SALVAR CHECKLIST] FormData completo:', formData);

    // VALIDAÇÃO: Apenas verificar itens que serão incluídos no orçamento
    let errosDetectados = [];
    Object.entries(formData.checklist).forEach(([itemId, data]) => {
      if (data.incluir_orcamento && data.produtos && data.produtos.length > 0) {
        data.produtos.forEach(pv => {
          console.log(`🔍 Validando produto: ${pv.id} - valor: ${pv.valor_customizado}, qtd: ${pv.quantidade}`);
          if (!pv.valor_customizado || pv.valor_customizado === 0) {
            errosDetectados.push(`Item "${data.item}" tem valor zerado`);
          }
          if (!pv.quantidade || pv.quantidade === 0) {
            errosDetectados.push(`Item "${data.item}" tem quantidade zerada`);
          }
        });
      }
    });

    if (errosDetectados.length > 0) {
      toast.error('❌ Não é possível salvar: há valores zerados no checklist!');
      console.error('🔴 [SALVAR CHECKLIST] Erros detectados:', errosDetectados);
      return;
    }

    console.log('✅ [SALVAR CHECKLIST] Validação passou, continuando...');

    // Converter checklist de objeto para array
    const checklistArray = Object.entries(formData.checklist).map(([id, data]) => ({
      item_id: id,
      ...data
    }));

    // CRÍTICO: Consolidar produtos do checklist - USAR APENAS VALORES SALVOS
    const produtosDoChecklist = [];
    Object.entries(formData.checklist).forEach(([itemId, data]) => {
      // CRÍTICO: Só incluir se marcado para incluir no orçamento
      if (data.incluir_orcamento && data.produtos && data.produtos.length > 0) {
        console.log(`📋 Processando item: ${data.item} - ${data.produtos.length} produtos`);
        data.produtos.forEach(pv => {
          const produto = produtos.find(p => p.id === pv.id);
          if (produto) {
            // NUNCA recalcular - valor_customizado É a fonte da verdade
            const valorUnitario = Number(pv.valor_customizado);
            const quantidade = Number(pv.quantidade) || 1;
            
            if (valorUnitario === 0) {
              console.error('ERRO CRÍTICO: Tentativa de salvar valor zerado', { item: data.item, produto: produto.nome });
              return; // Não adicionar ao orçamento
            }
            
            produtosDoChecklist.push({
              produto_id: produto.id,
              codigo_produto: produto.codigo || '',
              nome: produto.nome,
              quantidade: quantidade,
              valor_unitario: valorUnitario,
              valor_total: valorUnitario * quantidade,
              vantagens: produto.vantagens || '',
              desvantagens: produto.desvantagens || '',
              status_aprovacao: 'pendente',
              status_servico: 'aguardando_autorizacao',
              observacao_item: pv.observacao || '',
              origem: 'checklist',
              item_checklist: data.item
            });
          }
        });
      }
    });

    // CRÍTICO: Consolidar sem duplicar - preservar itens da queixa e adicionar checklist
    const itensQueixa = (atendimento.itens_queixa || []).map(item => ({
      ...item,
      valor_total: (Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0)
    }));

    const todosOsItens = [...itensQueixa, ...produtosDoChecklist];
    const produtosConsolidados = {};
    
    todosOsItens.forEach(item => {
      const key = item.produto_id;
      if (produtosConsolidados[key]) {
        // Somar quantidades se for o mesmo produto
        produtosConsolidados[key].quantidade += Number(item.quantidade) || 0;
        produtosConsolidados[key].valor_total = 
          produtosConsolidados[key].quantidade * produtosConsolidados[key].valor_unitario;
      } else {
        produtosConsolidados[key] = { 
          ...item,
          quantidade: Number(item.quantidade) || 0,
          valor_unitario: Number(item.valor_unitario) || 0,
          valor_total: (Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0)
        };
      }
    });

    const itensConsolidados = Object.values(produtosConsolidados);
    
    // CRÍTICO: Recalcular todos os totais
    const subtotal_queixa = itensQueixa.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0);
    const subtotal_checklist = produtosDoChecklist.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0);
    const subtotal = itensConsolidados.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0);
    const valor_final = subtotal - (Number(atendimento.desconto) || 0);

    const historicoItem = {
      data: new Date().toISOString(),
      usuario: user?.email || 'Sistema',
      campo_editado: 'checklist',
      descricao: 'Checklist editado e atualizado'
    };

    const dataToSave = {
      checklist: checklistArray,
      pre_diagnostico: formData.pre_diagnostico,
      itens_orcamento: itensConsolidados,
      subtotal_queixa,
      subtotal_checklist,
      subtotal,
      valor_final,
      status: 'em_diagnostico',
      historico_edicoes: [...(atendimento.historico_edicoes || []), historicoItem]
    };

    console.log('📤 [SALVAR CHECKLIST] Payload:', {
      checklistArray: dataToSave.checklist.length,
      itensOrcamento: dataToSave.itens_orcamento.length,
      subtotalChecklist: dataToSave.subtotal_checklist,
      valorFinal: dataToSave.valor_final
    });

    updateMutation.mutate(dataToSave);
  };

  const toggleSection = (categoria) => {
    setOpenSections(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  if (!id) {
    navigate(createPageUrl('Atendimentos'));
    return null;
  }

  // PROTEÇÃO: Aguardar TODOS os dados estarem carregados
  const isLoadingData = isLoading || !atendimento || checklistItems.length === 0 || produtos.length === 0;

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-orange-50/30">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm text-slate-600">Carregando checklist...</p>
        <p className="text-xs text-slate-400">
          {!atendimento ? 'Buscando atendimento...' : 
           checklistItems.length === 0 ? 'Carregando itens do checklist...' :
           produtos.length === 0 ? 'Carregando produtos...' : 'Processando...'}
        </p>
      </div>
    );
  }

  if (!atendimento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-700">Atendimento não encontrado</p>
        <Button onClick={() => navigate(createPageUrl('Atendimentos'))}>
          Voltar
        </Button>
      </div>
    );
  }

  // PROTEÇÃO: Garantir que categorias é sempre um array válido
  const categorias = checklistItems.length > 0 
    ? [...new Set(checklistItems.map(i => i.categoria).filter(Boolean))]
    : [];

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl(`VerAtendimento?id=${id}`))}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Editar Checklist</h1>
                <p className="text-sm text-slate-500">{atendimento.placa} - {atendimento.modelo}</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800">
              ⚠️ Você está editando um checklist já salvo. As alterações atualizarão automaticamente o orçamento.
              {atendimento.assinatura_cliente_checklist && (
                <span className="block mt-2 font-semibold">
                  Este checklist foi assinado. As alterações invalidarão a assinatura anterior e exigirão nova aprovação.
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {categorias.map(categoria => (
            <ChecklistSection
              key={categoria}
              categoria={categoria}
              items={checklistItems.filter(item => item.categoria === categoria)}
              values={formData.checklist}
              onChange={handleChecklistChange}
              isOpen={openSections[categoria] ?? false}
              onToggle={() => toggleSection(categoria)}
              produtos={produtos}
              onOpenCadastro={() => {}}
            />
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Pré-Diagnóstico Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Descreva o pré-diagnóstico geral do veículo..."
                value={formData.pre_diagnostico}
                onChange={(e) => setFormData(prev => ({ ...prev, pre_diagnostico: e.target.value }))}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl(`VerAtendimento?id=${id}`))}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}