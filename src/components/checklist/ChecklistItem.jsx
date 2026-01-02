import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, MinusCircle, HelpCircle, ShoppingCart } from 'lucide-react';
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  ok: { icon: CheckCircle2, color: 'bg-green-500 hover:bg-green-600', textColor: 'text-green-600' },
  com_defeito: { icon: XCircle, color: 'bg-red-500 hover:bg-red-600', textColor: 'text-red-600' },
  nao_possui: { icon: MinusCircle, color: 'bg-gray-400 hover:bg-gray-500', textColor: 'text-gray-500' },
  nao_verificado: { icon: HelpCircle, color: 'bg-yellow-500 hover:bg-yellow-600', textColor: 'text-yellow-600' }
};

export default function ChecklistItem({ item, value, onChange }) {
  const currentStatus = value?.status || 'nao_verificado';
  const StatusIcon = STATUS_CONFIG[currentStatus]?.icon || HelpCircle;

  const handleStatusChange = (newStatus) => {
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      status: newStatus
    });
  };

  const handleCommentChange = (e) => {
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      comentario: e.target.value
    });
  };

  const handleOrcamentoChange = (checked) => {
    onChange({
      ...value,
      item: item.item,
      categoria: item.categoria,
      incluir_orcamento: checked
    });
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all",
      currentStatus === 'com_defeito' ? 'border-red-200 bg-red-50/50' : 
      currentStatus === 'ok' ? 'border-green-200 bg-green-50/50' : 
      'border-slate-200 bg-white'
    )}>
      <div className="flex items-start gap-3">
        <StatusIcon className={cn("w-6 h-6 mt-1 flex-shrink-0", STATUS_CONFIG[currentStatus]?.textColor)} />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800 text-base mb-3">{item.item}</h4>
          
          {/* Status Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'ok' ? 'default' : 'outline'}
              className={cn(
                "h-10 px-4 text-sm font-medium",
                currentStatus === 'ok' && 'bg-green-500 hover:bg-green-600'
              )}
              onClick={() => handleStatusChange('ok')}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              OK
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'com_defeito' ? 'default' : 'outline'}
              className={cn(
                "h-10 px-4 text-sm font-medium",
                currentStatus === 'com_defeito' && 'bg-red-500 hover:bg-red-600'
              )}
              onClick={() => handleStatusChange('com_defeito')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Defeito
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === 'nao_possui' ? 'default' : 'outline'}
              className={cn(
                "h-10 px-4 text-sm font-medium",
                currentStatus === 'nao_possui' && 'bg-gray-400 hover:bg-gray-500'
              )}
              onClick={() => handleStatusChange('nao_possui')}
            >
              <MinusCircle className="w-4 h-4 mr-1" />
              Não Possui
            </Button>
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Observações do técnico..."
            value={value?.comentario || ''}
            onChange={handleCommentChange}
            className="min-h-[60px] text-base resize-none mb-2"
          />

          {/* Include in budget */}
          {currentStatus === 'com_defeito' && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
              <Checkbox
                id={`orcamento-${item.id}`}
                checked={value?.incluir_orcamento || false}
                onCheckedChange={handleOrcamentoChange}
              />
              <label 
                htmlFor={`orcamento-${item.id}`}
                className="text-sm font-medium text-orange-700 cursor-pointer flex items-center gap-1"
              >
                <ShoppingCart className="w-4 h-4" />
                Incluir no orçamento
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}