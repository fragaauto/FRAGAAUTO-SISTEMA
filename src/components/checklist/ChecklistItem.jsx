import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, MinusCircle, HelpCircle, ShoppingCart, Plus, Package, Trash2, ChevronDown, Search } from 'lucide-react';
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
  const [searchProduto, setSearchProduto] = useState('');
  const currentStatus = value?.status || 'nao_verificado';
  const produtosVinculados = value?.produtos || [];
  const StatusIcon = STATUS_CONFIG[currentStatus]?.icon || HelpCircle;

  const handleStatusChange = (newStatus) => {
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      status: newStatus,
      incluir_orcamento: newStatus === 'com_defeito' ? true : (value?.incluir_orcamento || false)
    });
  };

  const handleCommentChange = (e) => {
    const novoComentario = e.target.value;
    
    // Atualizar o comentário E propagar para as observações de todos os produtos
    const produtosAtualizados = (value?.produtos || []).map(pv => ({
      ...pv,
      observacao: novoComentario
    }));
    
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      comentario: novoComentario,
      produtos: produtosAtualizados
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
    const produto = produtos.find(p => p.id === produtoId);
    const valorInicial = produto ? Number(produto.valor) || 0 : 0;
    const novoProduto = { 
      id: produtoId, 
      quantidade: 1,
      valor_customizado: valorInicial,
      observacao: ''
    };
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
    const qtd = quantidade === '' ? '' : Math.max(1, parseInt(quantidade) || 1);
    novosProdutos[index] = { 
      ...novosProdutos[index], 
      quantidade: qtd 
    };
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      produtos: novosProdutos
    });
  };

  const handleProdutoValor = (index, valor) => {
    const novosProdutos = [...produtosVinculados];
    const valorNum = parseFloat(valor) || 0;
    novosProdutos[index] = { 
      ...novosProdutos[index], 
      valor_customizado: valorNum 
    };
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      produtos: novosProdutos
    });
  };

  const handleProdutoObservacao = (index, observacao) => {
    const novosProdutos = [...produtosVinculados];
    novosProdutos[index] = { ...novosProdutos[index], observacao };
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
                    
                    // CRÍTICO: FONTE ÚNICA DA VERDADE - valor salvo tem prioridade ABSOLUTA
                    // Se valor_customizado existe (mesmo que seja 0), usar ele
                    // Se não existe, é um item NOVO sendo adicionado agora, aí sim usar valor do cadastro
                    const isItemSalvo = pv.valor_customizado !== undefined && pv.valor_customizado !== null;
                    const valorUnitario = isItemSalvo ? Number(pv.valor_customizado) : Number(produto.valor);
                    
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-3">
                            <p className="font-medium text-sm">{produto.nome}</p>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-slate-600">Quantidade</Label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min="1"
                                  value={pv.quantidade}
                                  onChange={(e) => handleProdutoQuantidade(idx, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={(e) => {
                                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                      handleProdutoQuantidade(idx, '1');
                                    }
                                  }}
                                  className="w-full h-9 px-2 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600">Valor Unit.</Label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={valorUnitario}
                                  onChange={(e) => handleProdutoValor(idx, parseFloat(e.target.value) || 0)}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full h-9 px-2 border rounded text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-slate-600">Observações do Item</Label>
                              <Textarea
                                placeholder="Observações específicas deste item..."
                                value={pv.observacao || ''}
                                onChange={(e) => handleProdutoObservacao(idx, e.target.value)}
                                className="min-h-[60px] text-sm resize-none"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-xs text-slate-500">
                                {pv.quantidade}x R$ {valorUnitario?.toFixed(2)}
                              </span>
                              <span className="text-sm font-semibold text-green-600">
                                Total: R$ {(valorUnitario * pv.quantidade).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => handleRemoveProduto(idx)}
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Buscar por nome ou código..."
                          value={searchProduto}
                          onChange={(e) => setSearchProduto(e.target.value)}
                          className="pl-9 h-10 text-sm"
                        />
                      </div>
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
                    
                    {searchProduto && (
                      <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white">
                        {produtos
                          .filter(p => !produtosVinculados.some(pv => pv.id === p.id))
                          .filter(p => {
                            const search = searchProduto.toLowerCase();
                            return p.nome?.toLowerCase().includes(search) ||
                                   p.codigo?.toLowerCase().includes(search);
                          })
                          .map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleAddProduto(p.id);
                                setSearchProduto('');
                              }}
                              className="w-full text-left p-2 hover:bg-slate-100 rounded text-sm flex items-center justify-between"
                            >
                              <span>
                                {p.codigo && <span className="text-slate-500">{p.codigo} - </span>}
                                {p.nome}
                              </span>
                              <span className="text-green-600 font-semibold text-xs">
                                R$ {p.valor?.toFixed(2)}
                              </span>
                            </button>
                          ))}
                        {produtos
                          .filter(p => !produtosVinculados.some(pv => pv.id === p.id))
                          .filter(p => {
                            const search = searchProduto.toLowerCase();
                            return p.nome?.toLowerCase().includes(search) ||
                                   p.codigo?.toLowerCase().includes(search);
                          }).length === 0 && (
                          <p className="text-center py-2 text-slate-500 text-sm">
                            Nenhum produto encontrado
                          </p>
                        )}
                      </div>
                    )}
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