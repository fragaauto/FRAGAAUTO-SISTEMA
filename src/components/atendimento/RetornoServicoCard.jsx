import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Undo2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function RetornoServicoCard({ ativo, onToggle, atendimentos, onSelectOrigem, origemNumero }) {
  const [busca, setBusca] = useState('');
  const [showSug, setShowSug] = useState(false);

  const sugestoes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q.length < 1) return [];
    return atendimentos.filter(a => {
      const num = String(a.numero_os || '');
      const placa = (a.placa || '').toLowerCase();
      const cliente = (a.cliente_nome || '').toLowerCase();
      return num.includes(q) || placa.includes(q) || cliente.includes(q);
    }).slice(0, 8);
  }, [busca, atendimentos]);

  const selecionar = (a) => {
    onSelectOrigem(a);
    setBusca(`OS #${a.numero_os} - ${a.placa || ''} ${a.cliente_nome || ''}`.trim());
    setShowSug(false);
    toast.success(`Retorno vinculado à OS #${a.numero_os}`);
  };

  return (
    <Card className={ativo ? 'border-amber-300 bg-amber-50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Checkbox
            id="retorno_servico"
            checked={ativo}
            onCheckedChange={(checked) => onToggle(checked)}
          />
          <div className="flex-1">
            <label
              htmlFor="retorno_servico"
              className="text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-2"
            >
              <Undo2 className="w-4 h-4 text-amber-600" />
              Retorno de Serviço (Garantia)
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Marque quando este atendimento é um retorno/garantia de um serviço anterior. A produção deste atendimento não será contabilizada para o técnico responsável.
            </p>
          </div>
        </div>

        {ativo && (
          <div className="mt-4 relative">
            <Label className="text-xs">Vincular à OS de origem</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nº da OS, placa ou cliente..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setShowSug(true); }}
                onFocus={() => setShowSug(busca.trim().length >= 1)}
                onBlur={() => setTimeout(() => setShowSug(false), 200)}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            {showSug && sugestoes.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                {sugestoes.map(a => (
                  <button
                    key={a.id}
                    onMouseDown={() => selecionar(a)}
                    className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors border-b last:border-0 flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">
                        OS #{a.numero_os} — {a.placa || 'Sem placa'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {a.cliente_nome || 'Sem cliente'} {a.modelo ? `· ${a.modelo}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {origemNumero && (
              <p className="text-xs text-amber-700 mt-2 font-medium">
                ✓ Vinculado à OS #{origemNumero}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}