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

  useEffect(() => {
    if (atendimento && checklistItems.length > 0) {
      // Converter checklist array para objeto, mapeando pelo nome do item para encontrar o ID correto
      const checklistObj = {};
      (atendimento.checklist || []).forEach(item => {
        // Encontrar o ChecklistItem correspondente pelo nome
        const checklistItemConfig = checklistItems.find(ci => ci.item === item.item);
        if (checklistItemConfig) {
          checklistObj[checklistItemConfig.id] = {
            item: item.item,
            categoria: item.categoria,
            status: item.status,
            comentario: item.comentario,
            incluir_orcamento: item.incluir_orcamento,
            produtos: item.produtos || []
          };
        }
      });
      
      setFormData({
        checklist: checklistObj,
        pre_diagnostico: atendimento.pre_diagnostico || '',
        itens_orcamento: atendimento.itens_orcamento || []
      });
    }
  }, [atendimento, checklistItems]);

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

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Atendimento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['atendimento', id]);
      queryClient.invalidateQueries(['atendimentos']);
      toast.success('Checklist atualizado com sucesso!');
      navigate(createPageUrl(`VerAtendimento?id=${id}`));
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
    // Converter checklist de objeto para array
    const checklistArray = Object.entries(formData.checklist).map(([id, data]) => ({
      item_id: id,
      ...data
    }));

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
              observacao_item: pv.observacao || '',
              origem: 'checklist',
              item_checklist: data.item
            });
          }
        });
      }
    });

    // Consolidar todos os produtos (queixa + checklist)
    const todosOsItens = [...(atendimento.itens_queixa || []), ...produtosDoChecklist];
    const produtosConsolidados = {};
    
    todosOsItens.forEach(item => {
      if (produtosConsolidados[item.produto_id]) {
        produtosConsolidados[item.produto_id].quantidade += item.quantidade;
        produtosConsolidados[item.produto_id].valor_total = 
          produtosConsolidados[item.produto_id].quantidade * produtosConsolidados[item.produto_id].valor_unitario;
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
    const subtotal_queixa = (atendimento.itens_queixa || []).reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const subtotal_checklist = produtosDoChecklist.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const subtotal = itensConsolidados.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const valor_final = subtotal - (atendimento.desconto || 0);

    const historicoItem = {
      data: new Date().toISOString(),
      usuario: user?.email || 'Sistema',
      campo_editado: 'checklist',
      descricao: 'Checklist editado e atualizado'
    };

    updateMutation.mutate({
      checklist: checklistArray,
      pre_diagnostico: formData.pre_diagnostico,
      itens_orcamento: itensConsolidados,
      subtotal_queixa,
      subtotal_checklist,
      subtotal,
      valor_final,
      status: 'em_diagnostico',
      historico_edicoes: [...(atendimento.historico_edicoes || []), historicoItem]
    });
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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

  const categorias = [...new Set(checklistItems.map(i => i.categoria))];

  return (
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
  );
}