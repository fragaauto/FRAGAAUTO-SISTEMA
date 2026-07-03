import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function AcessoForaHorario({ inicio, fim, dias, diaBloqueado }) {
  const diasTexto = Array.isArray(dias) && dias.length > 0
    ? dias.map(d => NOMES_DIAS[d] || d).join(', ')
    : 'Todos os dias';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Acesso fora do horário permitido</h1>
        <p className="text-slate-600 text-sm mb-4">
          {diaBloqueado
            ? 'O acesso ao sistema não é permitido neste dia da semana.'
            : 'O sistema só pode ser acessado dentro do horário autorizado.'}
        </p>
        <div className="bg-slate-50 rounded-lg p-4 space-y-1 text-sm text-slate-700 mb-6">
          {inicio && fim && (
            <p><span className="text-slate-500">Horário:</span> <strong>{inicio} às {fim}</strong></p>
          )}
          <p><span className="text-slate-500">Dias:</span> <strong>{diasTexto}</strong></p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}