import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const CATEGORIAS = [
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'portas', label: 'Portas' },
  { value: 'acessorios', label: 'Acessórios' },
  { value: 'estetica', label: 'Estética' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'vidros', label: 'Vidros' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'outros', label: 'Outros' }
];

export default function FormularioProduto({ formData, setFormData, atualizarModelosDetectados }) {
  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => base44.entities.Fornecedor.list(),
    staleTime: 5 * 60 * 1000
  });

  const adicionarFornecedor = () => {
    setFormData({
      ...formData,
      fornecedores: [...(formData.fornecedores || []), {
        fornecedor_nome: '',
        codigo_fornecedor: '',
        preco_compra: 0,
        principal: formData.fornecedores?.length === 0
      }]
    });
  };

  const removerFornecedor = (idx) => {
    setFormData({
      ...formData,
      fornecedores: formData.fornecedores.filter((_, i) => i !== idx)
    });
  };

  const atualizarFornecedor = (idx, campo, valor) => {
    const novos = [...formData.fornecedores];
    novos[idx] = { ...novos[idx], [campo]: valor };
    setFormData({ ...formData, fornecedores: novos });
  };

  const setPrincipal = (idx, checked) => {
    const novos = formData.fornecedores.map((f, i) => ({
      ...f,
      principal: i === idx ? checked : false
    }));
    setFormData({ ...formData, fornecedores: novos });
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label>Código *</Label>
        <Input
          value={formData.codigo}
          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
          placeholder="Ex: P001"
          className="h-12"
        />
      </div>
      <div>
        <Label>Nome *</Label>
        <Input
          value={formData.nome}
          onChange={(e) => {
            setFormData({ ...formData, nome: e.target.value });
            clearTimeout(window.detectModelosTimeout);
            window.detectModelosTimeout = setTimeout(atualizarModelosDetectados, 800);
          }}
          placeholder="Nome do produto ou serviço"
          className="h-12"
        />
      </div>
      <div>
        <Label>Categoria *</Label>
        <Select
          value={formData.categoria}
          onValueChange={(value) => setFormData({ ...formData, categoria: value })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Unidade</Label>
        <Select
          value={formData.unidade || 'unidade'}
          onValueChange={(value) => setFormData({ ...formData, unidade: value })}
        >
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unidade">Unidade</SelectItem>
            <SelectItem value="par">Par</SelectItem>
            <SelectItem value="jogo">Jogo</SelectItem>
            <SelectItem value="kit">Kit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Valor *</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.valor}
          onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
          placeholder="0.00"
          className="h-12"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          value={formData.descricao}
          onChange={(e) => {
            setFormData({ ...formData, descricao: e.target.value });
            clearTimeout(window.detectModelosTimeout);
            window.detectModelosTimeout = setTimeout(atualizarModelosDetectados, 800);
          }}
          placeholder="Observações sobre o produto..."
          className="min-h-[60px]"
        />
      </div>

      {/* Localização e Fornecedores */}
      <div>
        <Label>Localização no Estoque</Label>
        <Input
          value={formData.localizacao_estoque}
          onChange={(e) => setFormData({ ...formData, localizacao_estoque: e.target.value })}
          placeholder="Ex: Prateleira A3, Gaveta 5"
          className="h-10"
        />
      </div>

      {/* Fornecedores */}
      <div className="space-y-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">Fornecedores</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={adicionarFornecedor}
          >
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>
        {formData.fornecedores?.length > 0 ? (
          <div className="space-y-2">
            {formData.fornecedores.map((forn, idx) => (
              <div key={idx} className="bg-white border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={forn.principal}
                      onCheckedChange={(checked) => setPrincipal(idx, checked)}
                    />
                    <span className="text-xs text-slate-600">Principal</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removerFornecedor(idx)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Fornecedor</Label>
                    <Select
                      value={forn.fornecedor_id || ''}
                      onValueChange={(value) => {
                        const fornSelecionado = fornecedores.find(f => f.id === value);
                        if (fornSelecionado) {
                          atualizarFornecedor(idx, 'fornecedor_id', value);
                          atualizarFornecedor(idx, 'fornecedor_nome', fornSelecionado.nome);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione ou digite" />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={forn.fornecedor_nome}
                      onChange={(e) => atualizarFornecedor(idx, 'fornecedor_nome', e.target.value)}
                      placeholder="Ou digite o nome"
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Código do Fornecedor</Label>
                    <Input
                      value={forn.codigo_fornecedor}
                      onChange={(e) => atualizarFornecedor(idx, 'codigo_fornecedor', e.target.value)}
                      placeholder="Cód. no catálogo"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Preço de Compra</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={forn.preco_compra || ''}
                    onChange={(e) => atualizarFornecedor(idx, 'preco_compra', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-2">Nenhum fornecedor adicionado</p>
        )}
      </div>

      <div>
        <Label className="flex items-center justify-between">
          <span>Vantagens de Fazer</span>
          <span className="text-xs text-slate-500">
            {formData.vantagens?.length || 0}/500
          </span>
        </Label>
        <Textarea
          value={formData.vantagens}
          onChange={(e) => {
            const value = e.target.value.substring(0, 500);
            setFormData({ ...formData, vantagens: value });
          }}
          placeholder="Benefícios de realizar o serviço..."
          className="min-h-[60px]"
          maxLength={500}
        />
        <p className="text-xs text-slate-500 mt-1">
          Máximo 500 caracteres
        </p>
      </div>
      <div>
        <Label className="flex items-center justify-between">
          <span>Desvantagens de Não Fazer</span>
          <span className="text-xs text-slate-500">
            {formData.desvantagens?.length || 0}/500
          </span>
        </Label>
        <Textarea
          value={formData.desvantagens}
          onChange={(e) => {
            const value = e.target.value.substring(0, 500);
            setFormData({ ...formData, desvantagens: value });
          }}
          placeholder="Riscos de não realizar o serviço..."
          className="min-h-[60px]"
          maxLength={500}
        />
        <p className="text-xs text-slate-500 mt-1">
          Máximo 500 caracteres
        </p>
      </div>

      {/* Estoque */}
      <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3">
          <Checkbox
            id="controla-estoque"
            checked={formData.controla_estoque}
            onCheckedChange={(checked) => setFormData({ ...formData, controla_estoque: checked })}
          />
          <label htmlFor="controla-estoque" className="font-medium cursor-pointer text-sm">
            Controlar estoque físico
          </label>
        </div>
        {formData.controla_estoque && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estoque Atual</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.estoque_atual}
                  onChange={(e) => setFormData({ ...formData, estoque_atual: parseFloat(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>
              <div>
                <Label>Estoque Mínimo <span className="text-xs text-slate-400">(alerta de baixo)</span></Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.estoque_minimo}
                  onChange={(e) => setFormData({ ...formData, estoque_minimo: parseFloat(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>
            </div>
            <div>
              <Label>Estoque Desejado <span className="text-xs text-slate-400">(qtd ideal para manter)</span></Label>
              <Input
                type="number"
                min="0"
                value={formData.estoque_desejado}
                onChange={(e) => setFormData({ ...formData, estoque_desejado: parseFloat(e.target.value) || 0 })}
                className="h-10"
                placeholder="0"
              />
              <p className="text-xs text-slate-400 mt-1">
                Ao gerar lista de compras, a quantidade sugerida será: estoque desejado − estoque atual
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4 bg-slate-100 rounded-lg border">
        <div className="flex items-center gap-3">
          <Checkbox
            id="aplicacao-universal"
            checked={formData.aplicacao_universal}
            onCheckedChange={(checked) => setFormData({ 
              ...formData, 
              aplicacao_universal: checked,
              modelos_compativeis: checked ? [] : formData.modelos_compativeis
            })}
          />
          <label htmlFor="aplicacao-universal" className="font-medium cursor-pointer text-sm">
            ✓ Aplicação Universal (serve para todos os veículos)
          </label>
        </div>

        {!formData.aplicacao_universal && (
          <div>
            <Label>Modelos Compatíveis</Label>
            <Input
              value={Array.isArray(formData.modelos_compativeis) 
                ? formData.modelos_compativeis.join(', ')
                : formData.modelos_compativeis || ''
              }
              onChange={(e) => {
                const modelos = e.target.value.split(',').map(m => m.trim()).filter(Boolean);
                setFormData({ ...formData, modelos_compativeis: modelos });
              }}
              placeholder="Ex: Gol, Palio, Uno, Celta"
              className="h-10"
            />
            <p className="text-xs text-slate-500 mt-2">
              🤖 Modelos são detectados automaticamente ao digitar no nome/descrição. Você pode adicionar ou remover modelos manualmente separando por vírgula.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}