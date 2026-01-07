import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from "@/lib/utils";
import ChecklistItem from './ChecklistItem';

export default function ChecklistSection({ categoria, items, values, onChange, isOpen, onToggle, produtos = [], onOpenCadastro }) {
  const completedCount = items.filter(item => {
    const val = values[item.id];
    return val?.status && val.status !== 'nao_verificado';
  }).length;

  const defectCount = items.filter(item => {
    const val = values[item.id];
    return val?.status === 'com_defeito';
  }).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-all"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-slate-800">{categoria}</h3>
          <span className="text-sm text-slate-500">
            {completedCount}/{items.length}
          </span>
          {defectCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
              {defectCount} defeito{defectCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 space-y-3 bg-slate-50/50">
          {items.map(item => (
            <ChecklistItem
              key={item.id}
              item={item}
              value={values[item.id] || {}}
              onChange={(newValue) => onChange(item.id, newValue)}
              produtos={produtos}
              onOpenCadastro={onOpenCadastro}
            />
          ))}
        </div>
      )}
    </div>
  );
}