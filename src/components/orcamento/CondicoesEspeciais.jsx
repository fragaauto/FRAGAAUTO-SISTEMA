import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Percent, CreditCard, CheckCircle, ShoppingCart, Plus } from 'lucide-react';

export default function CondicoesEspeciais({ valorTotal, condicoesEspeciais, produtos = [] }) {
  const [produtosSugeridosExpandidos, setProdutosSugeridosExpandidos] = useState({});
  if (!condicoesEspeciais || condicoesEspeciais.length === 0) return null;

  const condicoesAtivas = condicoesEspeciais.filter(c => c.ativa).sort((a, b) => a.valor_minimo - b.valor_minimo);
  
  if (condicoesAtivas.length === 0) return null;

  const condicoesAplicaveis = condicoesAtivas.filter(c => valorTotal >= c.valor_minimo);
  const proximasCondicoes = condicoesAtivas.filter(c => valorTotal < c.valor_minimo);

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'brinde': return <Gift className="w-5 h-5" />;
      case 'desconto': return <Percent className="w-5 h-5" />;
      case 'parcelamento': return <CreditCard className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getColor = (tipo) => {
    switch (tipo) {
      case 'brinde': return 'bg-purple-500';
      case 'desconto': return 'bg-green-500';
      case 'parcelamento': return 'bg-blue-500';
      default: return 'bg-orange-500';
    }
  };

  return (
    <div className="space-y-4">
      {condicoesAplicaveis.length > 0 && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-bold text-green-800">
                🎉 Você ganhou condições especiais!
              </h3>
            </div>
            
            <div className="space-y-3">
              {condicoesAplicaveis.map((condicao, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-green-200"
                >
                  <div className={`${getColor(condicao.tipo)} rounded-full p-2 text-white`}>
                    {getIcon(condicao.tipo)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{condicao.descricao}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Válido para orçamentos acima de R$ {condicao.valor_minimo?.toFixed(2)}
                    </p>
                    {condicao.tipo === 'desconto' && condicao.valor_desconto_percentual && (
                      <Badge className="mt-2 bg-green-600">
                        {condicao.valor_desconto_percentual}% de desconto
                      </Badge>
                    )}
                    {condicao.tipo === 'parcelamento' && condicao.parcelas_sem_juros && (
                      <Badge className="mt-2 bg-blue-600">
                        {condicao.parcelas_sem_juros}x sem juros
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-sm text-green-700 mt-4 text-center font-medium">
              ✨ Entre em contato para aproveitar estas vantagens!
            </p>
          </CardContent>
        </Card>
      )}

      {proximasCondicoes.length > 0 && (
        <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-bold text-amber-800">
                🔥 Quase lá! Veja o que você pode ganhar:
              </h3>
            </div>
            
            <div className="space-y-4">
              {proximasCondicoes.map((condicao, idx) => {
                const faltam = condicao.valor_minimo - valorTotal;
                const produtosSugeridos = produtos
                  .filter(p => p.ativo && p.valor > 0 && p.valor <= faltam * 1.2 && p.valor >= faltam * 0.5)
                  .sort((a, b) => Math.abs(a.valor - faltam) - Math.abs(b.valor - faltam))
                  .slice(0, 3);

                const expandido = produtosSugeridosExpandidos[idx] || false;

                return (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-amber-200">
                      <div className={`${getColor(condicao.tipo)} rounded-full p-2 text-white opacity-70`}>
                        {getIcon(condicao.tipo)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{condicao.descricao}</p>
                        <p className="text-sm text-amber-700 mt-1 font-medium">
                          💰 Faltam apenas R$ {faltam.toFixed(2)} para você ganhar esta vantagem!
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Válido para orçamentos acima de R$ {condicao.valor_minimo?.toFixed(2)}
                        </p>
                        {condicao.tipo === 'desconto' && condicao.valor_desconto_percentual && (
                          <Badge className="mt-2 bg-amber-600">
                            {condicao.valor_desconto_percentual}% de desconto
                          </Badge>
                        )}
                        {condicao.tipo === 'parcelamento' && condicao.parcelas_sem_juros && (
                          <Badge className="mt-2 bg-amber-600">
                            {condicao.parcelas_sem_juros}x sem juros
                          </Badge>
                        )}
                      </div>
                    </div>

                    {produtosSugeridos.length > 0 && (
                      <div className="ml-4 pl-4 border-l-2 border-amber-300">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProdutosSugeridosExpandidos(prev => ({
                            ...prev,
                            [idx]: !prev[idx]
                          }))}
                          className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 mb-2"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {expandido ? 'Ocultar' : 'Ver'} produtos sugeridos para completar ({produtosSugeridos.length})
                        </Button>

                        {expandido && (
                          <div className="space-y-2">
                            {produtosSugeridos.map((produto, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-400 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-800">{produto.nome}</p>
                                    {produto.descricao && (
                                      <p className="text-xs text-slate-600 mt-1">{produto.descricao}</p>
                                    )}
                                    {produto.vantagens && (
                                      <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                                        <p className="text-xs font-medium text-green-800">✓ Vantagens:</p>
                                        <p className="text-xs text-green-700 mt-1">{produto.vantagens}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <Badge className="bg-orange-600">
                                      R$ {produto.valor.toFixed(2)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <p className="text-xs text-amber-700 text-center mt-2 italic">
                              Entre em contato para adicionar estes serviços ao seu orçamento
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}