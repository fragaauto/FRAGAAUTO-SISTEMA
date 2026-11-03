import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { chaveData, lembretesPendentes, marcarVisto } from '@/lib/lembretesRotina';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function LembreteRotinaPopup() {
  const { user, unidadeAtual } = useUnidade();
  const queryClient = useQueryClient();
  const [agora, setAgora] = useState(new Date());
  const [ignorados, setIgnorados] = useState([]);
  const [concluindo, setConcluindo] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const { data: tarefas = [] } = useQuery({
    queryKey: ['lembretes_rotina'],
    queryFn: () => base44.entities.TarefaRotina.filter({ lembrete_ativo: true }),
    refetchInterval: 60000,
    enabled: !!user,
  });

  const pendentes = useMemo(() => {
    const daUnidade = tarefas.filter(t => !t.unidade_id || t.unidade_id === unidadeAtual?.id);
    return lembretesPendentes(daUnidade, agora);
  }, [tarefas, agora, unidadeAtual?.id]);

  const atual = pendentes.find(p => !ignorados.includes(p.chave));

  const fechar = () => {
    if (!atual) return;
    marcarVisto(atual.chave);
    setIgnorados(prev => [...prev, atual.chave]);
  };

  const concluirTarefa = async () => {
    if (!atual) return;
    const tarefa = atual.tarefa;
    setConcluindo(true);
    try {
      const hoje = new Date();
      await base44.entities.RegistroRotina.create({
        tarefa_id: tarefa.id,
        tarefa_titulo: tarefa.titulo,
        funcao_id: tarefa.funcao_id,
        funcao_nome: tarefa.funcao_nome,
        unidade_id: unidadeAtual?.id || tarefa.unidade_id,
        funcionario_email: user?.email,
        funcionario_nome: user?.full_name,
        data_execucao: chaveData(hoje),
        dia_semana: hoje.getDay(),
        concluida_em: hoje.toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['registros_rotina'] });
      toast.success('Tarefa marcada como concluída!');
      fechar();
    } catch {
      toast.error('Não foi possível marcar a tarefa');
    } finally {
      setConcluindo(false);
    }
  };

  if (!atual) return null;

  const tarefa = atual.tarefa;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) fechar(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="bg-orange-500 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Lembrete</p>
            <p className="text-white font-bold text-base leading-tight truncate">{tarefa.titulo}</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{tarefa.lembrete_mensagem}</p>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {tarefa.lembrete_horario}
            {tarefa.funcao_nome && <span>· {tarefa.funcao_nome}</span>}
          </div>

          {tarefa.links?.length > 0 && (
            <div className="flex flex-wrap gap-2">
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

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={fechar}>
              Entendi
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={concluirTarefa}
              disabled={concluindo}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {concluindo ? 'Salvando...' : 'Concluir tarefa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}