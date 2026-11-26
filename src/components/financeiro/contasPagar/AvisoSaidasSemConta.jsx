import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from 'lucide-react';
import { dataCurta, fmtMoeda } from './utils';

export default function AvisoSaidasSemConta({ saidas, contasPrevistas }) {
  const qc = useQueryClient();
  const [vinculando, setVinculando] = useState(null);

  if (!saidas.length) return null;

  const vincular = async (lancamento, contaPrevistaId) => {
    setVinculando(lancamento.id);
    const conta = contasPrevistas.find((c) => c.id === contaPrevistaId);
    await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
      conta_prevista_id: contaPrevistaId,
      categoria: conta?.categoria || lancamento.categoria || 'outros',
    });
    setVinculando(null);
    qc.invalidateQueries(['saidas-sem-conta-prevista']);
    qc.invalidateQueries(['lancamentos']);
    qc.invalidateQueries(['lancamentos-todos']);
    toast.success('Saída vinculada à conta prevista!');
  };

  return (
    <Card className="border-2 border-amber-300 bg-amber-50">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {saidas.length} saída(s) do caixa sem conta prevista
            </p>
            <p className="text-xs text-amber-700">
              Toda saída deve ser direcionada a uma conta prevista. Vincule abaixo para manter o controle fechado.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {saidas.slice(0, 6).map((l) => (
            <div key={l.id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{l.descricao || 'Saída'}</p>
                <p className="text-xs text-slate-500">{dataCurta(l.data_lancamento)} · R$ {fmtMoeda(l.valor)}</p>
              </div>
              <Select value="" onValueChange={(v) => vincular(l, v)}>
                <SelectTrigger className="w-52 h-8 text-xs">
                  <SelectValue placeholder={vinculando === l.id ? 'Vinculando...' : 'Vincular a conta prevista'} />
                </SelectTrigger>
                <SelectContent>
                  {contasPrevistas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vinculando === l.id && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
            </div>
          ))}
          {saidas.length > 6 && (
            <p className="text-xs text-amber-700 px-1">...e mais {saidas.length - 6} saída(s) no período.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}