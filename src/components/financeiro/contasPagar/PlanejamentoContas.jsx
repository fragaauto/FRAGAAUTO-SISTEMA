import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarClock, ChevronDown, ChevronUp, Pencil, Plus, Repeat, Shuffle, Trash2 } from 'lucide-react';
import { MESES, fmtMoeda, labelCategoria, mesesDaConta } from './utils';

const resumoMeses = (conta) => {
  const meses = mesesDaConta(conta);
  if (meses.length === 12) return 'todo mês';
  return meses.map((m) => MESES[m - 1]).join(', ');
};

const somaPrevisto = (lista) => lista.reduce((s, c) => s + (Number(c.valor_previsto) || 0), 0);

export default function PlanejamentoContas({ contas, onNova, onEditar, onExcluir }) {
  const [aberto, setAberto] = useState(false);
  const ativas = contas.filter((c) => c.ativo !== false);
  const fixas = ativas.filter((c) => (c.tipo || 'fixa') === 'fixa');
  const variaveis = ativas.filter((c) => c.tipo === 'variavel');

  const LinhaConta = ({ conta, detalhe }) => (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{conta.nome}</p>
        <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
          <span>Vence dia {conta.dia_vencimento}</span>
          <span className="flex items-center gap-1">{detalhe}</span>
        </p>
      </div>
      <Badge className="bg-slate-100 text-slate-600 text-xs whitespace-nowrap">{labelCategoria(conta.categoria)}</Badge>
      <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">R$ {fmtMoeda(conta.valor_previsto)}</span>
      <button onClick={() => onEditar(conta)} className="text-blue-400 hover:text-blue-600" title="Editar">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button title="Excluir"><Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" /></button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a conta prevista "{conta.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As contas dos meses já gerados continuam no histórico. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onExcluir(conta)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button className="flex items-center gap-2 text-left" onClick={() => setAberto((a) => !a)}>
            <CalendarClock className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-sm text-slate-800">Contas previstas ({ativas.length})</span>
            <span className="text-xs text-slate-500">
              · fixas R$ {fmtMoeda(somaPrevisto(fixas))}/mês · variáveis R$ {fmtMoeda(somaPrevisto(variaveis))}
            </span>
            {aberto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <Button size="sm" variant="outline" onClick={onNova} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Nova conta prevista
          </Button>
        </div>

        {aberto && (
          <div className="mt-4 space-y-5">
            {/* Contas fixas */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Repeat className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Contas fixas — todo mês</span>
                <span className="text-xs text-slate-400">R$ {fmtMoeda(somaPrevisto(fixas))}/mês</span>
              </div>
              <div className="space-y-2">
                {fixas.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-3">
                    Nenhuma conta fixa. Cadastre aluguel, energia, folha e as demais contas que se repetem todo mês.
                  </p>
                ) : (
                  fixas.map((c) => <LinhaConta key={c.id} conta={c} detalhe={<><Repeat className="w-3 h-3" />{resumoMeses(c)}</>} />)
                )}
              </div>
            </div>

            {/* Contas variáveis */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Contas variáveis — cadastrar todo mês</span>
                <span className="text-xs text-slate-400">R$ {fmtMoeda(somaPrevisto(variaveis))}</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Não entram na geração automática: o valor real de cada mês é cadastrado manualmente.
              </p>
              <div className="space-y-2">
                {variaveis.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-3">
                    Nenhuma conta variável cadastrada. Use esta lista para as contas que mudam de valor todo mês.
                  </p>
                ) : (
                  variaveis.map((c) => (
                    <LinhaConta key={c.id} conta={c} detalhe={<><Shuffle className="w-3 h-3" />cadastro manual</>} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}