import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Loader2, Undo2 } from 'lucide-react';
import DescricaoItemGarantia from './DescricaoItemGarantia';
import { toast } from 'sonner';
import { garantiasDoRetorno, tecnicosDaGarantia, transferenciasPorServico, valorGarantia } from '@/lib/retornoProducao';

export default function ModalTransferirProducao({ atendimento, origem, transferencias, onClose, onAtualizado }) {
  const [destinos, setDestinos] = useState({});
  const [processando, setProcessando] = useState(null);

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: async () => {
      const page = await base44.entities.Funcionario.filter({}, { fields: ['id', 'nome_completo', 'status'] });
      return page.items;
    },
    staleTime: 10 * 60 * 1000,
  });

  const garantias = useMemo(() => garantiasDoRetorno(atendimento, origem), [atendimento, origem]);
  const mapaTransferencias = useMemo(() => transferenciasPorServico(transferencias), [transferencias]);

  const opcoesTecnicos = useMemo(() => {
    const nomes = new Set();
    (funcionarios || [])
      .filter((f) => (f.status || 'ativo') === 'ativo' && f.nome_completo)
      .forEach((f) => nomes.add(f.nome_completo));
    (atendimento.tecnicos_responsaveis || []).forEach((t) => t?.nome && nomes.add(t.nome));
    [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])].forEach((item) => {
      (item.tecnicos || []).forEach((t) => t?.nome && nomes.add(t.nome));
    });
    if (atendimento.tecnico) {
      String(atendimento.tecnico).split(',').forEach((n) => n.trim() && nomes.add(n.trim()));
    }
    return Array.from(nomes).sort();
  }, [funcionarios, atendimento]);

  const enviar = async (garantia, acao) => {
    const nomeDestino = destinos[garantia.key] || '';
    if (acao === 'transferir' && !nomeDestino) {
      toast.error('Selecione o técnico que receberá a produção');
      return;
    }
    setProcessando(garantia.key);
    try {
      const res = await base44.functions.invoke('transferirProducao', {
        atendimentoId: atendimento.id,
        servicoKey: garantia.key,
        operacao: acao,
        tecnicoDestinoNome: acao === 'transferir' ? nomeDestino : undefined,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(acao === 'transferir' ? 'Produção transferida!' : 'Transferência cancelada');
      await onAtualizado();
      if (acao === 'cancelar') setDestinos((prev) => ({ ...prev, [garantia.key]: '' }));
    } catch (e) {
      toast.error('Erro: ' + (e.message || e));
    } finally {
      setProcessando(null);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-red-600" />
            Transferir Produção — OS #{String(atendimento.numero_os || '').padStart(6, '0')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500">
          O valor do serviço é descontado do técnico que realizou originalmente e atribuído ao técnico que refez o
          serviço neste retorno. Toda transferência fica registrada no log.
        </p>

        {garantias.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">Esta OS de retorno não possui serviços vinculados.</p>
        )}

        <div className="space-y-3">
          {garantias.map((garantia) => {
            const techsOrigem = tecnicosDaGarantia(garantia, origem);
            const atuais = mapaTransferencias[garantia.key] || [];
            const valorTransferido = atuais.reduce((s, t) => s + (Number(t.valor) || 0), 0);
            const destinoAtual = atuais[0]?.tecnico_destino_nome || '';
            const carregando = processando === garantia.key;
            return (
              <div
                key={garantia.key}
                className={`rounded-lg border p-3 ${atuais.length > 0 ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{garantia.nome}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Valor: R$ {valorGarantia(garantia).toFixed(2)} · Executado por:{' '}
                      {techsOrigem.map((t) => t.nome).join(', ') || 'sem técnico na origem'}
                    </p>
                    <DescricaoItemGarantia item={garantia} />
                  </div>
                  {atuais.length > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white whitespace-nowrap">
                      <Undo2 className="w-3 h-3" /> Transferido p/ {destinoAtual}
                    </span>
                  )}
                </div>

                {atuais.length > 0 && (
                  <p className="text-xs text-red-700 mt-2">
                    R$ {valorTransferido.toFixed(2)} transferido por {atuais[0]?.usuario_nome || '—'}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Select
                    value={destinos[garantia.key] || ''}
                    onValueChange={(valor) => setDestinos((prev) => ({ ...prev, [garantia.key]: valor }))}
                  >
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Técnico que refez o serviço..." />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoesTecnicos.map((nome) => (
                        <SelectItem key={nome} value={nome}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-9 bg-red-600 hover:bg-red-700"
                    disabled={carregando || !destinos[garantia.key]}
                    onClick={() => enviar(garantia, 'transferir')}
                  >
                    {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transferir'}
                  </Button>
                  {atuais.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-slate-600"
                      disabled={carregando}
                      onClick={() => enviar(garantia, 'cancelar')}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}