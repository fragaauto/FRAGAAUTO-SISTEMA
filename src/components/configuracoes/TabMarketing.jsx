import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, TrendingUp } from 'lucide-react';
import LembretesWhatsApp from './LembretesWhatsApp';

export default function TabMarketing({ formData, onChange, onSave, isSaving }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Configurações de Remarketing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dias mínimos para reenvio</Label>
              <Input
                type="number"
                value={formData.dias_minimos_reenvio || 30}
                onChange={e => onChange('dias_minimos_reenvio', parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-slate-500 mt-1">Não reenvia antes de X dias do último contato</p>
            </div>
            <div>
              <Label>Dias de validade da oferta</Label>
              <Input
                type="number"
                value={formData.dias_validade_oferta || 7}
                onChange={e => onChange('dias_validade_oferta', parseInt(e.target.value) || 7)}
              />
            </div>
          </div>
          <div>
            <Label>Oferta Padrão</Label>
            <Input
              value={formData.oferta_padrao_remarketing || ''}
              onChange={e => onChange('oferta_padrao_remarketing', e.target.value)}
              placeholder="Ex: 10% de desconto à vista"
            />
          </div>
          <div>
            <Label>Condição de Pagamento Padrão</Label>
            <Input
              value={formData.condicao_pagamento_remarketing || ''}
              onChange={e => onChange('condicao_pagamento_remarketing', e.target.value)}
              placeholder="Ex: 6x sem juros no cartão"
            />
          </div>
          <div>
            <Label>Texto Base da Mensagem de Remarketing</Label>
            <Textarea
              value={formData.mensagem_remarketing || ''}
              onChange={e => onChange('mensagem_remarketing', e.target.value)}
              className="min-h-[180px] font-mono text-sm"
              placeholder={`Olá {nome} 👋\n\nNa sua última visita identificamos que no seu {veiculo} ficou pendente:\n\n{lista_servicos}\n\nTotal: R$ {total}\n\nTenho uma condição especial pra você! {oferta}\nCondição: {condicao}\nConsigo manter até {data_validade}.\n\nPosso agendar para você?`}
            />
            <p className="text-xs text-slate-500 mt-1">
              Variáveis: {'{nome}'} {'{veiculo}'} {'{lista_servicos}'} {'{total}'} {'{oferta}'} {'{condicao}'} {'{data_validade}'} {'{nome_empresa}'}
            </p>
          </div>
        </CardContent>
      </Card>

      <LembretesWhatsApp />

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Marketing
        </Button>
      </div>
    </div>
  );
}