import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DollarSign, Plus, Trash2, CheckCircle2, AlertTriangle, Loader2,
  CreditCard, Banknote, Smartphone, Building2, FileText, Receipt, RotateCcw, Lock,
  Wrench, X
} from 'lucide-react';
import ReciboAtendimento from './ReciboAtendimento';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FORMAS = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'cartao_credito', label: 'Crédito', icon: CreditCard },
  { value: 'cartao_debito', label: 'Débito', icon: CreditCard },
  { value: 'transferencia', label: 'Transferência', icon: Building2 },
  { value: 'boleto', label: 'Boleto', icon: FileText },
  { value: 'faturado', label: 'Faturado', icon: Receipt },
];

export default function AbaFinalizacaoPagamento({ atendimento, onUpdate }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState({});

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });
  const config = configs[0] || {};
  const taxasPagamento = config.taxas_pagamento || [];
  const parcelasConfig = config.parcelas_credito || [];

  const getTaxaForma = (forma) => {
    const t = taxasPagamento.find(t => t.forma === forma);
    return t?.taxa_percentual || 0;
  };

  const getTaxaParcela = (parcelas) => {
    const p = parcelasConfig.find(p => p.parcelas === parcelas);
    return p?.taxa_percentual || 0;
  };

  // Buscar técnicos cadastrados (todos os usuários registrados no menu Cadastros)
  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Somente itens aprovados pelo cliente vão para o pagamento
  const itensAprovadosQueixa = (atendimento.itens_queixa || []).filter(i => i.status_aprovacao === 'aprovado');
  const itensAprovadosOrcamento = (atendimento.itens_orcamento || []).filter(i => i.status_aprovacao === 'aprovado');
  const todosItensAprovados = [...itensAprovadosQueixa, ...itensAprovadosOrcamento];

  // Se nenhum item foi aprovado/reprovado ainda, usar valor_final normal (comportamento antigo)
  const temDecisoes = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])].some(
    i => i.status_aprovacao === 'aprovado' || i.status_aprovacao === 'reprovado'
  );

  const valorBase = temDecisoes
    ? todosItensAprovados.reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0)
    : (atendimento.valor_final || atendimento.subtotal || 0);
  const jaLancado = atendimento.status_pagamento === 'pago' || atendimento.status_pagamento === 'parcial' || atendimento.status_pagamento === 'faturado';

  const [tecnicosSelecionados, setTecnicosSelecionados] = useState(atendimento.tecnicos_responsaveis || []);
  const [obsInterna, setObsInterna] = useState(atendimento.obs_interna || '');
  const [obsExterna, setObsExterna] = useState(atendimento.obs_externa || '');
  const [descontoTipo, setDescontoTipo] = useState('valor');
  const [descontoValor, setDescontoValor] = useState(atendimento.desconto_pagamento || 0);
  const [pagamentos, setPagamentos] = useState(() => {
    if (atendimento.formas_pagamento_lancamento?.length > 0) {
      return atendimento.formas_pagamento_lancamento;
    }
    // Calcular valor inicial considerando desconto já aplicado
    const valorInicial = valorBase - (atendimento.desconto_pagamento || 0);
    return [{ forma: 'pix', valor: Math.max(0, valorInicial) }];
  });

  const desconto = descontoTipo === 'percentual'
    ? (valorBase * descontoValor) / 100
    : descontoValor;
  const totalComDesconto = Math.max(0, valorBase - desconto);
  const totalPago = pagamentos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const diferenca = totalPago - totalComDesconto;

  // Calcula valor líquido por pagamento (descontando taxa da maquininha)
  const calcValorLiquido = (pag, idx) => {
    const valor = parseFloat(pag.valor) || 0;
    let taxa = getTaxaForma(pag.forma);
    if (pag.forma === 'cartao_credito' && parcelasSelecionadas[idx] > 1) {
      taxa = getTaxaParcela(parcelasSelecionadas[idx]);
    }
    return valor * (1 - taxa / 100);
  };
  const totalLiquido = pagamentos.reduce((s, p, i) => s + calcValorLiquido(p, i), 0);

  const addPagamento = () => setPagamentos([...pagamentos, { forma: 'dinheiro', valor: 0 }]);
  const removePagamento = (i) => setPagamentos(pagamentos.filter((_, idx) => idx !== i));
  const updatePagamento = (i, field, val) => {
    const novo = [...pagamentos];
    novo[i] = { ...novo[i], [field]: field === 'valor' ? parseFloat(val) || 0 : val };
    setPagamentos(novo);
  };

  // Atualizar valores de pagamento quando desconto mudar
  React.useEffect(() => {
    if (pagamentos.length === 1 && !jaLancado) {
      const valorAtualizado = Math.max(0, totalComDesconto);
      if (Math.abs(pagamentos[0].valor - valorAtualizado) > 0.01) {
        setPagamentos([{ ...pagamentos[0], valor: valorAtualizado }]);
      }
    }
  }, [totalComDesconto]);

  const salvarObsMutation = useMutation({
    mutationFn: () => base44.entities.Atendimento.update(atendimento.id, {
      obs_interna: obsInterna,
      obs_externa: obsExterna,
      obs_interna_usuario: user?.email,
      obs_interna_data: new Date().toISOString(),
    }),
    onSuccess: () => { toast.success('Observações salvas!'); onUpdate?.(); }
  });

  const addTecnico = (tecnico) => {
    if (!tecnicosSelecionados.find(t => t.id === tecnico.id)) {
      const novoTecnico = { id: tecnico.id, nome: tecnico.full_name || tecnico.email };
      const novosTecnicos = [...tecnicosSelecionados, novoTecnico];
      setTecnicosSelecionados(novosTecnicos);
      
      // Atribuir automaticamente a todos os itens aprovados
      const itensAtualizados = [...itensAprovadosQueixa, ...itensAprovadosOrcamento].map(item => {
        const tecnicosAtuais = item.tecnicos || [];
        if (!tecnicosAtuais.find(t => t.id === novoTecnico.id)) {
          return {
            ...item,
            tecnicos: [...tecnicosAtuais, novoTecnico]
          };
        }
        return item;
      });
      
      // Atualizar o atendimento com os técnicos atribuídos aos itens
      if (itensAtualizados.length > 0) {
        const queixaAtualizada = (atendimento.itens_queixa || []).map(item => {
          const itemAtualizado = itensAtualizados.find(i => i.produto_id === item.produto_id && i.nome === item.nome);
          return itemAtualizado || item;
        });
        const orcamentoAtualizado = (atendimento.itens_orcamento || []).map(item => {
          const itemAtualizado = itensAtualizados.find(i => i.produto_id === item.produto_id && i.nome === item.nome);
          return itemAtualizado || item;
        });
        
        base44.entities.Atendimento.update(atendimento.id, {
          itens_queixa: queixaAtualizada,
          itens_orcamento: orcamentoAtualizado
        }).then(() => {
          queryClient.invalidateQueries(['atendimento']);
          toast.success(`Técnico ${novoTecnico.nome} atribuído a ${itensAtualizados.length} serviço(s)`);
        });
      }
    }
  };

  const removeTecnico = (id) => {
    setTecnicosSelecionados(tecnicosSelecionados.filter(t => t.id !== id));
  };

  const lancarCaixaMutation = useMutation({
    mutationFn: async () => {
      // Validar técnicos responsáveis apenas se configuração obrigar
      const osAtribuicaoObrigatoria = config.os_atribuicao_servico_obrigatoria;
      const osTecnicoObrigatorio = config.os_tecnico_obrigatorio;
      
      if (osTecnicoObrigatorio && tecnicosSelecionados.length === 0) {
        throw new Error('Obrigatório informar ao menos um técnico responsável');
      }
      if (Math.abs(diferenca) > 0.01) throw new Error(`Diferença de R$ ${Math.abs(diferenca).toFixed(2)} entre pagamentos e total`);
      
      // Validar atribuição de técnicos aos serviços se obrigatório
      if (osAtribuicaoObrigatoria) {
        const servicosSemTecnico = [];
        [...itensAprovadosQueixa, ...itensAprovadosOrcamento].forEach(item => {
          if (!item.tecnicos || item.tecnicos.length === 0) {
            servicosSemTecnico.push(item.nome);
          }
        });
        
        if (servicosSemTecnico.length > 0) {
          throw new Error(
            `Atribuição de técnicos obrigatória!\n\nServiços sem técnico atribuído:\n${servicosSemTecnico.map(s => `• ${s}`).join('\n')}\n\nAtribua técnicos a cada serviço antes de finalizar.`
          );
        }
      }

      const isFaturado = pagamentos.some(p => p.forma === 'faturado');
      const statusPag = isFaturado ? 'faturado' : 'pago';

      // Baixar estoque dos produtos aprovados
      const itens = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])];
      const pecas = itens.filter(it => it.status_aprovacao === 'aprovado' && it.produto_id);

      // Agrupar por produto_id para somar quantidades
      const quantPorProduto = {};
      for (const p of pecas) {
        quantPorProduto[p.produto_id] = (quantPorProduto[p.produto_id] || 0) + (p.quantidade || 1);
      }

      // Buscar produtos que controlam estoque e atualizar
      for (const [produtoId, qtd] of Object.entries(quantPorProduto)) {
        const produtoAtual = await base44.entities.Produto.get(produtoId).catch(() => null);
        if (produtoAtual?.controla_estoque) {
          const novoEstoque = Math.max(0, (produtoAtual.estoque_atual || 0) - qtd);
          await base44.entities.Produto.update(produtoId, { estoque_atual: novoEstoque });
        }
      }

      // Registrar movimentos de estoque
      const movimentos = pecas.map(p => ({
        produto_id: p.produto_id,
        produto_nome: p.nome,
        tipo: 'saida',
        quantidade: p.quantidade || 1,
        atendimento_id: atendimento.id,
        usuario: user?.email,
        data_movimento: new Date().toISOString(),
      }));
      if (movimentos.length > 0) {
        await base44.entities.MovimentoEstoque.bulkCreate(movimentos);
      }

      // Lançamentos no caixa com valor líquido (descontando taxa da maquininha)
      for (let i = 0; i < pagamentos.length; i++) {
        const pag = pagamentos[i];
        const valorBruto = parseFloat(pag.valor) || 0;
        let taxa = getTaxaForma(pag.forma);
        if (pag.forma === 'cartao_credito' && parcelasSelecionadas[i] > 1) {
          taxa = getTaxaParcela(parcelasSelecionadas[i]);
        }
        const valorLiquido = valorBruto * (1 - taxa / 100);
        const parcelas = pag.forma === 'cartao_credito' ? (parcelasSelecionadas[i] || 1) : null;

        await base44.entities.LancamentoFinanceiro.create({
          tipo: 'entrada',
          descricao: `Atendimento ${atendimento.placa} - ${atendimento.cliente_nome || ''}${parcelas > 1 ? ` (${parcelas}x)` : ''}`,
          valor: valorLiquido,
          valor_bruto: valorBruto,
          taxa_percentual: taxa,
          forma_pagamento: pag.forma,
          parcelas: parcelas,
          atendimento_id: atendimento.id,
          usuario: user?.email,
          data_lancamento: new Date().toISOString(),
          categoria: 'servico',
        });
      }

      // Conta a receber se faturado
      if (isFaturado) {
        await base44.entities.ContaReceber.create({
          cliente_id: atendimento.cliente_id,
          cliente_nome: atendimento.cliente_nome,
          cliente_telefone: atendimento.cliente_telefone,
          atendimento_id: atendimento.id,
          descricao: `Atendimento ${atendimento.placa} - ${atendimento.modelo}`,
          valor_total: totalComDesconto,
          valor_pago: 0,
          desconto: desconto,
          forma_pagamento: 'faturado',
          formas_pagamento: pagamentos,
          status: 'pendente',
          usuario_lancamento: user?.email,
          data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Atualizar atendimento
      await base44.entities.Atendimento.update(atendimento.id, {
        status_pagamento: statusPag,
        formas_pagamento_lancamento: pagamentos,
        desconto_pagamento: desconto,
        valor_final_pago: totalComDesconto,
        obs_interna: obsInterna,
        obs_externa: obsExterna,
        data_pagamento: new Date().toISOString(),
        usuario_pagamento: user?.email,
        tecnicos_responsaveis: tecnicosSelecionados,
        tecnico: tecnicosSelecionados.map(t => t.nome).join(', '),
        status: 'concluido',
      });
    },
    onSuccess: () => {
      toast.success('✅ Lançado no caixa com sucesso!');
      queryClient.invalidateQueries(['atendimento']);
      onUpdate?.();
      navigate(createPageUrl('Atendimentos'));
    },
    onError: (e) => {
      const msg = e.message || 'Erro ao lançar no caixa';
      if (msg.includes('Atribuição de técnicos obrigatória')) {
        toast.error(msg, { duration: 8000 });
      } else {
        toast.error(msg);
      }
    },
  });

  const estornarMutation = useMutation({
    mutationFn: async () => {
      // Estornar lançamentos financeiros do atendimento
      // Deletar lançamentos financeiros do atendimento (sem gerar saída de estorno)
      const lancamentos = await base44.entities.LancamentoFinanceiro.filter({ atendimento_id: atendimento.id });
      for (const lanc of lancamentos) {
        await base44.entities.LancamentoFinanceiro.delete(lanc.id);
      }

      // Estornar movimentos de estoque e devolver ao saldo do produto
      const movimentos = await base44.entities.MovimentoEstoque.filter({ atendimento_id: atendimento.id });
      const quantEstornarPorProduto = {};
      for (const mov of movimentos) {
        if (mov.tipo === 'saida') {
          quantEstornarPorProduto[mov.produto_id] = (quantEstornarPorProduto[mov.produto_id] || 0) + (mov.quantidade || 0);
          await base44.entities.MovimentoEstoque.create({
            produto_id: mov.produto_id,
            produto_nome: mov.produto_nome,
            tipo: 'estorno',
            quantidade: mov.quantidade,
            atendimento_id: atendimento.id,
            usuario: user?.email,
            data_movimento: new Date().toISOString(),
            observacoes: `Estorno do atendimento ${atendimento.placa}`,
          });
        }
      }
      // Devolver estoque ao produto
      for (const [produtoId, qtd] of Object.entries(quantEstornarPorProduto)) {
        const produtoAtual = await base44.entities.Produto.get(produtoId).catch(() => null);
        if (produtoAtual?.controla_estoque) {
          await base44.entities.Produto.update(produtoId, { estoque_atual: (produtoAtual.estoque_atual || 0) + qtd });
        }
      }

      // Reabrir atendimento
      await base44.entities.Atendimento.update(atendimento.id, {
        status_pagamento: null,
        status: 'concluido',
        data_pagamento: null,
        usuario_pagamento: null,
      });
    },
    onSuccess: () => {
      toast.success('Estorno realizado! Atendimento reaberto para edição.');
      queryClient.invalidateQueries(['atendimento']);
      onUpdate?.();
    },
    onError: (e) => toast.error(e.message || 'Erro ao estornar'),
  });

  return (
    <div className="space-y-4 pb-8">

      {/* Observações Internas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            🔒 Observações Internas
            <Badge variant="outline" className="text-xs">Interno</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={obsInterna}
            onChange={e => setObsInterna(e.target.value)}
            placeholder="Observações visíveis apenas para a equipe..."
            className="min-h-[80px] text-sm"
          />
          {atendimento.obs_interna_usuario && (
            <p className="text-xs text-slate-400">
              Última edição: {atendimento.obs_interna_usuario} • {atendimento.obs_interna_data ? new Date(atendimento.obs_interna_data).toLocaleString('pt-BR') : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Observações Externas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            📄 Observações para o Cliente
            <Badge variant="outline" className="text-xs text-green-700 border-green-300">Aparece no PDF</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={obsExterna}
            onChange={e => setObsExterna(e.target.value)}
            placeholder="Orientações, garantia, próximas revisões... (aparece no PDF e WhatsApp)"
            className="min-h-[80px] text-sm"
          />
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => salvarObsMutation.mutate()}
        disabled={salvarObsMutation.isPending}
        className="w-full"
      >
        {salvarObsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Salvar Observações
      </Button>

      {/* Técnicos Responsáveis */}
      <Card className={config.os_tecnico_obrigatorio && tecnicosSelecionados.length === 0 && !jaLancado ? 'border-red-300 bg-red-50' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-500" />
            Técnicos Responsáveis
            {config.os_tecnico_obrigatorio && (
              <Badge variant="outline" className="text-xs text-red-600 border-red-300">Obrigatório</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Selecionados */}
          {tecnicosSelecionados.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tecnicosSelecionados.map(t => (
                <div key={t.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                  <Wrench className="w-3 h-3" />
                  {t.nome}
                  {!jaLancado && (
                    <button onClick={() => removeTecnico(t.id)} className="ml-1 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!jaLancado && (
            <>
              {tecnicos.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhum funcionário cadastrado. Convide funcionários no menu Cadastros.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {tecnicos.filter(t => !tecnicosSelecionados.find(s => s.id === t.id)).map(t => (
                    <button
                      key={t.id}
                      onClick={() => addTecnico(t)}
                      className="px-2 py-1 rounded text-xs border border-blue-200 text-blue-700 hover:bg-blue-50 transition-all"
                    >
                      + {t.full_name || t.email}
                    </button>
                  ))}
                </div>
              )}
              {config.os_tecnico_obrigatorio && tecnicosSelecionados.length === 0 && (
                <p className="text-xs text-red-500 font-medium">⚠ Selecione ao menos um técnico para lançar no caixa</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Desconto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">💸 Desconto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={descontoTipo === 'valor' ? 'default' : 'outline'}
              onClick={() => setDescontoTipo('valor')}
              className="flex-1"
            >R$ Valor</Button>
            <Button
              size="sm"
              variant={descontoTipo === 'percentual' ? 'default' : 'outline'}
              onClick={() => setDescontoTipo('percentual')}
              className="flex-1"
            >% Percentual</Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={descontoValor}
              onChange={e => setDescontoValor(parseFloat(e.target.value) || 0)}
              placeholder={descontoTipo === 'percentual' ? 'Ex: 10' : 'Ex: 50.00'}
              min={0}
            />
            <span className="text-sm text-slate-500 whitespace-nowrap">
              = R$ {desconto.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Formas de Pagamento */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">💳 Formas de Pagamento</CardTitle>
            <Button size="sm" variant="outline" onClick={addPagamento}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {pagamentos.map((pag, i) => {
            const taxa = pag.forma === 'cartao_credito' && parcelasSelecionadas[i] > 1
              ? getTaxaParcela(parcelasSelecionadas[i])
              : getTaxaForma(pag.forma);
            const liquido = calcValorLiquido(pag, i);
            const mostraTaxa = taxa > 0;

            return (
              <div key={i} className="p-3 border border-slate-200 rounded-lg space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {FORMAS.map(f => (
                        <button
                          key={f.value}
                          onClick={() => {
                            updatePagamento(i, 'forma', f.value);
                            setParcelasSelecionadas(prev => ({ ...prev, [i]: 1 }));
                          }}
                          className={`px-2 py-1 rounded text-xs border transition-all ${
                            pag.forma === f.value
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={pag.valor}
                        onChange={e => updatePagamento(i, 'valor', e.target.value)}
                        placeholder="R$ 0,00"
                        className="text-right flex-1"
                      />
                      {pag.forma === 'cartao_credito' && parcelasConfig.length > 0 && (
                        <select
                          value={parcelasSelecionadas[i] || 1}
                          onChange={e => setParcelasSelecionadas(prev => ({ ...prev, [i]: parseInt(e.target.value) }))}
                          className="border border-slate-200 rounded px-2 py-2 text-sm bg-white"
                        >
                          <option value={1}>1x (à vista)</option>
                          {parcelasConfig.sort((a, b) => a.parcelas - b.parcelas).map(p => (
                            <option key={p.parcelas} value={p.parcelas}>{p.parcelas}x</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {mostraTaxa && (
                      <p className="text-xs text-slate-400">
                        Taxa: {taxa}% → Líquido: <span className="font-semibold text-green-700">R$ {liquido.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                  {pagamentos.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => removePagamento(i)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Aviso de atribuição de técnicos obrigatória */}
      {config.os_atribuicao_servico_obrigatoria && !jaLancado && (
        <>
          {(() => {
            const servicosSemTecnico = todosItensAprovados.filter(item => !item.tecnicos || item.tecnicos.length === 0);
            if (servicosSemTecnico.length > 0) {
              return (
                <Card className="border-red-300 bg-red-50">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-sm text-red-800 font-bold flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      Atribuição de técnicos obrigatória!
                    </p>
                    <p className="text-xs text-red-700 mb-2">Os seguintes serviços precisam ter técnicos atribuídos:</p>
                    <div className="space-y-1">
                      {servicosSemTecnico.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          <span className="font-medium">{item.nome}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-red-600 mt-2 italic">Atribua técnicos aos serviços na aba "Orçamento" antes de finalizar.</p>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}
        </>
      )}

      {/* Aviso de itens autorizados */}
      {temDecisoes && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              Cobrança baseada apenas nos {todosItensAprovados.length} serviço(s) autorizado(s) pelo cliente
            </p>
            <div className="mt-2 space-y-1">
              {todosItensAprovados.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-blue-700">
                  <span>
                    {item.nome} {item.quantidade > 1 ? `x${item.quantidade}` : ''}
                    {item.tecnicos && item.tecnicos.length > 0 && (
                      <span className="ml-2 text-blue-500">
                        ({item.tecnicos.map(t => t.nome).join(', ')})
                      </span>
                    )}
                  </span>
                  <span>R$ {Number(item.valor_total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo */}
      <Card className={`border-2 ${Math.abs(diferenca) < 0.01 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardContent className="pt-4 space-y-1">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Serviços Autorizados</span>
            <span>R$ {valorBase.toFixed(2)}</span>
          </div>
          {desconto > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto</span>
              <span>- R$ {desconto.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total a Pagar</span>
            <span>R$ {totalComDesconto.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Total Informado</span>
            <span>R$ {totalPago.toFixed(2)}</span>
          </div>
          {totalLiquido < totalPago && (
            <div className="flex justify-between text-sm text-green-700 font-medium border-t pt-1">
              <span>💵 Valor Líquido (após taxas)</span>
              <span>R$ {totalLiquido.toFixed(2)}</span>
            </div>
          )}
          {Math.abs(diferenca) > 0.01 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${diferenca > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              <AlertTriangle className="w-4 h-4" />
              {diferenca > 0 ? `Troco: R$ ${diferenca.toFixed(2)}` : `Faltando: R$ ${Math.abs(diferenca).toFixed(2)}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recibo — aparece apenas após lançado */}
      {jaLancado && (
        <ReciboAtendimento atendimento={atendimento} config={config} />
      )}

      {/* Botão Lançar no Caixa */}
      {jaLancado ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 py-5 text-green-700 bg-green-50 rounded-xl border-2 border-green-300">
            <Lock className="w-6 h-6" />
            <div className="text-center">
              <p className="font-bold text-lg">Lançado no Caixa</p>
              <p className="text-sm text-green-600">
                {atendimento.data_pagamento
                  ? `em ${new Date(atendimento.data_pagamento).toLocaleString('pt-BR')}`
                  : ''}
                {atendimento.usuario_pagamento ? ` por ${atendimento.usuario_pagamento.split('@')[0]}` : ''}
              </p>
            </div>
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50">
                <RotateCcw className="w-4 h-4 mr-2" />
                Estornar e Reabrir Atendimento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Confirmar Estorno?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá:<br />
                  • Estornar todos os lançamentos financeiros deste atendimento<br />
                  • Reverter as baixas de estoque<br />
                  • Reabrir o atendimento para edição<br /><br />
                  Esta operação não pode ser desfeita automaticamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => estornarMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {estornarMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  Confirmar Estorno
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <>
          <Button
            onClick={() => lancarCaixaMutation.mutate()}
            disabled={
              lancarCaixaMutation.isPending || 
              Math.abs(diferenca) > 0.01 || 
              (config.os_tecnico_obrigatorio && tecnicosSelecionados.length === 0) ||
              (config.os_atribuicao_servico_obrigatoria && todosItensAprovados.some(item => !item.tecnicos || item.tecnicos.length === 0))
            }
            className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {lancarCaixaMutation.isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <DollarSign className="w-5 h-5 mr-2" />
            )}
            LANÇAR NO CAIXA
          </Button>
          {config.os_atribuicao_servico_obrigatoria && todosItensAprovados.some(item => !item.tecnicos || item.tecnicos.length === 0) && (
            <p className="text-center text-xs text-red-600 font-medium -mt-2">
              Atribua técnicos a todos os serviços antes de finalizar
            </p>
          )}
        </>
      )}
    </div>
  );
}