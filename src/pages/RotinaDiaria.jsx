import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckSquare, Calendar, AlertCircle, CheckCircle2, Circle, Users, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function dataHoje() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function RotinaDiaria() {
  const { user, unidadeAtual } = useUnidade();
  const hoje = new Date().getDay();
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [abaAdmin, setAbaAdmin] = useState('execucao'); // 'execucao' | 'acompanhamento'
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';
  const funcaoId = user?.funcao_id;

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.FuncaoFuncionario.list(),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios_rotina'],
    queryFn: () => base44.entities.Funcionario.list(),
    enabled: isAdmin,
  });

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas_rotina', unidadeAtual?.id],
    queryFn: () => base44.entities.TarefaRotina.list(),
    enabled: !!unidadeAtual,
  });

  // Registros de hoje (para funcionário) ou do dia selecionado (para admin)
  const dataFiltro = abaAdmin === 'acompanhamento' ? dataHoje() : dataHoje();
  const { data: registros = [] } = useQuery({
    queryKey: ['registros_rotina', diaSelecionado, unidadeAtual?.id],
    queryFn: () => base44.entities.RegistroRotina.filter({ data_execucao: dataHoje() }),
    enabled: !!unidadeAtual,
  });

  const marcarMutation = useMutation({
    mutationFn: async ({ tarefa, concluida }) => {
      if (concluida) {
        // Desmarcar: deletar o registro
        const reg = registros.find(
          r => r.tarefa_id === tarefa.id &&
               r.funcionario_email === user.email &&
               r.data_execucao === dataHoje()
        );
        if (reg) await base44.entities.RegistroRotina.delete(reg.id);
      } else {
        // Marcar como feita
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

  const funcaoUser = funcoes.find(f => f.id === funcaoId);

  const tarefasFiltradas = tarefas.filter(t => {
    if (!t.ativa) return false;
    const mesmaUnidade = !t.unidade_id || t.unidade_id === unidadeAtual?.id;
    if (!mesmaUnidade) return false;
    if (isAdmin) return true;
    return t.funcao_id === funcaoId;
  });

  const tarefasDoDia = tarefasFiltradas
    .filter(t => (t.dias_semana || []).includes(diaSelecionado))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  // Verifica se uma tarefa foi concluída pelo usuário atual hoje
  const isConcluida = (tarefaId) =>
    registros.some(r => r.tarefa_id === tarefaId && r.funcionario_email === user?.email && r.data_execucao === dataHoje());

  const getRegistro = (tarefaId, email) =>
    registros.find(r => r.tarefa_id === tarefaId && r.funcionario_email === email && r.data_execucao === dataHoje());

  // Para visão admin: agrupa tarefas por função
  const tarefasPorFuncao = {};
  tarefasDoDia.forEach(t => {
    const key = t.funcao_id || 'sem_funcao';
    if (!tarefasPorFuncao[key]) {
      tarefasPorFuncao[key] = { nome: t.funcao_nome || 'Sem função', tarefas: [] };
    }
    tarefasPorFuncao[key].tarefas.push(t);
  });

  // Para acompanhamento admin: funcionários com tarefas do dia
  const funcionarioComTarefas = funcionarios.filter(f => {
    const funcao = funcoes.find(fn => fn.id === f.funcao_id);
    return tarefasDoDia.some(t => t.funcao_id === f.funcao_id);
  });

  if (!isAdmin && !funcaoId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Função não atribuída</p>
            <p className="text-sm">Você ainda não possui uma função cadastrada. Fale com o administrador.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalHoje = tarefasDoDia.length;
  const concluidasHoje = tarefasDoDia.filter(t => isConcluida(t.id)).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-orange-500" />
          Rotina Diária
        </h1>
        {!isAdmin && funcaoUser && (
          <p className="text-slate-500 text-sm mt-1">
            Função: <span className="font-semibold text-slate-700">{funcaoUser.nome}</span>
          </p>
        )}
        {isAdmin && (
          <p className="text-slate-500 text-sm mt-1">Visão administrativa</p>
        )}
      </div>

      {/* Abas admin */}
      {isAdmin && (
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setAbaAdmin('execucao')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
              abaAdmin === 'execucao'
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            )}
          >
            <CheckSquare className="w-4 h-4" /> Minhas Tarefas
          </button>
          <button
            onClick={() => setAbaAdmin('acompanhamento')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
              abaAdmin === 'acompanhamento'
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            )}
          >
            <Users className="w-4 h-4" /> Acompanhamento da Equipe
          </button>
        </div>
      )}

      {/* Seletor de dias */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {DIAS.map((dia, idx) => (
          <button
            key={idx}
            onClick={() => setDiaSelecionado(idx)}
            className={cn(
              'flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium transition-all shrink-0 min-w-[52px]',
              idx === hoje
                ? diaSelecionado === idx
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                  : 'bg-orange-50 text-orange-600 border-orange-300'
                : diaSelecionado === idx
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            )}
          >
            <span className="text-[10px] mb-0.5">{dia}</span>
            {idx === hoje && (
              <span className={cn(
                'text-[9px] font-bold',
                diaSelecionado === idx ? 'text-orange-100' : 'text-orange-500'
              )}>HOJE</span>
            )}
          </button>
        ))}
      </div>

      {/* Título do dia + progresso */}
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-700">{DIAS_FULL[diaSelecionado]}</h2>
          <Badge variant="outline" className="text-xs">{tarefasDoDia.length} tarefa{tarefasDoDia.length !== 1 ? 's' : ''}</Badge>
        </div>
        {diaSelecionado === hoje && !isAdmin && totalHoje > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{concluidasHoje}/{totalHoje} concluídas</span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(concluidasHoje / totalHoje) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : tarefasDoDia.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhuma tarefa para {DIAS_FULL[diaSelecionado]}</p>
        </div>
      ) : abaAdmin === 'acompanhamento' && isAdmin ? (
        // ---- VISÃO ACOMPANHAMENTO ADMIN ----
        <div className="space-y-6">
          {funcionarioComTarefas.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Nenhum funcionário com tarefas neste dia.</p>
          ) : (
            funcionarioComTarefas.map(func => {
              const tarefasFunc = tarefasDoDia.filter(t => t.funcao_id === func.funcao_id);
              const concluidasFunc = tarefasFunc.filter(t => getRegistro(t.id, func.email));
              const pendentesFunc = tarefasFunc.filter(t => !getRegistro(t.id, func.email));
              return (
                <div key={func.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{func.nome}</p>
                      <p className="text-xs text-slate-500">{func.funcao_nome || funcoes.find(f => f.id === func.funcao_id)?.nome}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        'text-xs',
                        concluidasFunc.length === tarefasFunc.length
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : concluidasFunc.length > 0
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                      )}>
                        {concluidasFunc.length}/{tarefasFunc.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {tarefasFunc.map(tarefa => {
                      const reg = getRegistro(tarefa.id, func.email);
                      return (
                        <div key={tarefa.id} className="flex items-center gap-3 px-4 py-3">
                          {reg ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm',
                              reg ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'
                            )}>{tarefa.titulo}</p>
                            {reg && reg.concluida_em && (
                              <p className="text-xs text-green-600 mt-0.5">
                                ✓ Concluída às {format(new Date(reg.concluida_em), 'HH:mm', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                          {!reg && (
                            <Badge variant="outline" className="text-xs text-red-500 border-red-200 bg-red-50 shrink-0">
                              Pendente
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : isAdmin ? (
        // ---- ADMIN EXECUÇÃO: agrupa por função ----
        <div className="space-y-6">
          {Object.entries(tarefasPorFuncao).map(([fId, grupo]) => (
            <div key={fId}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {grupo.nome}
                </span>
              </div>
              <div className="space-y-3">
                {grupo.tarefas.map(t => (
                  <TarefaCard
                    key={t.id}
                    tarefa={t}
                    concluida={isConcluida(t.id)}
                    registro={getRegistro(t.id, user?.email)}
                    onToggle={() => marcarMutation.mutate({ tarefa: t, concluida: isConcluida(t.id) })}
                    loading={marcarMutation.isPending}
                    isDiaHoje={diaSelecionado === hoje}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // ---- FUNCIONÁRIO ----
        <div className="space-y-3">
          {tarefasDoDia.map(t => (
            <TarefaCard
              key={t.id}
              tarefa={t}
              concluida={isConcluida(t.id)}
              registro={getRegistro(t.id, user?.email)}
              onToggle={() => marcarMutation.mutate({ tarefa: t, concluida: isConcluida(t.id) })}
              loading={marcarMutation.isPending}
              isDiaHoje={diaSelecionado === hoje}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TarefaCard({ tarefa, concluida, registro, onToggle, loading, isDiaHoje }) {
  return (
    <Card className={cn(
      'border transition-all',
      concluida ? 'border-green-200 bg-green-50' : 'border-slate-200 hover:border-orange-300 hover:shadow-sm'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Botão de marcar */}
          {isDiaHoje && (
            <button
              onClick={onToggle}
              disabled={loading}
              className="mt-0.5 shrink-0 transition-transform active:scale-90"
              title={concluida ? 'Desmarcar tarefa' : 'Marcar como concluída'}
            >
              {concluida ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 hover:text-orange-400" />
              )}
            </button>
          )}

          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-semibold text-sm',
              concluida ? 'text-slate-400 line-through' : 'text-slate-800'
            )}>
              {tarefa.titulo}
            </h3>
            {tarefa.descricao && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tarefa.descricao}</p>
            )}
            {concluida && registro?.concluida_em && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                ✓ Concluída em {format(new Date(registro.concluida_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>

          {concluida && (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs shrink-0">Feita</Badge>
          )}
        </div>

        {/* Links */}
        {tarefa.links?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tarefa.links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium border border-blue-200 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {link.label || 'Abrir link'}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}