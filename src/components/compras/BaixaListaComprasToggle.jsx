import React from 'react';
import { Switch } from "@/components/ui/switch";
import { ShoppingBag } from 'lucide-react';

export default function BaixaListaComprasToggle({ planos = [], ativo, onChange }) {
  if (planos.length === 0) return null;

  const totalItens = planos.reduce((s, p) => s + p.itens_baixados, 0);

  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50/60 p-3">
      <ShoppingBag className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">Dar baixa na lista de compras</p>
        <p className="text-xs text-slate-500">
          {totalItens} item(ns) desta nota estão em {planos.length} lista(s) aberta(s) e sairão da lista ao dar entrada.
        </p>
      </div>
      <Switch checked={ativo} onCheckedChange={onChange} />
    </div>
  );
}