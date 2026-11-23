import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Bell, Search } from 'lucide-react';
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

const DESTINATARIOS = [
  { valor: 'todos', label: 'Todos os usuários' },
  { valor: 'funcoes', label: 'Funções específicas' },
  { valor: 'usuarios', label: 'Usuários específicos' },
];

export default function ConfigLembreteRotina({ form, setForm }) {
  const diasLembrete = form.lembrete_dias || [];
  const tipoDestino = form.lembrete_destinatarios_tipo || 'todos';
  const [buscaUsuario, setBuscaUsuario] = useState('');

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.FuncaoFuncionario.list(),
    enabled: !!form.lembrete_ativo,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios_lembretes'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!form.lembrete_ativo && tipoDestino === 'usuarios',
  });

  const usuariosFiltrados = useMemo(() => {
    const termo = buscaUsuario.trim().toLowerCase();
    return (usuarios || [])
      .filter(u => u.email)
      .filter(u => !termo
        || String(u.full_name || '').toLowerCase().includes(termo)
        || String(u.email).toLowerCase().includes(termo))
      .sort((a, b) => String(a.full_name || a.email).localeCompare(String(b.full_name || b.email)));
  }, [usuarios, buscaUsuario]);

  const toggleDia = (idx) => {
    setForm(prev => ({
      ...prev,
      lembrete_dias: (prev.lembrete_dias || []).includes(idx)
        ? prev.lembrete_dias.filter(d => d !== idx)
        : [...(prev.lembrete_dias || []), idx],
    }));
  };

  const toggleFuncao = (id) => {
    setForm(prev => ({
      ...prev,
      lembrete_funcoes_ids: (prev.lembrete_funcoes_ids || []).includes(id)
        ? prev.lembrete_funcoes_ids.filter(f => f !== id)
        : [...(prev.lembrete_funcoes_ids || []), id],
    }));
  };

  const toggleUsuario = (id) => {
    setForm(prev => ({
      ...prev,
      lembrete_usuarios_ids: (prev.lembrete_usuarios_ids || []).includes(id)
        ? prev.lembrete_usuarios_ids.filter(u => u !== id)
        : [...(prev.lembrete_usuarios_ids || []), id],
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
            <label className="text-xs font-medium text-slate-600 mb-1 block">Quem recebe o lembrete</label>
            <div className="flex gap-2 flex-wrap">
              {DESTINATARIOS.map(opt => (
                <button
                  key={opt.valor}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, lembrete_destinatarios_tipo: opt.valor }))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    tipoDestino === opt.valor
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-orange-400'
                  )}
                >{opt.label}</button>
              ))}
            </div>

            {tipoDestino === 'funcoes' && (
              <div className="mt-2 bg-white border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                {(funcoes || []).length === 0 && (
                  <p className="text-xs text-slate-400 px-1">Nenhuma função cadastrada.</p>
                )}
                {(funcoes || []).map(f => {
                  const marcado = (form.lembrete_funcoes_ids || []).includes(f.id);
                  return (
                    <label key={f.id} className="flex items-center gap-2 px-1 py-1 cursor-pointer text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => toggleFuncao(f.id)}
                        className="w-4 h-4 accent-orange-500"
                      />
                      {f.nome}
                    </label>
                  );
                })}
              </div>
            )}

            {tipoDestino === 'usuarios' && (
              <div className="mt-2 bg-white border border-slate-200 rounded-lg p-2 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                  <Input
                    value={buscaUsuario}
                    onChange={e => setBuscaUsuario(e.target.value)}
                    placeholder="Buscar usuário por nome ou e-mail"
                    className="h-8 text-xs pl-7"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {usuariosFiltrados.length === 0 && (
                    <p className="text-xs text-slate-400 px-1">Nenhum usuário encontrado.</p>
                  )}
                  {usuariosFiltrados.map(u => {
                    const marcado = (form.lembrete_usuarios_ids || []).includes(u.id);
                    return (
                      <label key={u.id} className="flex items-start gap-2 px-1 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => toggleUsuario(u.id)}
                          className="w-4 h-4 accent-orange-500 mt-0.5"
                        />
                        <span className="text-sm text-slate-700 leading-tight">
                          {u.full_name || u.email}
                          <span className="block text-[11px] text-slate-400">{u.email}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {tipoDestino !== 'todos' && (tipoDestino === 'funcoes' ? (form.lembrete_funcoes_ids || []) : (form.lembrete_usuarios_ids || [])).length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">Nenhum selecionado: enquanto nada estiver marcado, o lembrete aparece para todos.</p>
            )}
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
              O popup aparece a partir desse horário para os destinatários selecionados, e uma notificação push é enviada aos celulares com o aplicativo instalado. Se o usuário clicar em "Entendi", o lembrete volta a cada 30 minutos até que a tarefa seja marcada como concluída.
            </p>
          </div>
        </>
      )}
    </div>
  );
}