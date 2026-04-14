import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Wrench } from 'lucide-react';
import AtribuirTecnicoModal from './AtribuirTecnicoModal';

export default function ItemOrcamento({ item, onUpdate, onRemove, readOnly = false }) {
  const [mostrarModalTecnico, setMostrarModalTecnico] = useState(false);
  const handleQuantidadeChange = (e) => {
    const value = e.target.value;
    // Se estiver vazio, manter vazio temporariamente
    if (value === '') {
      onUpdate({
        ...item,
        quantidade: '',
        valor_total: 0
      });
      return;
    }
    // Converter para número e garantir mínimo de 1
    const quantidade = Math.max(1, parseInt(value) || 1);
    onUpdate({
      ...item,
      quantidade,
      valor_total: quantidade * item.valor_unitario
    });
  };

  const handleValorChange = (e) => {
    const value = e.target.value;
    // Permitir vazio temporariamente
    if (value === '') {
      onUpdate({
        ...item,
        valor_unitario: '',
        valor_total: 0
      });
      return;
    }
    const valor_unitario = parseFloat(value) || 0;
    onUpdate({
      ...item,
      valor_unitario,
      valor_total: (item.quantidade || 0) * valor_unitario
    });
  };

  const handleAtribuirTecnico = (tecnicos) => {
    onUpdate({
      ...item,
      tecnicos: tecnicos || [],
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{item.nome}</p>
            {item.tecnicos && item.tecnicos.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.tecnicos.map((tec, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                    <Wrench className="w-3 h-3 mr-1" />
                    {tec.nome}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMostrarModalTecnico(true)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
          >
            <Wrench className="w-4 h-4 mr-1" />
            <span className="text-xs">{item.tecnicos?.length > 0 ? 'Editar' : 'Atribuir'}</span>
          </Button>
        </div>
        
        {readOnly ? (
          <div className="flex items-center gap-4 flex-wrap text-sm text-slate-600">
            <span><span className="text-slate-400">Qtd:</span> {item.quantidade}</span>
            <span><span className="text-slate-400">Unit.:</span> R$ {item.valor_unitario?.toFixed(2)}</span>
            <span className="font-semibold text-green-700">Total: R$ {item.valor_total?.toFixed(2)}</span>
          </div>
        ) : (
        <div className="flex items-center gap-2 flex-wrap">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-1">Qtd</span>
          <Input
            type="number"
            inputMode="numeric"
            min="1"
            value={item.quantidade}
            onChange={handleQuantidadeChange}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              if (e.target.value === '' || parseInt(e.target.value) < 1) {
                handleQuantidadeChange({ target: { value: '1' } });
              }
            }}
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
            onFocus={(e) => e.target.select()}
            onBlur={(e) => {
              if (e.target.value === '' || parseFloat(e.target.value) < 0) {
                handleValorChange({ target: { value: '0' } });
              }
            }}
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
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
        )}
      </div>

      {mostrarModalTecnico && (
        <AtribuirTecnicoModal
          item={item}
          onConfirm={handleAtribuirTecnico}
          onClose={() => setMostrarModalTecnico(false)}
        />
      )}
    </>
  );
}