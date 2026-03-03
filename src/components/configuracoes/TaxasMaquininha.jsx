import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Percent } from 'lucide-react';

const FORMAS_PADRAO = [
  { forma: 'dinheiro', label: 'Dinheiro' },
  { forma: 'pix', label: 'PIX' },
  { forma: 'cartao_debito', label: 'Cartão de Débito' },
  { forma: 'cartao_credito', label: 'Cartão de Crédito (à vista)' },
  { forma: 'transferencia', label: 'Transferência' },
  { forma: 'boleto', label: 'Boleto' },
];

export default function TaxasMaquininha({ taxas = [], parcelas = [], onChangeTaxas, onChangeParcelas }) {
  // Garantir que todas as formas padrão existam
  const taxasCompletas = FORMAS_PADRAO.map(f => {
    const existing = taxas.find(t => t.forma === f.forma);
    return existing || { forma: f.forma, label: f.label, taxa_percentual: 0 };
  });

  const updateTaxa = (forma, valor) => {
    const novas = taxasCompletas.map(t =>
      t.forma === forma ? { ...t, taxa_percentual: parseFloat(valor) || 0 } : t
    );
    onChangeTaxas(novas);
  };

  const addParcela = () => {
    const maxParcela = parcelas.length > 0 ? Math.max(...parcelas.map(p => p.parcelas)) : 1;
    onChangeParcelas([...parcelas, { parcelas: maxParcela + 1, taxa_percentual: 0 }]);
  };

  const removeParcela = (idx) => {
    onChangeParcelas(parcelas.filter((_, i) => i !== idx));
  };

  const updateParcela = (idx, field, val) => {
    const novas = [...parcelas];
    novas[idx] = { ...novas[idx], [field]: parseFloat(val) || 0 };
    onChangeParcelas(novas);
  };

  return (
    <div className="space-y-4">
      {/* Taxas por forma de pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="w-5 h-5 text-orange-500" />
            Taxas da Maquininha por Forma de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">
            Configure a taxa cobrada pela maquininha em cada forma de pagamento. O valor lançado no caixa será o valor líquido (já descontando a taxa).
          </p>
          <div className="space-y-3">
            {taxasCompletas.map(t => (
              <div key={t.forma} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3">
                <Label className="flex-1 font-medium">{t.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={t.taxa_percentual}
                    onChange={e => updateTaxa(t.forma, e.target.value)}
                    className="w-24 text-right"
                  />
                  <span className="text-sm text-slate-500 w-4">%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parcelas do cartão de crédito */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              💳 Parcelamento no Cartão de Crédito
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addParcela}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">
            Configure as taxas por número de parcelas. Ao lançar parcelado, a taxa correspondente será descontada.
          </p>
          {parcelas.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              Nenhuma configuração de parcela. Clique em "Adicionar" para configurar.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-500 px-2">
                <span>Nº Parcelas</span>
                <span className="text-right">Taxa (%)</span>
                <span></span>
              </div>
              {parcelas.sort((a, b) => a.parcelas - b.parcelas).map((p, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 items-center p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={48}
                      value={p.parcelas}
                      onChange={e => updateParcela(idx, 'parcelas', e.target.value)}
                      className="w-20 text-center"
                    />
                    <span className="text-sm text-slate-500">x</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={p.taxa_percentual}
                      onChange={e => updateParcela(idx, 'taxa_percentual', e.target.value)}
                      className="w-24 text-right"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => removeParcela(idx)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}