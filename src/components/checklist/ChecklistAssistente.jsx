import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertCircle, MinusCircle } from 'lucide-react';

const statusInfo = {
  com_defeito: { label: 'Defeito', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ok: { label: 'OK', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  atencao: { label: 'Atenção', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  nao_verificado: { label: 'Não verificado', icon: MinusCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
};

export default function ChecklistAssistente({ checklistItems, values }) {
  const [open, setOpen] = useState(false);

  const total = checklistItems.length;
  const verificados = checklistItems.filter(i => values[i.id]?.status && values[i.id]?.status !== 'nao_verificado').length;
  const comDefeito = checklistItems.filter(i => values[i.id]?.status === 'com_defeito').length;
  const pendentes = total - verificados;

  if (total === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-50 max-w-xs w-full">
      {/* Balão expandido */}
      {open && (
        <div className="mb-3 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <span className="font-bold text-white text-sm">Assistente de Checklist</span>
            </div>
            <div className="flex gap-2 text-xs text-white/90">
              <span>{verificados}/{total} verificados</span>
              {comDefeito > 0 && <span className="bg-red-500 text-white rounded-full px-1.5">{comDefeito} defeito{comDefeito > 1 ? 's' : ''}</span>}
            </div>
          </div>

          {pendentes > 0 && (
            <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 text-xs text-orange-700 font-medium">
              ⚠️ {pendentes} {pendentes === 1 ? 'item ainda não verificado' : 'itens ainda não verificados'}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {checklistItems.map(item => {
              const val = values[item.id];
              const status = val?.status || 'nao_verificado';
              const info = statusInfo[status] || statusInfo['nao_verificado'];
              const Icon = info.icon;
              return (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 ${info.bg}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${info.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{item.item}</p>
                    <p className="text-xs text-slate-500">{item.categoria}</p>
                  </div>
                  <span className={`text-xs font-semibold ${info.color} flex-shrink-0`}>{info.label}</span>
                </div>
              );
            })}
          </div>

          {pendentes === 0 && (
            <div className="px-4 py-3 bg-green-50 text-center text-xs text-green-700 font-semibold">
              ✅ Checklist completo!
            </div>
          )}
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-xl px-4 py-3 hover:shadow-2xl transition-all"
      >
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          {pendentes > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {pendentes}
            </span>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-bold text-slate-800">Assistente IA</p>
          <p className="text-xs text-slate-500 truncate">
            {pendentes === 0 ? '✅ Checklist completo!' : `${pendentes} item${pendentes > 1 ? 'ns' : ''} pendente${pendentes > 1 ? 's' : ''}`}
          </p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>
    </div>
  );
}