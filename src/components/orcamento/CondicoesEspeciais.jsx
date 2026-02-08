import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Percent, CreditCard, CheckCircle } from 'lucide-react';

export default function CondicoesEspeciais({ valorTotal, condicoesEspeciais }) {
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
            
            <div className="space-y-3">
              {proximasCondicoes.map((condicao, idx) => {
                const faltam = condicao.valor_minimo - valorTotal;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-amber-200"
                  >
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}