import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Plus, Trash2, Gift, UserCheck, Car } from 'lucide-react';
import GerenciarStatus from './GerenciarStatus';

export default function TabAtendimento({ formData, onChange, onSave, isSaving }) {
  const addCondicao = () => {
    onChange('condicoes_especiais', [
      ...(formData.condicoes_especiais || []),
      {
        tipo_gatilho: 'valor',
        valor_minimo: 0,
        itens_minimos: 0,
        tipo: 'desconto',
        descricao: '',
        valor_desconto_percentual: 0,
        parcelas_sem_juros: 0,
        ativa: true
      }
    ]);
  };

  const updateCondicao = (idx, updates) => {
    const novas = [...(formData.condicoes_especiais || [])];
    novas[idx] = { ...novas[idx], ...updates };
    onChange('condicoes_especiais', novas);
  };

  const removeCondicao = (idx) => {
    onChange('condicoes_especiais', (formData.condicoes_especiais || []).filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Campos Obrigatórios Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" />
            Campos Obrigatórios — Cadastro de Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">Defina quais campos são obrigatórios ao cadastrar um novo cliente.</p>
          {[
            { key: 'cliente_nome_obrigatorio', label: 'Nome' },
            { key: 'cliente_telefone_obrigatorio', label: 'Telefone' },
            { key: 'cliente_cpf_obrigatorio', label: 'CPF / CNPJ' },
            { key: 'cliente_nascimento_obrigatorio', label: 'Data de Nascimento' },
            { key: 'cliente_endereco_obrigatorio', label: 'Endereço' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label>{label}</Label>
              <Switch checked={!!formData[key]} onCheckedChange={(v) => onChange(key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Campos Obrigatórios OS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-orange-500" />
            Campos Obrigatórios — Abertura de OS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">Defina quais campos são obrigatórios ao criar um novo atendimento.</p>
          {[
            { key: 'os_placa_obrigatorio', label: 'Placa do Veículo' },
            { key: 'os_modelo_obrigatorio', label: 'Modelo do Veículo' },
            { key: 'os_km_obrigatorio', label: 'KM Atual' },
            { key: 'os_observacoes_veiculo_obrigatorio', label: 'Observações do Veículo' },
            { key: 'os_queixa_obrigatorio', label: 'Queixa Inicial' },
            { key: 'os_tecnico_obrigatorio', label: 'Técnico Responsável' },
            { key: 'os_atribuicao_servico_obrigatoria', label: 'Atribuir técnico a cada serviço' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label>{label}</Label>
              <Switch checked={!!formData[key]} onCheckedChange={(v) => onChange(key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Status Personalizados */}
      <GerenciarStatus
        statusPersonalizados={formData.status_atendimento_personalizados}
        onChange={(val) => onChange('status_atendimento_personalizados', val)}
      />

      {/* Condições Especiais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              Condições Especiais
            </CardTitle>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={addCondicao}>
              <Plus className="w-4 h-4 mr-2" />Adicionar Condição
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Configure descontos, parcelamentos e brindes baseados em valor do orçamento ou quantidade de itens aprovados.
          </p>
          {(formData.condicoes_especiais || []).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Gift className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Nenhuma condição especial configurada</p>
            </div>
          ) : (
            (formData.condicoes_especiais || []).map((condicao, idx) => (
              <Card key={idx} className="border-2">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={!!condicao.ativa} onCheckedChange={(v) => updateCondicao(idx, { ativa: v })} />
                      <Label>Ativa</Label>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeCondicao(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Tipo de Gatilho */}
                  <div>
                    <Label>Tipo de Gatilho</Label>
                    <Select
                      value={condicao.tipo_gatilho || 'valor'}
                      onValueChange={(v) => updateCondicao(idx, { tipo_gatilho: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor">💰 Por valor mínimo do orçamento</SelectItem>
                        <SelectItem value="itens">📦 Por quantidade de itens aprovados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(condicao.tipo_gatilho || 'valor') === 'valor' ? (
                      <div>
                        <Label>Valor Mínimo (R$)</Label>
                        <Input
                          type="number"
                          value={condicao.valor_minimo || 0}
                          onChange={e => updateCondicao(idx, { valor_minimo: parseFloat(e.target.value) || 0 })}
                          placeholder="Ex: 300"
                        />
                        <p className="text-xs text-slate-500 mt-1">Ativa quando orçamento ≥ este valor</p>
                      </div>
                    ) : (
                      <div>
                        <Label>Nº Mínimo de Itens Aprovados</Label>
                        <Input
                          type="number"
                          value={condicao.itens_minimos || 0}
                          onChange={e => updateCondicao(idx, { itens_minimos: parseInt(e.target.value) || 0 })}
                          placeholder="Ex: 3"
                        />
                        <p className="text-xs text-slate-500 mt-1">Ativa quando cliente aprovar ≥ X itens</p>
                      </div>
                    )}

                    <div>
                      <Label>Tipo de Benefício</Label>
                      <Select value={condicao.tipo} onValueChange={(v) => updateCondicao(idx, { tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desconto">Desconto</SelectItem>
                          <SelectItem value="parcelamento">Parcelamento</SelectItem>
                          <SelectItem value="brinde">Brinde</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={condicao.descricao}
                      onChange={e => updateCondicao(idx, { descricao: e.target.value })}
                      placeholder="Ex: Ganhe uma lavagem de cortesia"
                    />
                  </div>

                  {condicao.tipo === 'desconto' && (
                    <div>
                      <Label>Desconto (%)</Label>
                      <Input
                        type="number"
                        value={condicao.valor_desconto_percentual || ''}
                        onChange={e => updateCondicao(idx, { valor_desconto_percentual: parseFloat(e.target.value) || 0 })}
                        placeholder="Ex: 10"
                      />
                    </div>
                  )}

                  {condicao.tipo === 'parcelamento' && (
                    <div>
                      <Label>Parcelas sem juros</Label>
                      <Input
                        type="number"
                        value={condicao.parcelas_sem_juros || ''}
                        onChange={e => updateCondicao(idx, { parcelas_sem_juros: parseInt(e.target.value) || 0 })}
                        placeholder="Ex: 6"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Atendimento
        </Button>
      </div>
    </div>
  );
}