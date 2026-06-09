import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, CheckSquare, ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function dataHoje() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function RotinaHojeCard() {
  const { user, unidadeAtual } = useUnidade();
  const hoje = new Date().getDay();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';
  const funcaoId = user?.funcao_id;

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas_rotina', unidadeAtual?.id],
    queryFn: () => base44.entities.TarefaRotina.list(),
    enabled: !!unidadeAtual,
    staleTime: 2 * 60 * 1000,
  });

  const { data: registros = [] } = useQuery({
    queryKey: ['registros_rotina', hoje, unidadeAtual?.id],
    queryFn: () => base44.entities.RegistroRotina.filter({ data_execucao: dataHoje() }),
    enabled: !!unidadeAtual,
    staleTime: 30 * 1000,
  });

  const marcarMutation = useMutation({
    mutationFn: async ({ tarefa, concluida }) => {
      if (concluida) {
        const reg = registros.find(
          r => r.tarefa_id === tarefa.id && r.funcionario_email === user.email && r.data_execucao === dataHoje()
        );
        if (reg) await base44.entities.RegistroRotina.delete(reg.id);
      } else {
        await base44.entities.RegistroRotina.create({
          tarefa_id: tarefa.id,
          tarefa_titulo: tarefa.titulo,
          funcao_id: tarefa.funcao_id,
          funcao_nome: tarefa.funcao_nome,
          unidade_id: unidadeAtual?.id,
          funcionario_email: user.email,
          funcionario_nome: user.full_name,
          data_execucao: dataHoje(),
          dia_semana: hoje,
          concluida_em: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registros_rotina'] }),
  });

  const isConcluida = (tarefaId) =>
    registros.some(r => r.tarefa_id === tarefaId && r.funcionario_email === user?.email && r.data_execucao === dataHoje());

  const tarefasDoDia = tarefas
    .filter(t => {
      if (!t.ativa) return false;
      const mesmaUnidade = !t.unidade_id || t.unidade_id === unidadeAtual?.id;
      if (!mesmaUnidade) return false;
      if (!isAdmin && t.funcao_id !== funcaoId) return false;
      return (t.dias_semana || []).includes(hoje);
    })
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  // Não mostrar se não há tarefas ou usuário sem função
  if (!user || (!isAdmin && !funcaoId) || tarefasDoDia.length === 0) return null;

  const concluidas = tarefasDoDia.filter(t => isConcluida(t.id)).length;
  const total = tarefasDoDia.length;
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
      <Card className="border border-orange-200 bg-orange-50/40">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-bold text-slate-800">Rotina do Dia</h2>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                {concluidas}/{total}
              </Badge>
            </div>
            <Link
              to={createPageUrl('RotinaDiaria')}
              className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:underline"
            >
              Ver tudo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Barra de progresso */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>

          {/* Lista de tarefas */}
          <div className="space-y-2">
            {tarefasDoDia.map(t => {
              const concluida = isConcluida(t.id);
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border transition-all',
                    concluida
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-slate-200'
                  )}
                >
                  <button
                    onClick={() => marcarMutation.mutate({ tarefa: t, concluida })}
                    disabled={marcarMutation.isPending}
                    className="mt-0.5 shrink-0 transition-transform active:scale-90"
                  >
                    {concluida ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-orange-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      concluida ? 'text-slate-400 line-through' : 'text-slate-800'
                    )}>
                      {t.titulo}
                    </p>
                    {t.links?.length > 0 && !concluida && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {t.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs border border-blue-200 hover:bg-blue-100"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {link.label || 'Abrir'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {concluida && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs shrink-0">Feita</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}