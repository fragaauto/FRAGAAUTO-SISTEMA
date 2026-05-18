import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckSquare, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export default function RotinaDiaria() {
  const { user, unidadeAtual } = useUnidade();
  const hoje = new Date().getDay(); // 0-6
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);

  // Busca a função do usuário
  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.FuncaoFuncionario.list(),
  });

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas_rotina', unidadeAtual?.id],
    queryFn: () => base44.entities.TarefaRotina.list(),
    enabled: !!unidadeAtual,
  });

  const isAdmin = user?.role === 'admin';
  const funcaoId = user?.funcao_id;
  const funcaoUser = funcoes.find(f => f.id === funcaoId);

  // Admin vê todas; funcionário vê apenas da sua função
  const tarefasFiltradas = tarefas.filter(t => {
    if (!t.ativa) return false;
    const mesmaUnidade = !t.unidade_id || t.unidade_id === unidadeAtual?.id;
    if (!mesmaUnidade) return false;
    if (isAdmin) return true;
    return t.funcao_id === funcaoId;
  });

  // Tarefas do dia selecionado
  const tarefasDoDia = tarefasFiltradas
    .filter(t => (t.dias_semana || []).includes(diaSelecionado))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  // Agrupa por função (para admin ver todas)
  const tarefasPorFuncao = {};
  tarefasDoDia.forEach(t => {
    const key = t.funcao_id || 'sem_funcao';
    if (!tarefasPorFuncao[key]) {
      tarefasPorFuncao[key] = { nome: t.funcao_nome || 'Sem função', tarefas: [] };
    }
    tarefasPorFuncao[key].tarefas.push(t);
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

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
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
          <p className="text-slate-500 text-sm mt-1">Visão geral — todas as funções</p>
        )}
      </div>

      {/* Seletor de dias */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
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

      {/* Título do dia */}
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <h2 className="text-base font-semibold text-slate-700">{DIAS_FULL[diaSelecionado]}</h2>
        <Badge variant="outline" className="text-xs">{tarefasDoDia.length} tarefa{tarefasDoDia.length !== 1 ? 's' : ''}</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : tarefasDoDia.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhuma tarefa para {DIAS_FULL[diaSelecionado]}</p>
        </div>
      ) : isAdmin ? (
        // Admin: agrupa por função
        <div className="space-y-6">
          {Object.entries(tarefasPorFuncao).map(([funcaoId, grupo]) => (
            <div key={funcaoId}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded">{grupo.nome}</span>
              </div>
              <div className="space-y-3">
                {grupo.tarefas.map(t => <TarefaCard key={t.id} tarefa={t} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Funcionário: lista direta
        <div className="space-y-3">
          {tarefasDoDia.map(t => <TarefaCard key={t.id} tarefa={t} />)}
        </div>
      )}
    </div>
  );
}

function TarefaCard({ tarefa }) {
  return (
    <Card className="border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm">{tarefa.titulo}</h3>
            {tarefa.descricao && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tarefa.descricao}</p>
            )}
          </div>
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