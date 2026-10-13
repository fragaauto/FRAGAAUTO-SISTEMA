import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Target, ArrowRight } from 'lucide-react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const UNIDADE_AUTO_PORTAS_ID = '69ea76b72f920804f5d68eab';

function BarraMeta({ label, atual, meta, cor }) {
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
  const atingida = pct >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            R$ {atual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / R$ {meta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {atingida && <span className="text-xs font-bold text-green-600">✓ Atingida!</span>}
        </div>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${atingida ? 'bg-green-500' : cor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-0.5 text-right">
        <span className={`text-xs font-bold ${atingida ? 'text-green-600' : 'text-slate-500'}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function MetaItemCard({ meta, faturadoDia, faturadoSemana, faturadoMes }) {
  const temAlguma = meta.meta_dia > 0 || meta.meta_semana > 0 || meta.meta_mes > 0;
  if (!temAlguma) return null;

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
      <p className="text-sm font-bold text-slate-700">{meta.nome}</p>
      {meta.meta_dia > 0 && (
        <BarraMeta label="Hoje" atual={faturadoDia} meta={meta.meta_dia} cor="bg-blue-500" />
      )}
      {meta.meta_semana > 0 && (
        <BarraMeta label="Esta Semana" atual={faturadoSemana} meta={meta.meta_semana} cor="bg-violet-500" />
      )}
      {meta.meta_mes > 0 && (
        <BarraMeta label="Este Mês" atual={faturadoMes} meta={meta.meta_mes} cor="bg-emerald-500" />
      )}
    </div>
  );
}

export default function MetasCard() {
  const { unidadeAtual } = useUnidade();

  const { data: metas = [] } = useQuery({
    queryKey: ['metas_vendas', unidadeAtual?.id],
    queryFn: () => base44.entities.MetaVendas.filter({ unidade_id: unidadeAtual?.id }),
    staleTime: 5 * 60 * 1000,
    enabled: !!unidadeAtual,
  });

  // Faturamento via aggregate no servidor (evita truncagem do filter em 5000 registros)
  const { data: faturamento = { dia: 0, semana: 0, mes: 0 } } = useQuery({
    queryKey: ['faturamento-metas', unidadeAtual?.id],
    queryFn: async () => {
      const agora = new Date();
      const inicioDia = startOfDay(agora).toISOString();
      const fimDia = endOfDay(agora).toISOString();
      const inicioSemanaRaw = startOfWeek(agora, { weekStartsOn: 1 });
      const inicioMes = startOfMonth(agora);
      // Limita a semana aos dias dentro do mês corrente
      const inicioSemana = inicioSemanaRaw < inicioMes ? inicioMes : inicioSemanaRaw;
      const fimSemana = endOfWeek(agora, { weekStartsOn: 1 }).toISOString();
      const fimMes = endOfMonth(agora).toISOString();

      const buildQuery = (inicio, fim) => {
        const query = { tipo: 'entrada', estornado: false, data_lancamento: { $gte: inicio, $lte: fim } };
        if (unidadeAtual) {
          if (unidadeAtual.id === UNIDADE_AUTO_PORTAS_ID) {
            query.$or = [{ unidade_id: UNIDADE_AUTO_PORTAS_ID }, { unidade_id: null }, { unidade_id: "" }];
          } else {
            query.unidade_id = unidadeAtual.id;
          }
        }
        return query;
      };

      const [rDia, rSemana, rMes] = await Promise.all([
        base44.entities.LancamentoFinanceiro.aggregate({ query: buildQuery(inicioDia, fimDia), groupBy: 'tipo', sum: 'valor' }),
        base44.entities.LancamentoFinanceiro.aggregate({ query: buildQuery(inicioSemana.toISOString(), fimSemana), groupBy: 'tipo', sum: 'valor' }),
        base44.entities.LancamentoFinanceiro.aggregate({ query: buildQuery(inicioMes.toISOString(), fimMes), groupBy: 'tipo', sum: 'valor' }),
      ]);

      const extract = (r) => (r.rows?.[0]?.sum_valor) || 0;
      return { dia: extract(rDia), semana: extract(rSemana), mes: extract(rMes) };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!unidadeAtual,
  });

  const metasAtivas = metas.filter(m => m.ativa !== false);

  // Não exibe se não houver metas configuradas com valores
  const metasComValor = metasAtivas.filter(m => m.meta_dia > 0 || m.meta_semana > 0 || m.meta_mes > 0);
  if (metasComValor.length === 0) return null;

  const faturadoDia = faturamento.dia;
  const faturadoSemana = faturamento.semana;
  const faturadoMes = faturamento.mes;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
      <Card className="border border-blue-200 bg-blue-50/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Metas Gerais da Loja</h2>
            </div>
            <Link
              to={createPageUrl('Configuracoes')}
              className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
            >
              Configurar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {metasComValor.map(meta => (
              <MetaItemCard
                key={meta.id}
                meta={meta}
                faturadoDia={faturadoDia}
                faturadoSemana={faturadoSemana}
                faturadoMes={faturadoMes}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}