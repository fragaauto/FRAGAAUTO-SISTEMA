import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ticket } from 'lucide-react';
import { descreverVale } from '@/lib/promocao';

export default function ConfigValeDesconto({ valor, onChange, clientesDestino }) {
  const ativo = !!valor?.vale_ativo;
  const alterar = (campo, v) => onChange({ ...valor, [campo]: v });
  const descricao = descreverVale({ ...valor, vale_ativo: ativo });

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-amber-50/50">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Checkbox checked={ativo} onCheckedChange={(v) => alterar('vale_ativo', !!v)} />
        <Ticket className="w-4 h-4 text-amber-600" />
        Oferecer vale desconto extra para quem reservar pela página
      </label>

      {ativo && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tipo de desconto</Label>
              <Select value={valor?.vale_tipo || 'percentual'} onValueChange={(v) => alterar('vale_tipo', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                {valor?.vale_tipo === 'fixo' ? 'Valor do vale (R$)' : 'Desconto (%)'}
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={valor?.vale_valor ?? 0}
                onChange={(e) => alterar('vale_valor', Number(e.target.value) || 0)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Validade (dias)</Label>
              <Input
                type="number"
                min={1}
                value={valor?.vale_validade_dias ?? 30}
                onChange={(e) => alterar('vale_validade_dias', Number(e.target.value) || 30)}
                className="h-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Motivo / para que serve o vale</Label>
            <Input
              value={valor?.vale_motivo || ''}
              onChange={(e) => alterar('vale_motivo', e.target.value)}
              placeholder="Ex: desconto para instalação do produto"
              className="h-9"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              O cliente vê este motivo no vale e a equipe na aba "Vales emitidos".
            </p>
          </div>
          <p className="text-xs text-slate-600">
            Cada cliente que reservar pela página recebe um código com {descricao || 'o desconto configurado'},
            válido por {valor?.vale_validade_dias ?? 30} dia(s). A equipe acompanha e baixa os vales na aba
            "Vales emitidos".
            {typeof clientesDestino === 'number' && clientesDestino > 0
              ? ` Potencial de ${clientesDestino} vale(s) nesta campanha.`
              : ''}
          </p>
        </div>
      )}
    </div>
  );
}