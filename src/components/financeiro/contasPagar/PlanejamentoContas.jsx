import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarClock, ChevronDown, ChevronUp, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { MESES, fmtMoeda, labelCategoria, mesesDaConta } from './utils';

export default function PlanejamentoContas({ contas, onNova, onEditar, onExcluir }) {
  const [aberto, setAberto] = useState(false);
  const ativas = contas.filter((c) => c.ativo !== false);
  const total = ativas.reduce((s, c) => s + (Number(c.valor_previsto) || 0), 0);

  const resumoMeses = (conta) => {
    const meses = mesesDaConta(conta);
    if (meses.length === 12) return 'todo mês';
    return meses.map((m) => MESES[m - 1]).join(', ');
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button className="flex items-center gap-2 text-left" onClick={() => setAberto((a) => !a)}>
            <CalendarClock className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-sm text-slate-800">Contas previstas ({ativas.length})</span>
            <span className="text-xs text-slate-500">· R$ {fmtMoeda(total)}/mês</span>
            {aberto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <Button size="sm" variant="outline" onClick={onNova} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Nova conta prevista
          </Button>
        </div>

        {aberto && (
          <div className="mt-3 space-y-2">
            {ativas.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Nenhuma conta prevista cadastrada. Cadastre aluguel, energia, folha e as demais contas fixas.
              </p>
            ) : (
              ativas.map((c) => (
                <div key={c.id} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.nome}</p>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
                      <span>Vence dia {c.dia_vencimento}</span>
                      <span className="flex items-center gap-1"><Repeat className="w-3 h-3" />{resumoMeses(c)}</span>
                    </p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 text-xs whitespace-nowrap">{labelCategoria(c.categoria)}</Badge>
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">R$ {fmtMoeda(c.valor_previsto)}</span>
                  <button onClick={() => onEditar(c)} className="text-blue-400 hover:text-blue-600" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button title="Excluir"><Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir a conta prevista "{c.nome}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          As contas dos meses já gerados continuam no histórico. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onExcluir(c)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}