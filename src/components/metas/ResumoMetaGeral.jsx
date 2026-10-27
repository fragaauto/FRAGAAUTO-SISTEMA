import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { TrendingUp, Target } from 'lucide-react';
import BarraMeta from './BarraMeta';

const formatar = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ResumoMetaGeral({ metas = [], faturado = 0 }) {
  const metasComValor = metas.filter((m) => m.ativa !== false && Number(m.meta_mes) > 0);
  const metaTotal = metasComValor.reduce((soma, m) => soma + Number(m.meta_mes), 0);
  const percentual = metaTotal > 0 ? (faturado / metaTotal) * 100 : 0;
  const falta = Math.max(metaTotal - faturado, 0);

  if (metasComValor.length === 0) {
    return (
      <Card className="border border-dashed border-slate-300">
        <CardContent className="p-6 text-center">
          <Target className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-600">Nenhuma meta geral cadastrada.</p>
          <Link to={createPageUrl('Configuracoes')} className="text-xs font-medium text-blue-600 hover:underline">
            Cadastrar metas em Configurações
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
              <TrendingUp className="h-4 w-4" />
              Meta geral da loja — mês
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-800">{percentual.toFixed(0)}%</p>
            <p className="text-sm text-slate-600">
              R$ {formatar(faturado)} de R$ {formatar(metaTotal)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            {percentual >= 100 ? (
              <span className="text-sm font-bold text-green-600">Meta batida! 🎉</span>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wide text-slate-500">Falta para a meta</p>
                <p className="text-xl font-bold text-blue-700">R$ {formatar(falta)}</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 w-full h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              percentual >= 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentual, 100)}%` }}
          />
        </div>

        <div className="mt-5 space-y-3">
          {metasComValor.map((meta) => (
            <div key={meta.id}>
              <p className="mb-1 text-xs font-semibold text-slate-700">{meta.nome}</p>
              <BarraMeta label="Este mês" atual={faturado} meta={Number(meta.meta_mes)} cor="bg-emerald-500" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}