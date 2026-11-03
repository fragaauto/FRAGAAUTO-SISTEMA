import React from 'react';
import { Input } from '@/components/ui/input';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIAS = [
  { idx: 1, label: 'Seg' },
  { idx: 2, label: 'Ter' },
  { idx: 3, label: 'Qua' },
  { idx: 4, label: 'Qui' },
  { idx: 5, label: 'Sex' },
  { idx: 6, label: 'Sáb' },
  { idx: 0, label: 'Dom' },
];

export default function ConfigLembreteRotina({ form, setForm }) {
  const diasLembrete = form.lembrete_dias || [];

  const toggleDia = (idx) => {
    setForm(prev => ({
      ...prev,
      lembrete_dias: (prev.lembrete_dias || []).includes(idx)
        ? prev.lembrete_dias.filter(d => d !== idx)
        : [...(prev.lembrete_dias || []), idx],
    }));
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/60">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!form.lembrete_ativo}
          onChange={e => setForm(p => ({ ...p, lembrete_ativo: e.target.checked }))}
          className="w-4 h-4 accent-orange-500"
        />
        <Bell className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-medium text-slate-700">Exibir lembrete e enviar notificação</span>
      </label>

      {form.lembrete_ativo && (
        <>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Mensagem do popup *</label>
            <textarea
              className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-white"
              rows={2}
              value={form.lembrete_mensagem || ''}
              onChange={e => setForm(p => ({ ...p, lembrete_mensagem: e.target.value }))}
              placeholder="Ex: Conferir o fechamento do caixa antes de sair"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Quando aparece</label>
            <div className="flex gap-2">
              {[
                { valor: 'unico', label: 'Uma vez (data)' },
                { valor: 'recorrente', label: 'Repetir na semana' },
              ].map(opt => (
                <button
                  key={opt.valor}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, lembrete_tipo: opt.valor }))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    form.lembrete_tipo === opt.valor
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-orange-400'
                  )}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {form.lembrete_tipo === 'unico' ? (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data *</label>
              <Input
                type="date"
                value={form.lembrete_data || ''}
                onChange={e => setForm(p => ({ ...p, lembrete_data: e.target.value }))}
                className="bg-white"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-2 block">Dias *</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS.map(d => (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => toggleDia(d.idx)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      diasLembrete.includes(d.idx)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-orange-400'
                    )}
                  >{d.label}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Horário *</label>
            <Input
              type="time"
              value={form.lembrete_horario || ''}
              onChange={e => setForm(p => ({ ...p, lembrete_horario: e.target.value }))}
              className="bg-white w-32"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              O popup aparece a partir desse horário para todos os usuários logados, e uma notificação push é enviada aos celulares com o aplicativo instalado. Se o usuário clicar em "Entendi", o lembrete volta a cada 30 minutos até que a tarefa seja marcada como concluída.
            </p>
          </div>
        </>
      )}
    </div>
  );
}