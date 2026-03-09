import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Plus, Trash2, Percent } from 'lucide-react';
import TaxasMaquininha from './TaxasMaquininha';

export default function TabFinanceiro({ formData, onChange, onSave, isSaving }) {
  const updateForma = (idx, value) => {
    const novas = [...(formData.formas_pagamento || [])];
    novas[idx] = { ...novas[idx], ativa: value };
    onChange('formas_pagamento', novas);
  };

  const addImposto = () => {
    onChange('impostos', [...(formData.impostos || []), { nome: '', percentual: 0, ativo: true }]);
  };

  const updateImposto = (idx, key, value) => {
    const ni = [...(formData.impostos || [])];
    ni[idx] = { ...ni[idx], [key]: value };
    onChange('impostos', ni);
  };

  const removeImposto = (idx) => {
    onChange('impostos', (formData.impostos || []).filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Formas de Pagamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">Selecione as formas de pagamento disponíveis no orçamento do cliente</p>
          {(formData.formas_pagamento || []).map((forma, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label>{forma.nome}</Label>
              <Switch checked={!!forma.ativa} onCheckedChange={(v) => updateForma(idx, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <TaxasMaquininha
        taxas={formData.taxas_pagamento}
        parcelas={formData.parcelas_credito}
        onChangeTaxas={(val) => onChange('taxas_pagamento', val)}
        onChangeParcelas={(val) => onChange('parcelas_credito', val)}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-red-500" />
              Impostos
            </CardTitle>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={addImposto}>
              <Plus className="w-4 h-4 mr-1" />Adicionar Imposto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">Configure os impostos incidentes sobre o faturamento. Serão descontados no relatório de produção.</p>
          {(formData.impostos || []).length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <Percent className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum imposto configurado</p>
            </div>
          ) : (
            (formData.impostos || []).map((imp, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Input
                  value={imp.nome}
                  onChange={e => updateImposto(idx, 'nome', e.target.value)}
                  placeholder="Nome (ex: ISS, Simples Nacional)"
                  className="flex-1"
                />
                <div className="flex items-center gap-1 w-28">
                  <Input
                    type="number"
                    value={imp.percentual}
                    onChange={e => updateImposto(idx, 'percentual', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <span className="text-slate-500 text-sm">%</span>
                </div>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeImposto(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Financeiro
        </Button>
      </div>
    </div>
  );
}