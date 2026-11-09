import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import BuscaOSOrigem from './BuscaOSOrigem';

export default function ExecucaoEncomendaCard({
  ativo,
  onToggle,
  recentes = [],
  origem,
  itens = [],
  onSelectOrigem,
  onToggleItem,
}) {
  // Custos registrados no Controle de Encomendas para a OS de origem
  const { data: encomendas = [] } = useQuery({
    queryKey: ['encomendas-origem', origem?.id],
    queryFn: () => base44.entities.Encomenda.filter({ atendimento_id: origem.id }),
    enabled: !!origem?.id,
    staleTime: 60 * 1000,
  });

  const itensOrigem = useMemo(() => {
    if (!origem) return [];
    const queixa = (origem.itens_queixa || []).map((it, i) => ({ ...it, _source: 'queixa', _index: i, _key: `queixa-${i}` }));
    const orcamento = (origem.itens_orcamento || []).map((it, i) => ({ ...it, _source: 'orcamento', _index: i, _key: `orcamento-${i}` }));
    const todos = [...queixa, ...orcamento].filter(it => it.nome);
    const encomendados = todos.filter(it => it.sob_encomenda);
    return encomendados.length > 0 ? encomendados : todos;
  }, [origem]);

  const custoDoItem = (it) => {
    const doItem = Number(it.custo_encomenda_valor);
    if (doItem > 0) return doItem;
    const encomenda = encomendas.find(e => (e.peca || '').trim().toLowerCase() === (it.nome || '').trim().toLowerCase());
    return Number(encomenda?.custo_encomenda) || 0;
  };

  const isSelecionado = (key) => itens.some(i => i.key === key);
  const totalPecas = itens.reduce((s, i) => s + (Number(i.valor_total) || 0), 0);
  const totalCusto = itens.reduce((s, i) => s + (Number(i.custo) || 0), 0);

  return (
    <Card className={ativo ? 'border-green-300 bg-green-50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Checkbox
            id="execucao_encomenda"
            checked={ativo}
            onCheckedChange={(checked) => onToggle(checked)}
          />
          <div className="flex-1">
            <label
              htmlFor="execucao_encomenda"
              className="text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-2"
            >
              <Package className="w-4 h-4 text-green-600" />
              Execução de encomenda
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Marque quando esta OS é a instalação de peça(s) encomendada(s) em uma OS anterior. Selecione as peças da OS de origem — o técnico recebe o valor da peça já descontado o custo informado na última OS.
            </p>
          </div>
        </div>

        {ativo && (
          <div className="mt-4 space-y-4">
            <BuscaOSOrigem
              origem={origem}
              onSelect={onSelectOrigem}
              recentes={recentes}
              label="OS de origem (onde a peça foi encomendada)"
              tone="green"
            />

            {origem && itensOrigem.length > 0 && (
              <div>
                <Label className="text-xs">Peças encomendadas na OS de origem (selecione uma ou mais)</Label>
                <div className="mt-1 space-y-1.5">
                  {itensOrigem.map((it) => {
                    const checked = isSelecionado(it._key);
                    const custo = custoDoItem(it);
                    const valor = Number(it.valor_total) || 0;
                    return (
                      <label
                        key={it._key}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${checked ? 'border-green-400 bg-green-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => onToggleItem({ ...it, custo }, c)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{it.nome}</p>
                          <p className="text-xs text-slate-500">
                            Venda R$ {valor.toFixed(2)} · Custo R$ {custo.toFixed(2)} · Produção R$ {(valor - custo).toFixed(2)}
                          </p>
                        </div>
                        {it.sob_encomenda && (
                          <span className="text-[10px] font-semibold text-green-700 bg-green-100 border border-green-200 rounded px-1.5 py-0.5">
                            Encomenda
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {itens.length > 0 && (
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    {itens.length} peça(s) selecionada(s) — produção do técnico: R$ {(totalPecas - totalCusto).toFixed(2)}
                    {' '}(venda R$ {totalPecas.toFixed(2)} − custo R$ {totalCusto.toFixed(2)})
                  </p>
                )}
              </div>
            )}

            {origem && itensOrigem.length === 0 && (
              <p className="text-xs text-slate-500">A OS de origem não possui peças cadastradas.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}