import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Undo2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function RetornoServicoCard({
  ativo,
  onToggle,
  atendimentos,
  origem,
  servicosGarantia = [],
  onSelectOrigem,
  onToggleServico,
}) {
  const [busca, setBusca] = useState('');
  const [showSug, setShowSug] = useState(false);

  const sugestoes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q.length < 1) return [];
    return atendimentos.filter(a => !a.retorno_servico && (
      String(a.numero_os || '').includes(q) ||
      (a.placa || '').toLowerCase().includes(q) ||
      (a.cliente_nome || '').toLowerCase().includes(q)
    )).slice(0, 8);
  }, [busca, atendimentos]);

  const selecionar = (a) => {
    onSelectOrigem(a);
    setBusca(`OS #${a.numero_os} - ${a.placa || ''} ${a.cliente_nome || ''}`.trim());
    setShowSug(false);
    toast.success(`Retorno vinculado à OS #${a.numero_os}`);
  };

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
            <div className="relative">
              <Label className="text-xs">Vincular à OS de origem</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nº da OS, placa ou cliente..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setShowSug(true); }}
                  onFocus={() => setShowSug(busca.trim().length >= 1)}
                  onBlur={() => setTimeout(() => setShowSug(false), 200)}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              {showSug && sugestoes.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {sugestoes.map(a => (
                    <button
                      key={a.id}
                      onMouseDown={() => selecionar(a)}
                      className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-b last:border-0 flex items-center gap-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 text-sm">
                          OS #{a.numero_os} — {a.placa || 'Sem placa'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {a.cliente_nome || 'Sem cliente'} {a.modelo ? `· ${a.modelo}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {origem && (
                <p className="text-xs text-amber-700 mt-2 font-medium">✓ Vinculado à OS #{origem.numero_os}</p>
              )}
            </div>

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

            {origem && itensOrigem.length === 0 && (
              <p className="text-xs text-slate-500">A OS de origem não possui serviços cadastrados.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}