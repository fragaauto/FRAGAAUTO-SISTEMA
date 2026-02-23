import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, ClipboardCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AssistenteIADialog({ open, onOpenChange, textoTecnico, setTextoTecnico, processandoIA, progressoIA, onProcessar, checklistItems = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Assistente de IA - Processar Informações do Técnico
          </DialogTitle>
          <DialogDescription>
            Cole o texto do técnico com as informações sobre defeitos, peças e serviços. A IA irá organizar automaticamente o checklist e a queixa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
          {/* Coluna principal */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div>
              <Label>Informações do Técnico</Label>
              <Textarea
                placeholder="Exemplo: Cliente relata barulho na porta traseira direita. Verificado vidro elétrico com defeito, precisa trocar motor do vidro. Porta também precisa de lubrificação e ajuste na fechadura. Fazer reparo na maçaneta que está solta."
                value={textoTecnico}
                onChange={(e) => setTextoTecnico(e.target.value)}
                className="min-h-[180px]"
                disabled={processandoIA}
              />
              <p className="text-xs text-slate-500 mt-2">
                💡 Dica: Mencione defeitos, peças necessárias e serviços. A IA irá identificar produtos no catálogo e organizar tudo automaticamente.
              </p>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 mb-1">ℹ️ Como funciona:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• A IA identifica defeitos e preenche o checklist</li>
                <li>• Produtos do catálogo são lançados automaticamente</li>
                <li>• Serviços como "reparo" e "mão de obra" são adicionados corretamente</li>
                <li>• A queixa inicial é organizada</li>
              </ul>
            </div>

            {processandoIA && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-700 font-medium">Processando...</span>
                  <span className="text-slate-600">{progressoIA}%</span>
                </div>
                <Progress value={progressoIA} className="h-2" />
                <p className="text-xs text-slate-500">
                  {progressoIA < 30 && "Preparando dados..."}
                  {progressoIA >= 30 && progressoIA < 60 && "Analisando com IA..."}
                  {progressoIA >= 60 && progressoIA < 90 && "Organizando informações..."}
                  {progressoIA >= 90 && "Finalizando..."}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setTextoTecnico('');
                }}
                disabled={processandoIA}
              >
                Cancelar
              </Button>
              <Button
                onClick={onProcessar}
                disabled={processandoIA || !textoTecnico.trim()}
                className="bg-purple-600 hover:bg-purple-700 flex-1"
              >
                {processandoIA ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Processar com IA
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Balão lembrete do checklist */}
          {checklistItems.length > 0 && (
            <div className="w-56 flex-shrink-0 flex flex-col bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <div className="bg-amber-400 px-3 py-2 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-900" />
                <span className="text-xs font-bold text-amber-900">Itens do Checklist</span>
              </div>
              <p className="text-xs text-amber-700 px-3 pt-2 pb-1 font-medium">
                ⚠️ Não esqueça de conferir:
              </p>
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                {(() => {
                  const categorias = [...new Set(checklistItems.map(i => i.categoria))];
                  return categorias.map(cat => (
                    <div key={cat}>
                      <p className="text-xs font-bold text-amber-800 mt-2 mb-1 uppercase tracking-wide">{cat}</p>
                      {checklistItems.filter(i => i.categoria === cat).map(item => (
                        <div key={item.id} className="flex items-start gap-1.5 py-0.5">
                          <div className="w-3 h-3 border border-amber-400 rounded-sm flex-shrink-0 mt-0.5 bg-white" />
                          <span className="text-xs text-amber-900 leading-tight">{item.item}</span>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
              <div className="px-3 py-2 border-t border-amber-200 bg-amber-100">
                <p className="text-xs text-amber-700 text-center font-medium">{checklistItems.length} itens no total</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}