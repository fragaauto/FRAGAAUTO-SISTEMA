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
  Loader2,
  Plus,
  Trash2,
  Search
} from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';

export default function EditarQueixa() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [queixaInicial, setQueixaInicial] = useState('');
  const [itensQueixa, setItensQueixa] = useState([]);
  const [searchProduto, setSearchProduto] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setCheckingAuth(false);
      } catch (error) {
        console.log('Usuário não autenticado, redirecionando para login...');
        localStorage.setItem('redirect_after_login', window.location.pathname + window.location.search);
        base44.auth.redirectToLogin();
      }
    };
    checkAuth();
  }, []);

  const { data: atendimento, isLoading } = useQuery({
    queryKey: ['atendimento', id],
    queryFn: async () => {
      if (!id) return null;
      return await base44.entities.Atendimento.get(id);
    },
    enabled: !!id,
    retry: false
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
    staleTime: 10 * 60 * 1000
  });

  useEffect(() => {
    if (atendimento) {
      setQueixaInicial(atendimento.queixa_inicial || '');
      const itens = Array.isArray(atendimento.itens_queixa) ? atendimento.itens_queixa : [];
      setItensQueixa(itens.map(item => ({
        produto_id: item.produto_id,
        codigo_produto: item.codigo_produto || '',
        nome: item.nome,
        quantidade: Number(item.quantidade) || 1,
        valor_unitario: Number(item.valor_unitario) || 0,
        observacao_item: item.observacao_item || '',
        vantagens: item.vantagens || '',
        desvantagens: item.desvantagens || ''
      })));
    }
  }, [atendimento]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Salvando queixa:", data);
      return await base44.entities.Atendimento.update(id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['atendimento', id] });
      await queryClient.invalidateQueries({ queryKey: ['atendimentos'] });
      toast.success('Queixa atualizada com sucesso!');
      navigate(createPageUrl(`VerAtendimento?id=${id}`));
    },
    onError: (error) => {
      toast.error("Erro ao salvar queixa");
      console.error(error);
    }
  });

  const handleAddProduto = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const novoItem = {
      produto_id: produto.id,
      codigo_produto: produto.codigo || '',
      nome: produto.nome,
      quantidade: 1,
      valor_unitario: Number(produto.valor) || 0,
      observacao_item: '',
      vantagens: produto.vantagens || '',
      desvantagens: produto.desvantagens || ''
    };

    setItensQueixa([...itensQueixa, novoItem]);
    setSearchProduto('');
  };

  const handleRemoveProduto = (index) => {
    setItensQueixa(itensQueixa.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    const novosItens = [...itensQueixa];
    novosItens[index] = {
      ...novosItens[index],
      [field]: field === 'quantidade' || field === 'valor_unitario' ? Number(value) : value
    };
    setItensQueixa(novosItens);
  };

  const handleSave = () => {
    try {
      // Validação
      const erros = [];

      if (!queixaInicial.trim()) {
        erros.push("Preencha a queixa inicial");
      }

      itensQueixa.forEach((item, idx) => {
        if (item.quantidade <= 0) {
          erros.push(`Item ${idx + 1} tem quantidade inválida`);
        }
        if (item.valor_unitario <= 0) {
          erros.push(`Item ${idx + 1} tem valor inválido`);
        }
      });

      if (erros.length > 0) {
        toast.error(erros.join("\n"));
        return;
      }

      // Preparar dados
      const itensComTotal = itensQueixa.map(item => ({
        ...item,
        valor_total: item.quantidade * item.valor_unitario,
        status_aprovacao: item.status_aprovacao || 'pendente',
        status_servico: item.status_servico || 'aguardando_autorizacao',
        observacao_cliente: item.observacao_cliente || null
      }));

      const subtotal_queixa = itensComTotal.reduce((acc, item) => acc + item.valor_total, 0);

      // Manter itens_orcamento (checklist) INTACTOS - não sobrescrever ao editar a queixa
      const itensOrcamentoExistentes = atendimento.itens_orcamento || [];
      const subtotal_checklist = itensOrcamentoExistentes.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0);
      const subtotal = subtotal_queixa + subtotal_checklist;
      const valor_final = subtotal - (Number(atendimento.desconto) || 0);

      const historicoItem = {
        data: new Date().toISOString(),
        usuario: user?.email || 'Sistema',
        campo_editado: 'queixa_inicial',
        descricao: 'Queixa inicial editada'
      };

      const dataToSave = {
        queixa_inicial: queixaInicial,
        itens_queixa: itensComTotal,
        // itens_orcamento NÃO é alterado ao editar a queixa
        subtotal_queixa: Number(subtotal_queixa) || 0,
        subtotal_checklist: Number(subtotal_checklist) || 0,
        subtotal: Number(subtotal) || 0,
        valor_final: Number(valor_final) || 0,
        historico_edicoes: [...(atendimento.historico_edicoes || []), historicoItem]
      };

      updateMutation.mutate(dataToSave);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao processar dados");
    }
  };

  if (!id) {
    navigate(createPageUrl('Atendimentos'));
    return null;
  }

  if (checkingAuth || isLoading || !atendimento || produtos.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-orange-50/30">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm text-slate-600">Carregando...</p>
      </div>
    );
  }

  const produtosFiltrados = produtos.filter(p => {
    if (!searchProduto) return false;
    const search = searchProduto.toLowerCase();
    return p.nome?.toLowerCase().includes(search) || p.codigo?.toLowerCase().includes(search);
  });

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
                  <h1 className="text-xl font-bold text-slate-800">Editar Queixa Inicial</h1>
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

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Queixa do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Descreva a queixa inicial do cliente..."
                value={queixaInicial}
                onChange={(e) => setQueixaInicial(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produtos/Serviços da Queixa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {itensQueixa.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg border space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <p className="font-medium text-slate-800">{item.nome}</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(idx, 'quantidade', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Valor Unitário</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor_unitario}
                            onChange={(e) => handleUpdateItem(idx, 'valor_unitario', e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Observações do Item</Label>
                        <Textarea
                          placeholder="Observações específicas..."
                          value={item.observacao_item}
                          onChange={(e) => handleUpdateItem(idx, 'observacao_item', e.target.value)}
                          className="min-h-[60px]"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-slate-500">
                          {item.quantidade}x R$ {item.valor_unitario.toFixed(2)}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          Total: R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveProduto(idx)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar produto por nome ou código..."
                    value={searchProduto}
                    onChange={(e) => setSearchProduto(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {searchProduto && (
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white">
                    {produtosFiltrados.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleAddProduto(p.id)}
                        className="w-full text-left p-2 hover:bg-slate-100 rounded text-sm flex items-center justify-between"
                      >
                        <span>
                          {p.codigo && <span className="text-slate-500">{p.codigo} - </span>}
                          {p.nome}
                        </span>
                        <span className="text-green-600 font-semibold text-xs">
                          R$ {p.valor?.toFixed(2)}
                        </span>
                      </button>
                    ))}
                    {produtosFiltrados.length === 0 && (
                      <p className="text-center py-2 text-slate-500 text-sm">
                        Nenhum produto encontrado
                      </p>
                    )}
                  </div>
                )}
              </div>
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
    </ErrorBoundary>
  );
}