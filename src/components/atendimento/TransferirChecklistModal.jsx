import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, ArrowRightLeft, AlertTriangle, Car, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TransferirChecklistModal({ atendimento, open, onClose }) {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [destinoId, setDestinoId] = useState(null);
  const [transferindo, setTransferindo] = useState(false);

  // Busca atendimentos para selecionar o destino
  const { data: candidatos = [], isFetching } = useQuery({
    queryKey: ['atendimentos-transferencia-checklist', busca],
    queryFn: async () => {
      // Busca amplo e filtra no client — buscamos por OS/placa/nome
      const [porData, porCreated] = await Promise.all([
        base44.entities.Atendimento.filter({}, '-numero_os', 500),
      ]);
      return porData;
    },
    enabled: open,
    staleTime: 60 * 1000,
  });

  const candidatosFiltrados = React.useMemo(() => {
    if (!candidatos.length) return [];
    const termo = busca.trim().toLowerCase();
    let lista = candidatos.filter(a => a.id !== atendimento.id);
    if (termo) {
      lista = lista.filter(a =>
        String(a.numero_os || '').includes(termo) ||
        (a.placa || '').toLowerCase().includes(termo) ||
        (a.cliente_nome || '').toLowerCase().includes(termo) ||
        (a.modelo || '').toLowerCase().includes(termo)
      );
    }
    // Ordena por OS decrescente (mais recente primeiro)
    return lista.sort((a, b) => (Number(b.numero_os) || 0) - (Number(a.numero_os) || 0)).slice(0, 50);
  }, [candidatos, busca, atendimento.id]);

  const destino = candidatosFiltrados.find(a => a.id === destinoId);

  const itensChecklistCount = (atendimento.checklist || []).length;
  const itensOrcamentoCount = (atendimento.itens_orcamento || []).length;
  const temConteudo = itensChecklistCount > 0 || itensOrcamentoCount > 0 || atendimento.pre_diagnostico;

  const recalcularTotais = (atendimentoAtualizado) => {
    const subtotal_queixa = (atendimentoAtualizado.itens_queixa || []).reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0);
    const subtotal_checklist = (atendimentoAtualizado.itens_orcamento || []).reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0);
    const subtotal = subtotal_queixa + subtotal_checklist;
    const valor_final = subtotal - (Number(atendimentoAtualizado.desconto) || 0);
    return { subtotal_queixa, subtotal_checklist, subtotal, valor_final };
  };

  const handleTransferir = async () => {
    if (!destino) {
      toast.error('Selecione o atendimento de destino');
      return;
    }
    if (!temConteudo) {
      toast.error('Não há conteúdo de checklist para transferir');
      return;
    }

    // Confirmação extra se destino já tiver checklist
    const destinoTemChecklist = (destino.checklist || []).length > 0 || (destino.itens_orcamento || []).length > 0;
    if (destinoTemChecklist) {
      const ok = window.confirm(
        `ATENÇÃO: O atendimento destino (OS #${destino.numero_os}) já possui checklist/orçamento. ` +
        `Transferir vai SOBRESCREVER o conteúdo existente. Deseja continuar?`
      );
      if (!ok) return;
    }

    setTransferindo(true);
    try {
      // 1. Atualiza o destino com o conteúdo do checklist (sem assinaturas — elas são do cliente)
      const dadosDestino = {
        checklist: atendimento.checklist || [],
        itens_orcamento: atendimento.itens_orcamento || [],
        pre_diagnostico: atendimento.pre_diagnostico || '',
        // Invalida assinatura do destino pois o conteúdo mudou
        assinatura_cliente_checklist: null,
        data_aprovacao_checklist: null,
      };
      // Recalcula totais do destino preservando a queixa original dele
      const totaisDestino = recalcularTotais({
        ...destino,
        itens_orcamento: dadosDestino.itens_orcamento,
      });
      await base44.entities.Atendimento.update(destino.id, {
        ...dadosDestino,
        ...totaisDestino,
      });

      // 2. Limpa o checklist da origem
      const dadosOrigem = {
        checklist: [],
        itens_orcamento: [],
        pre_diagnostico: '',
        subtotal_checklist: 0,
        assinatura_cliente_checklist: null,
        data_aprovacao_checklist: null,
      };
      const totaisOrigem = recalcularTotais({
        ...atendimento,
        itens_orcamento: [],
      });
      await base44.entities.Atendimento.update(atendimento.id, {
        ...dadosOrigem,
        ...totaisOrigem,
      });

      // 3. Invalida caches
      await queryClient.invalidateQueries(['atendimento', atendimento.id]);
      await queryClient.invalidateQueries(['atendimento', destino.id]);
      await queryClient.invalidateQueries(['atendimentos']);

      toast.success(`Checklist transferido para OS #${destino.numero_os} com sucesso!`);
      onClose();
      setDestinoId(null);
      setBusca('');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao transferir checklist: ' + (e.message || 'tente novamente'));
    } finally {
      setTransferindo(false);
    }
  };

  const handleClose = () => {
    if (transferindo) return;
    onClose();
    setDestinoId(null);
    setBusca('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            Transferir Checklist para outro Atendimento
          </DialogTitle>
          <DialogDescription>
            Use quando o checklist foi preenchido no atendimento errado. O conteúdo (verificações, observações, itens de orçamento e pré-diagnóstico) será movido para o atendimento destino e removido deste.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do conteúdo a transferir */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="text-sm font-semibold text-blue-900">Conteúdo a transferir (OS #{atendimento.numero_os}):</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-white rounded border border-blue-200">
              {itensChecklistCount} item(ns) verificado(s)
            </span>
            <span className="px-2 py-1 bg-white rounded border border-blue-200">
              {itensOrcamentoCount} item(ns) de orçamento
            </span>
            {atendimento.pre_diagnostico && (
              <span className="px-2 py-1 bg-white rounded border border-blue-200">
                Pré-diagnóstico preenchido
              </span>
            )}
          </div>
          {!temConteudo && (
            <p className="text-sm text-red-600 font-medium">
              Não há conteúdo de checklist neste atendimento para transferir.
            </p>
          )}
        </div>

        {/* Busca e seleção do destino */}
        <div className="space-y-3">
          <Label>Selecione o atendimento de destino</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por OS, placa, cliente ou modelo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {isFetching && (
              <div className="p-4 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando atendimentos...
              </div>
            )}
            {!isFetching && candidatosFiltrados.length === 0 && (
              <div className="p-4 text-center text-slate-500 text-sm">
                Nenhum atendimento encontrado
              </div>
            )}
            {!isFetching && candidatosFiltrados.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setDestinoId(a.id)}
                className={`w-full text-left p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                  destinoId === a.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.numero_os && (
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        OS #{String(a.numero_os).padStart(6, '0')}
                      </span>
                    )}
                    <span className="font-semibold text-slate-800">{a.placa || '—'}</span>
                    <span className="text-sm text-slate-500">{a.modelo || ''}</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">
                    {a.cliente_nome || 'Sem cliente'}
                    {a.data_entrada && (
                      <span className="text-xs text-slate-400 ml-2">
                        · {format(new Date(a.data_entrada), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </p>
                  {((a.checklist || []).length > 0 || (a.itens_orcamento || []).length > 0) && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Já possui checklist — será sobrescrito
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {destino && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <strong>Destino selecionado:</strong> OS #{destino.numero_os} — {destino.placa} ({destino.cliente_nome})
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={transferindo}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransferir}
            disabled={!destino || !temConteudo || transferindo}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {transferindo ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4 mr-2" />
            )}
            Transferir Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}