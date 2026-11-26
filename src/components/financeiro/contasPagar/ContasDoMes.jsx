import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CheckCircle2, Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import { CATEGORIAS, dataCurta, fmtMoeda, labelCategoria } from './utils';
import ModalPagarConta from './ModalPagarConta';
import ModalEditarConta from './ModalEditarConta';

const ESTILO_STATUS = {
  pago: 'bg-green-100 text-green-700',
  pendente: 'bg-yellow-100 text-yellow-800',
  vencida: 'bg-red-100 text-red-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-slate-100 text-slate-500',
};

export default function ContasDoMes({ contas }) {
  const qc = useQueryClient();
  const [pagando, setPagando] = useState(null);
  const [editando, setEditando] = useState(null);
  const hoje = new Date();

  const statusDe = (c) =>
    c.status !== 'pago' && c.status !== 'cancelado' && c.data_vencimento && new Date(c.data_vencimento) < hoje
      ? 'vencida'
      : c.status || 'pendente';

  const excluir = async (conta) => {
    await base44.entities.ContaPagar.delete(conta.id);
    qc.invalidateQueries(['contas-pagar']);
    qc.invalidateQueries(['contas_pagar']);
    toast.success('Conta excluída!');
  };

  const grupos = useMemo(() => {
    const mapa = {};
    contas.forEach((c) => {
      const cat = CATEGORIAS.find((x) => x.valor === c.categoria) ? c.categoria : 'outros';
      mapa[cat] = [...(mapa[cat] || []), c];
    });
    return CATEGORIAS.filter((cat) => mapa[cat.valor]).map((cat) => ({
      ...cat,
      itens: mapa[cat.valor].sort((a, b) => new Date(a.data_vencimento || 0) - new Date(b.data_vencimento || 0)),
    }));
  }, [contas]);

  if (!contas.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-400">
          <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Nenhuma conta neste mês. Cadastre as contas previstas para gerar o mês automaticamente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => (
        <div key={grupo.valor}>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{grupo.label}</p>
            <p className="text-xs font-semibold text-slate-500">
              R$ {fmtMoeda(grupo.itens.reduce((s, c) => s + (Number(c.valor) || 0), 0))}
            </p>
          </div>
          <div className="space-y-1.5">
            {grupo.itens.map((conta) => {
              const status = statusDe(conta);
              return (
                <Card key={conta.id} className={status === 'pago' ? 'opacity-70' : ''}>
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{conta.descricao}</p>
                      <p className="text-xs text-slate-500">
                        Vence {dataCurta(conta.data_vencimento)}
                        {status === 'vencida' ? ' · em atraso' : ''}
                        {!conta.conta_prevista_id ? ' · fora do planejamento' : ''}
                      </p>
                    </div>
                    <Badge className={`text-xs whitespace-nowrap ${ESTILO_STATUS[status]}`}>{status}</Badge>
                    <span className="text-sm font-bold text-slate-800 whitespace-nowrap">R$ {fmtMoeda(conta.valor)}</span>
                    {status !== 'pago' && status !== 'cancelado' && (
                      <Button size="sm" onClick={() => setPagando(conta)} className="bg-green-600 hover:bg-green-700 h-7 text-xs gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pagar
                      </Button>
                    )}
                    <button onClick={() => setEditando(conta)} className="text-slate-400 hover:text-blue-500" title="Editar valor">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button title="Excluir"><Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir "{conta.descricao}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {labelCategoria(conta.categoria)} · R$ {fmtMoeda(conta.valor)}. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => excluir(conta)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {pagando && (
        <ModalPagarConta conta={pagando} onClose={() => setPagando(null)} onPago={() => setPagando(null)} />
      )}
      {editando && (
        <ModalEditarConta conta={editando} onClose={() => setEditando(null)} onSalvo={() => setEditando(null)} />
      )}
    </div>
  );
}