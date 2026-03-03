import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DollarSign, Plus, Trash2, CheckCircle2, AlertTriangle, Loader2,
  CreditCard, Banknote, Smartphone, Building2, FileText, Receipt
} from 'lucide-react';

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

  const valorBase = atendimento.valor_final || atendimento.subtotal || 0;
  const jaLancado = atendimento.status_pagamento === 'pago' || atendimento.status_pagamento === 'parcial';

  const [obsInterna, setObsInterna] = useState(atendimento.obs_interna || '');
  const [obsExterna, setObsExterna] = useState(atendimento.obs_externa || '');
  const [descontoTipo, setDescontoTipo] = useState('valor');
  const [descontoValor, setDescontoValor] = useState(atendimento.desconto_pagamento || 0);
  const [pagamentos, setPagamentos] = useState(
    atendimento.formas_pagamento_lancamento?.length > 0
      ? atendimento.formas_pagamento_lancamento
      : [{ forma: 'pix', valor: valorBase }]
  );

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

  const salvarObsMutation = useMutation({
    mutationFn: () => base44.entities.Atendimento.update(atendimento.id, {
      obs_interna: obsInterna,
      obs_externa: obsExterna,
      obs_interna_usuario: user?.email,
      obs_interna_data: new Date().toISOString(),
    }),
    onSuccess: () => { toast.success('Observações salvas!'); onUpdate?.(); }
  });

  const lancarCaixaMutation = useMutation({
    mutationFn: async () => {
      if (Math.abs(diferenca) > 0.01) throw new Error(`Diferença de R$ ${Math.abs(diferenca).toFixed(2)} entre pagamentos e total`);

      const isFaturado = pagamentos.some(p => p.forma === 'faturado');
      const statusPag = isFaturado ? 'faturado' : 'pago';

      // Verificar estoque se necessário
      const itens = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])];
      const pecas = itens.filter(it => it.status_aprovacao === 'aprovado');

      // Baixar estoque
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
        status: 'concluido',
      });
    },
    onSuccess: () => {
      toast.success('Lançado no caixa com sucesso!');
      queryClient.invalidateQueries(['atendimento']);
      onUpdate?.();
    },
    onError: (e) => toast.error(e.message || 'Erro ao lançar no caixa'),
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

      {/* Resumo */}
      <Card className={`border-2 ${Math.abs(diferenca) < 0.01 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardContent className="pt-4 space-y-1">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
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
          {Math.abs(diferenca) > 0.01 && (
            <div className={`flex items-center gap-1 text-sm font-medium ${diferenca > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              <AlertTriangle className="w-4 h-4" />
              {diferenca > 0 ? `Troco: R$ ${diferenca.toFixed(2)}` : `Faltando: R$ ${Math.abs(diferenca).toFixed(2)}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão Lançar no Caixa */}
      {jaLancado ? (
        <div className="flex items-center justify-center gap-2 py-4 text-green-700 bg-green-50 rounded-xl border border-green-200">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">Já lançado no caixa</span>
        </div>
      ) : (
        <Button
          onClick={() => lancarCaixaMutation.mutate()}
          disabled={lancarCaixaMutation.isPending || Math.abs(diferenca) > 0.01}
          className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700"
        >
          {lancarCaixaMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <DollarSign className="w-5 h-5 mr-2" />
          )}
          LANÇAR NO CAIXA
        </Button>
      )}
    </div>
  );
}