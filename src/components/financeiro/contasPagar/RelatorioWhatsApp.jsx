import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bell, BellRing, Loader2, MessageCircle, Settings2 } from 'lucide-react';
import { NOME_RELATORIO, TELEFONE_PADRAO, textoRelatorio } from './utils';

export default function RelatorioWhatsApp({ competencia, contas, lembrete, empresa, unidadeId }) {
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [config, setConfig] = useState(false);
  const [dia, setDia] = useState(lembrete?.dia_lembrete || 25);
  const [telefone, setTelefone] = useState(lembrete?.telefone || TELEFONE_PADRAO);
  const [ativo, setAtivo] = useState(lembrete ? lembrete.ativo !== false : true);
  const [savingConfig, setSavingConfig] = useState(false);

  const numero = lembrete?.telefone || TELEFONE_PADRAO;
  const diaLembrete = lembrete?.dia_lembrete || 25;
  const pendente = lembrete?.ultimo_envio_competencia !== competencia;
  const lembreteNaTela = (lembrete ? lembrete.ativo !== false : true) && pendente && new Date().getDate() >= diaLembrete;

  const salvarConfig = async (extra = {}) => {
    const dados = {
      ativo: extra.ativo ?? ativo,
      dia_lembrete: extra.dia_lembrete ?? (parseInt(dia) || 25),
      telefone: extra.telefone ?? telefone,
      unidade_id: lembrete?.unidade_id || unidadeId || null,
      ...extra,
    };
    if (lembrete?.id) await base44.entities.LembreteContasPagar.update(lembrete.id, dados);
    else await base44.entities.LembreteContasPagar.create(dados);
    qc.invalidateQueries(['lembrete-contas']);
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const mensagem = textoRelatorio({ competencia, contas, empresa });
      const res = await base44.functions.invoke('enviarMensagemWhatsApp', {
        telefone: numero,
        mensagem,
        unidade_id: lembrete?.unidade_id || unidadeId || null,
      });
      if (res.data?.ok) {
        await salvarConfig({ ultimo_envio_competencia: competencia });
        toast.success(`Relatório enviado no WhatsApp de ${NOME_RELATORIO}!`);
      } else {
        toast.error(res.data?.error || 'Não foi possível enviar o relatório.');
      }
    } catch (err) {
      toast.error('Erro ao enviar: ' + err.message);
    }
    setEnviando(false);
  };

  const salvarConfiguracoes = async () => {
    setSavingConfig(true);
    await salvarConfig();
    setSavingConfig(false);
    setConfig(false);
    toast.success('Lembrete atualizado!');
  };

  return (
    <>
      <Card className={lembreteNaTela ? 'border-2 border-amber-300 bg-amber-50' : 'border-slate-200'}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-2 flex-1">
            {lembreteNaTela ? (
              <BellRing className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Bell className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-semibold ${lembreteNaTela ? 'text-amber-800' : 'text-slate-700'}`}>
                {lembreteNaTela
                  ? `Lembrete do dia ${diaLembrete}: envie o relatório de contas a pagar`
                  : 'Relatório de contas a pagar no WhatsApp'}
              </p>
              <p className={`text-xs ${lembreteNaTela ? 'text-amber-700' : 'text-slate-500'}`}>
                Destino: {NOME_RELATORIO} · ({numero.slice(0, 2)}) {numero.slice(2)}
                {pendente ? ' · ainda não enviado neste mês' : ' · enviado neste mês'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfig(true)} className="gap-1">
              <Settings2 className="w-3.5 h-3.5" /> Lembrete
            </Button>
            <Button onClick={enviar} disabled={enviando} className="bg-green-600 hover:bg-green-700 gap-1">
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              Enviar relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {config && (
        <Dialog open={true} onOpenChange={() => setConfig(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Lembrete do relatório</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Lembrete ativo</span>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>
              <div>
                <Label>Aparecer a partir do dia</Label>
                <Input type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} />
                <p className="text-xs text-slate-400 mt-1">
                  O aviso aparece na tela do auxiliar administrativo a partir deste dia, até o relatório ser enviado.
                </p>
              </div>
              <div>
                <Label>WhatsApp que recebe</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="31998684197" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfig(false)}>Cancelar</Button>
                <Button onClick={salvarConfiguracoes} disabled={savingConfig} className="flex-1 bg-green-600 hover:bg-green-700">
                  {savingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}