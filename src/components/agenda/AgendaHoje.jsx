import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Calendar, Clock, User, Car, ArrowRight } from 'lucide-react';
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS = {
  agendado: 'bg-blue-100 text-blue-700',
  confirmado: 'bg-green-100 text-green-700',
  em_andamento: 'bg-orange-100 text-orange-700',
  concluido: 'bg-slate-100 text-slate-600',
  cancelado: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function AgendamentoCard({ ag }) {
  const hora = ag.data_hora ? format(new Date(ag.data_hora), 'HH:mm') : '--:--';
  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all">
      <div className="text-center min-w-[44px] bg-orange-50 rounded-lg py-1.5 px-1">
        <p className="text-xs text-slate-500 leading-none">hrs</p>
        <p className="font-bold text-orange-600 text-sm">{hora}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{ag.titulo}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {ag.cliente_nome && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <User className="w-3 h-3" /> {ag.cliente_nome}
            </span>
          )}
          {ag.placa && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Car className="w-3 h-3" /> {ag.placa}{ag.modelo ? ` · ${ag.modelo}` : ''}
            </span>
          )}
          {ag.tecnico && (
            <span className="text-xs text-slate-400">Téc: {ag.tecnico}</span>
          )}
        </div>
      </div>
      <Badge className={`text-xs flex-shrink-0 ${STATUS_COLORS[ag.status] || STATUS_COLORS.agendado}`}>
        {STATUS_LABELS[ag.status] || ag.status}
      </Badge>
    </div>
  );
}

export default function AgendaHoje({ compact = false }) {
  const hoje = new Date();
  const amanha = addDays(hoje, 1);

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => base44.entities.Agendamento.list('data_hora'),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Real-time subscription
  React.useEffect(() => {
    const unsub = base44.entities.Agendamento.subscribe(() => {});
    return unsub;
  }, []);

  const agHoje = agendamentos.filter(a => {
    if (!a.data_hora || a.status === 'cancelado') return false;
    const d = new Date(a.data_hora);
    return d >= startOfDay(hoje) && d <= endOfDay(hoje);
  }).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  const agAmanha = agendamentos.filter(a => {
    if (!a.data_hora || a.status === 'cancelado') return false;
    const d = new Date(a.data_hora);
    return d >= startOfDay(amanha) && d <= endOfDay(amanha);
  }).sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
          <Calendar className="w-5 h-5 text-orange-500" />
          Agenda
        </CardTitle>
        <Link to={createPageUrl('Agenda')} className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium">
          Ver tudo <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hoje */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hoje · {format(hoje, "dd 'de' MMMM", { locale: ptBR })}
            </p>
            <Badge variant="outline" className="text-xs">{agHoje.length}</Badge>
          </div>
          {agHoje.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-lg">Nenhum serviço hoje</p>
          ) : (
            <div className="space-y-2">
              {agHoje.map(ag => <AgendamentoCard key={ag.id} ag={ag} />)}
            </div>
          )}
        </div>

        {/* Amanhã */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Amanhã · {format(amanha, "dd 'de' MMMM", { locale: ptBR })}
            </p>
            <Badge variant="outline" className="text-xs">{agAmanha.length}</Badge>
          </div>
          {agAmanha.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-lg">Nenhum serviço amanhã</p>
          ) : (
            <div className="space-y-2">
              {agAmanha.map(ag => <AgendamentoCard key={ag.id} ag={ag} />)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}