import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Undo2 } from 'lucide-react';
import BuscaOSOrigem from './BuscaOSOrigem';

export default function RetornoServicoCard({
  ativo,
  onToggle,
  atendimentos,
  origem,
  carregando = false,
  servicosGarantia = [],
  onSelectOrigem,
  onToggleServico,
}) {
  const itensOrigem = useMemo(() => {
    if (!origem) return [];
    const queixa = (origem.itens_queixa || []).map((it, i) => ({ ...it, _source: 'queixa', _index: i, _key: `queixa-${i}` }));
    const orcamento = (origem.itens_orcamento || []).map((it, i) => ({ ...it, _source: 'orcamento', _index: i, _key: `orcamento-${i}` }));
    return [...queixa, ...orcamento].filter(it => it.nome);
  }, [origem]);

  const isSelecionado = (key) => servicosGarantia.some(s => s.key === key);
  const totalDesconto = servicosGarantia.reduce((s, g) => s + (Number(g.valor_total) || 0), 0);

  return (
    <Card className={ativo ? 'border-amber-300 bg-amber-50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Checkbox
            id="retorno_servico"
            checked={ativo}
            onCheckedChange={(checked) => onToggle(checked)}
          />
          <div className="flex-1">
            <label
              htmlFor="retorno_servico"
              className="text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-2"
            >
              <Undo2 className="w-4 h-4 text-amber-600" />
              Retorno de Serviço (Garantia)
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Marque quando este atendimento é um retorno/garantia. Selecione qual serviço da OS de origem deu garantia — seu valor será descontado da produção do técnico responsável. Se não selecionar nenhum, o valor total da OS de origem será descontado.
            </p>
          </div>
        </div>

        {ativo && (
          <div className="mt-4 space-y-4">
            <BuscaOSOrigem
              origem={origem}
              onSelect={onSelectOrigem}
              recentes={atendimentos}
              tone="amber"
            />

            {origem && itensOrigem.length > 0 && (
              <div>
                <Label className="text-xs">Qual serviço deu garantia? (selecione um ou mais)</Label>
                <div className="mt-1 space-y-1.5">
                  {itensOrigem.map(it => {
                    const checked = isSelecionado(it._key);
                    const techs = (it.tecnicos || []).map(t => t.nome).filter(Boolean).join(', ');
                    return (
                      <label
                        key={it._key}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${checked ? 'border-amber-400 bg-amber-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <Checkbox checked={checked} onCheckedChange={(c) => onToggleServico(it, c)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{it.nome}</p>
                          <p className="text-xs text-slate-500">
                            R$ {(Number(it.valor_total) || 0).toFixed(2)}
                            {techs && ` · Téc: ${techs}`}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {servicosGarantia.length > 0 && (
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    {servicosGarantia.length} serviço(s) selecionado(s) — desconto total: R$ {totalDesconto.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {origem && carregando && itensOrigem.length === 0 && (
              <p className="text-xs text-slate-500">Carregando serviços da OS de origem...</p>
            )}

            {origem && !carregando && itensOrigem.length === 0 && (
              <p className="text-xs text-slate-500">A OS de origem não possui serviços cadastrados.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}