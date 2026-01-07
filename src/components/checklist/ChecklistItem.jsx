import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, HelpCircle, ShoppingCart, Plus, Package, Trash2, ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const STATUS_CONFIG = {
  ok: { icon: CheckCircle2, color: 'bg-green-500 hover:bg-green-600', textColor: 'text-green-600' },
  com_defeito: { icon: XCircle, color: 'bg-red-500 hover:bg-red-600', textColor: 'text-red-600' },
  nao_possui: { icon: MinusCircle, color: 'bg-gray-400 hover:bg-gray-500', textColor: 'text-gray-500' },
  nao_verificado: { icon: HelpCircle, color: 'bg-yellow-500 hover:bg-yellow-600', textColor: 'text-yellow-600' }
};

export default function ChecklistItem({ item, value, onChange, produtos = [], onOpenCadastro }) {
  const [showProdutos, setShowProdutos] = useState(false);
  const currentStatus = value?.status || 'nao_verificado';
  const produtosVinculados = value?.produtos || [];
  const StatusIcon = STATUS_CONFIG[currentStatus]?.icon || HelpCircle;

  const handleStatusChange = (newStatus) => {
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      status: newStatus
    });
  };

  const handleCommentChange = (e) => {
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      comentario: e.target.value
    });
  };

  const handleOrcamentoChange = (checked) => {
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      incluir_orcamento: checked
    });
  };

  const handleAddProduto = (produtoId) => {
    const novoProduto = { id: produtoId, quantidade: 1 };
    const novosProdutos = [...produtosVinculados, novoProduto];
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      produtos: novosProdutos
    });
  };

  const handleRemoveProduto = (index) => {
    const novosProdutos = produtosVinculados.filter((_, i) => i !== index);
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      produtos: novosProdutos
    });
  };

  const handleProdutoQuantidade = (index, quantidade) => {
    const novosProdutos = [...produtosVinculados];
    novosProdutos[index] = { ...novosProdutos[index], quantidade: parseInt(quantidade) || 1 };
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      produtos: novosProdutos
    });
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all",
      currentStatus === 'com_defeito' ? 'border-red-200 bg-red-50/50' : 
      currentStatus === 'ok' ? 'border-green-200 bg-green-50/50' : 
      'border-slate-200 bg-white'
    )}>
      <div className="flex items-start gap-3">
        <StatusIcon className={cn("w-6 h-6 mt-1 flex-shrink-0", STATUS_CONFIG[currentStatus]?.textColor)} />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800 text-base mb-3">{item.item}</h4>
          
          {/* Status Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'ok' ? 'default' : 'outline'}
              className={cn(
                "h-10 px-4 text-sm font-medium",
                currentStatus === 'ok' && 'bg-green-500 hover:bg-green-600'
              )}
              onClick={() => handleStatusChange('ok')}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              OK
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'com_defeito' ? 'default' : 'outline'}
              className={cn(
                "h-10 px-4 text-sm font-medium",
                currentStatus === 'com_defeito' && 'bg-red-500 hover:bg-red-600'
              )}
              onClick={() => handleStatusChange('com_defeito')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Defeito
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'nao_possui' ? 'default' : 'outline'}
              className={cn(
                "h-10 px-4 text-sm font-medium",
                currentStatus === 'nao_possui' && 'bg-gray-400 hover:bg-gray-500'
              )}
              onClick={() => handleStatusChange('nao_possui')}
            >
              <MinusCircle className="w-4 h-4 mr-1" />
              Não Possui
            </Button>
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Observações do técnico..."
            value={value?.comentario || ''}
            onChange={handleCommentChange}
            className="min-h-[60px] text-base resize-none mb-2"
          />

          {/* Include in budget */}
          {currentStatus === 'com_defeito' && (
            <>
              <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                <Checkbox
                  id={`orcamento-${item.id}`}
                  checked={value?.incluir_orcamento || false}
                  onCheckedChange={handleOrcamentoChange}
                />
                <label 
                  htmlFor={`orcamento-${item.id}`}
                  className="text-sm font-medium text-orange-700 cursor-pointer flex items-center gap-1"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Incluir no orçamento
                </label>
              </div>

              {/* Products Section */}
              <Collapsible open={showProdutos} onOpenChange={setShowProdutos} className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" type="button">
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Produtos/Serviços ({produtosVinculados.length})
                    </span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showProdutos && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  {produtosVinculados.map((pv, idx) => {
                    const produto = produtos.find(p => p.id === pv.id);
                    if (!produto) return null;
                    return (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-white rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{produto.nome}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="number"
                              min="1"
                              value={pv.quantidade}
                              onChange={(e) => handleProdutoQuantidade(idx, e.target.value)}
                              className="w-16 h-8 px-2 border rounded text-sm"
                            />
                            <span className="text-xs text-slate-500">× R$ {produto.valor?.toFixed(2)}</span>
                            <span className="text-sm font-semibold text-green-600 ml-auto">
                              R$ {(produto.valor * pv.quantidade).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => handleRemoveProduto(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                  
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddProduto(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="flex-1 h-10 px-3 border rounded-lg text-sm"
                    >
                      <option value="">Selecionar produto existente...</option>
                      {produtos
                        .filter(p => !produtosVinculados.some(pv => pv.id === p.id))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={onOpenCadastro}
                      className="whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Novo
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </div>
    </div>
  );
}