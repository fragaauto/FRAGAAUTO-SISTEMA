import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from 'lucide-react';

export default function ItemOrcamento({ item, onUpdate, onRemove }) {
  const handleQuantidadeChange = (e) => {
    const quantidade = parseInt(e.target.value) || 1;
    onUpdate({
      ...item,
      quantidade,
      valor_total: quantidade * item.valor_unitario
    });
  };

  const handleValorChange = (e) => {
    const valor_unitario = parseFloat(e.target.value) || 0;
    onUpdate({
      ...item,
      valor_unitario,
      valor_total: item.quantidade * valor_unitario
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{item.nome}</p>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-1">Qtd</span>
          <Input
            type="number"
            min="1"
            value={item.quantidade}
            onChange={handleQuantidadeChange}
            className="w-20 h-10 text-center"
          />
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-1">Valor Unit.</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={item.valor_unitario}
            onChange={handleValorChange}
            className="w-28 h-10"
          />
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-1">Total</span>
          <div className="h-10 px-3 flex items-center bg-green-50 border border-green-200 rounded-md font-semibold text-green-700 min-w-[100px]">
            R$ {item.valor_total?.toFixed(2)}
          </div>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 self-end"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}