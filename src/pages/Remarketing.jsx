import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MessageCircle, TrendingUp, Users, Send, RefreshCw,
  Phone, Car, DollarSign, Loader2, XCircle, CheckCircle2,
  Clock, Ban, BarChart2, Plus, Eye, Edit2, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RemarketingMensagemModal from '../components/remarketing/RemarketingMensagemModal';
import CampanhaModal from '../components/remarketing/CampanhaModal';
import EnvioEmMassaModal from '../components/remarketing/EnvioEmMassaModal';
import ModuloBloqueado from '@/components/ModuloBloqueado';
import { paginaPermitida } from '@/components/modulos';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-800', icon: Send },
  respondido: { label: 'Respondido', color: 'bg-purple-100 text-purple-800', icon: MessageCircle },
  convertido: { label: 'Convertido', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-600', icon: Ban },
};

export default function Remarketing() {
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });
  const modulosAtivos = configs[0]?.modulos_ativos ?? null;
  if (!paginaPermitida(modulosAtivos, 'Remarketing')) {
    return <ModuloBloqueado nomeModulo="Remarketing" />;
  }

  const [activeTab, setActiveTab] = useState('fila');
  const [mensagemModalItem, setMensagemModalItem] = useState(null);
  const [campanhModalOpen, setCampanhaModalOpen] = useState(false);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [selecionados, setSelecionados] = useState([]);
  const [envioEmMassaOpen, setEnvioEmMassaOpen] = useState(false);

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos-remarketing'],
    queryFn: () => base44.entities.Atendimento.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: filaRaw = [], isLoading: loadingFila } = useQuery({
    queryKey: ['remarketing-fila'],
    queryFn: () => base44.entities.RemarketingFila.list('-created_date'),
    staleTime: 60 * 1000
  });

  const { data: campanhas = [], isLoading: loadingCampanhas } = useQuery({
    queryKey: ['campanhas'],
    queryFn: () => base44.entities.Campanha.list('-created_date'),
    staleTime: 60 * 1000
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000
  });

  const config = configs[0] || {};
  const diasMinimos = config.dias_minimos_reenvio || 30;

  const updateFilaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RemarketingFila.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['remarketing-fila'])
  });

  const deleteCampanhaMutation = useMutation({
    mutationFn: (id) => base44.entities.Campanha.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['campanhas']);
      toast.success('Campanha removida');
    }
  });

  // Sincronizar fila: identifica atendimentos com reprovados não na fila ainda
  const sincronizarFila = async () => {
    setSincronizando(true);
    try {
      const atendimentosComReprovados = atendimentos.filter(at => {
        const statusValidos = ['concluido', 'cancelado', 'checklist_aprovado', 'checklist_reprovado'];
        const todos = [...(at.itens_queixa || []), ...(at.itens_orcamento || [])];
        return todos.some(i => i.status_aprovacao === 'reprovado') && at.cliente_telefone;
      });

      const idsNaFila = new Set(filaRaw.map(f => f.atendimentoId));
      let adicionados = 0;

      for (const at of atendimentosComReprovados) {
        if (idsNaFila.has(at.id)) continue;

        const todos = [...(at.itens_queixa || []), ...(at.itens_orcamento || [])];
        const reprovados = todos.filter(i => i.status_aprovacao === 'reprovado');
        const valorTotal = reprovados.reduce((acc, i) => acc + (i.valor_total || 0), 0);

        await base44.entities.RemarketingFila.create({
          clienteId: at.cliente_id || '',
          clienteNome: at.cliente_nome || 'Cliente',
          clienteTelefone: at.cliente_telefone,
          atendimentoId: at.id,
          placa: at.placa,
          modelo: at.modelo,
          servicosPendentes: reprovados.map(i => ({
            nome: i.nome,
            valor_total: i.valor_total || 0,
            quantidade: i.quantidade || 1
          })),
          valorTotalPendentes: valorTotal,
          tentativas: 0,
          status: 'pendente',
          logEnvios: [],
          naoDesejaMensagem: false
        });
        adicionados++;
      }

      await queryClient.invalidateQueries(['remarketing-fila']);
      toast.success(`Fila sincronizada! ${adicionados} novo(s) cliente(s) adicionado(s).`);
    } catch (e) {
      toast.error('Erro ao sincronizar fila');
    }
    setSincronizando(false);
  };

  const marcarCancelado = (item) => {
    updateFilaMutation.mutate({ id: item.id, data: { status: 'cancelado', naoDesejaMensagem: true } });
    toast.success('Cliente removido da fila');
  };

  const marcarConvertido = (item) => {
    updateFilaMutation.mutate({ id: item.id, data: { status: 'convertido' } });
    toast.success('Marcado como convertido!');
  };

  const fila = filaRaw.filter(f => f.status !== 'cancelado' || f.naoDesejaMensagem);

  const stats = useMemo(() => {
    const total = filaRaw.length;
    const pendentes = filaRaw.filter(f => f.status === 'pendente').length;
    const enviados = filaRaw.filter(f => f.status === 'enviado').length;
    const respondidos = filaRaw.filter(f => f.status === 'respondido').length;
    const convertidos = filaRaw.filter(f => f.status === 'convertido').length;
    const valorPotencial = filaRaw.filter(f => f.status === 'pendente').reduce((a, f) => a + (f.valorTotalPendentes || 0), 0);
    const valorRecuperado = filaRaw.filter(f => f.status === 'convertido').reduce((a, f) => a + (f.valorTotalPendentes || 0), 0);
    const taxaConversao = enviados > 0 ? ((convertidos / enviados) * 100).toFixed(1) : '0.0';
    return { total, pendentes, enviados, respondidos, convertidos, valorPotencial, valorRecuperado, taxaConversao };
  }, [filaRaw]);

  const filaPorStatus = useMemo(() => {
    return {
      pendente: filaRaw.filter(f => f.status === 'pendente'),
      enviado: filaRaw.filter(f => f.status === 'enviado'),
      respondido: filaRaw.filter(f => f.status === 'respondido'),
      convertido: filaRaw.filter(f => f.status === 'convertido'),
      cancelado: filaRaw.filter(f => f.status === 'cancelado'),
    };
  }, [filaRaw]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-orange-500" />
                REMARKETING
              </h1>
              <p className="text-slate-500 mt-1">Recupere vendas perdidas e gerencie campanhas</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={sincronizarFila}
                disabled={sincronizando}
              >
                {sincronizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sincronizar Fila
              </Button>
              <Button
                onClick={() => { setCampanhaSelecionada(null); setCampanhaModalOpen(true); }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Campanha
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Na Fila', value: stats.pendentes, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500' },
            { label: 'Enviados', value: stats.enviados, icon: Send, color: 'text-blue-600', bg: 'bg-blue-500' },
            { label: 'Convertidos', value: stats.convertidos, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500' },
            { label: 'Taxa de Conversão', value: `${stats.taxaConversao}%`, icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-500' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <p className="text-sm text-orange-700 font-medium">💰 Valor Potencial Recuperável</p>
              <p className="text-3xl font-bold text-orange-600">R$ {stats.valorPotencial.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <p className="text-sm text-green-700 font-medium">✅ Valor Já Recuperado</p>
              <p className="text-3xl font-bold text-green-600">R$ {stats.valorRecuperado.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="fila">Vendas Perdidas ({stats.pendentes})</TabsTrigger>
            <TabsTrigger value="campanhas">Campanhas ({campanhas.length})</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* FILA DE VENDAS PERDIDAS */}
          <TabsContent value="fila" className="space-y-4 mt-4">
            {/* Seleção em massa */}
            {filaPorStatus.pendente.length > 0 && (
              <div className="flex items-center gap-3 bg-white border rounded-lg px-4 py-2">
                <input
                  type="checkbox"
                  checked={selecionados.length === filaPorStatus.pendente.length}
                  onChange={e => setSelecionados(e.target.checked ? filaPorStatus.pendente.map(i => i.id) : [])}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-slate-600">{selecionados.length} selecionado(s)</span>
                {selecionados.length > 0 && (
                  <Button size="sm" className="ml-auto bg-green-600 hover:bg-green-700" onClick={() => setEnvioEmMassaOpen(true)}>
                    <Send className="w-3 h-3 mr-1" /> Enviar {selecionados.length} selecionados
                  </Button>
                )}
              </div>
            )}
            {loadingFila ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : filaPorStatus.pendente.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">Fila vazia</h3>
                  <p className="text-slate-500 mb-4">Clique em "Sincronizar Fila" para identificar clientes com serviços reprovados.</p>
                  <Button onClick={sincronizarFila} disabled={sincronizando} className="bg-orange-500 hover:bg-orange-600">
                    <RefreshCw className="w-4 h-4 mr-2" />Sincronizar Agora
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filaPorStatus.pendente.map(item => (
                <Card key={item.id} className={`hover:shadow-md transition-shadow ${selecionados.includes(item.id) ? 'ring-2 ring-green-400' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(item.id)}
                      onChange={e => setSelecionados(prev => e.target.checked ? [...prev, item.id] : prev.filter(i => i !== item.id))}
                      className="w-4 h-4 mt-1 accent-orange-500 flex-shrink-0"
                    />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800">{item.clienteNome}</p>
                          <Badge className={STATUS_CONFIG[item.status]?.color}>
                            {STATUS_CONFIG[item.status]?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Car className="w-3 h-3" />{item.placa} - {item.modelo}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.clienteTelefone}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {item.servicosPendentes?.map((s, i) => (
                            <div key={i} className="flex justify-between text-sm bg-red-50 rounded px-2 py-1">
                              <span className="text-slate-700">{s.nome}</span>
                              <span className="font-medium text-red-600">R$ {(s.valor_total || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-right font-bold text-orange-600 mt-2">
                          Total: R$ {(item.valorTotalPendentes || 0).toFixed(2)}
                        </p>
                        {item.dataUltimoEnvio && (
                          <p className="text-xs text-slate-400 mt-1">
                            Último envio: {format(new Date(item.dataUltimoEnvio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <Button
                          size="sm"
                          onClick={() => setMensagemModalItem(item)}
                          className="bg-green-600 hover:bg-green-700 w-full"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Enviar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => marcarConvertido(item)}
                          className="w-full text-green-600 border-green-300"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Convertido
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => marcarCancelado(item)}
                          className="w-full text-red-500"
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* CAMPANHAS */}
          <TabsContent value="campanhas" className="space-y-4 mt-4">
            {loadingCampanhas ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : campanhas.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Send className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhuma campanha criada</h3>
                  <Button onClick={() => { setCampanhaSelecionada(null); setCampanhaModalOpen(true); }} className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" />Criar Campanha
                  </Button>
                </CardContent>
              </Card>
            ) : (
              campanhas.map(c => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{c.nomeCampanha}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span>{c.listaContatos?.length || 0} contatos</span>
                          {c.dataAgendada && <span>📅 {format(new Date(c.dataAgendada), 'dd/MM/yyyy HH:mm')}</span>}
                        </div>
                        <div className="flex gap-3 mt-2 text-xs">
                          <span className="text-blue-600">✉️ {c.totalEnviados || 0} enviados</span>
                          <span className="text-purple-600">💬 {c.totalRespondidos || 0} respondidos</span>
                          <span className="text-green-600">✅ {c.totalConvertidos || 0} convertidos</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge className={
                          c.status === 'finalizada' ? 'bg-green-100 text-green-800' :
                          c.status === 'enviando' ? 'bg-blue-100 text-blue-800' :
                          c.status === 'agendada' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-600'
                        }>
                          {c.status}
                        </Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setCampanhaSelecionada(c); setCampanhaModalOpen(true); }}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteCampanhaMutation.mutate(c.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* HISTÓRICO */}
          <TabsContent value="historico" className="space-y-4 mt-4">
            {[...filaPorStatus.enviado, ...filaPorStatus.respondido, ...filaPorStatus.convertido, ...filaPorStatus.cancelado]
              .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
              .map(item => (
                <Card key={item.id} className="opacity-90">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{item.clienteNome}</p>
                        <p className="text-sm text-slate-500">{item.placa} - {item.modelo}</p>
                        {item.dataUltimoEnvio && (
                          <p className="text-xs text-slate-400">
                            {format(new Date(item.dataUltimoEnvio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={STATUS_CONFIG[item.status]?.color}>
                          {STATUS_CONFIG[item.status]?.label}
                        </Badge>
                        <span className="text-sm font-bold text-orange-600">
                          R$ {(item.valorTotalPendentes || 0).toFixed(2)}
                        </span>
                        {item.status === 'enviado' && (
                          <Button size="sm" variant="ghost" className="text-green-600 text-xs" onClick={() => marcarConvertido(item)}>
                            Marcar Convertido
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {[...filaPorStatus.enviado, ...filaPorStatus.respondido, ...filaPorStatus.convertido, ...filaPorStatus.cancelado].length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  Nenhum registro no histórico ainda.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {mensagemModalItem && (
        <RemarketingMensagemModal
          item={mensagemModalItem}
          config={config}
          onClose={() => setMensagemModalItem(null)}
          onEnviado={(id) => {
            updateFilaMutation.mutate({
              id,
              data: {
                status: 'enviado',
                dataUltimoEnvio: new Date().toISOString(),
                tentativas: (mensagemModalItem.tentativas || 0) + 1,
                logEnvios: [...(mensagemModalItem.logEnvios || []), {
                  data: new Date().toISOString(),
                  status: 'enviado',
                  mensagem: 'Mensagem enviada via WhatsApp'
                }]
              }
            });
            setMensagemModalItem(null);
          }}
        />
      )}

      {campanhModalOpen && (
        <CampanhaModal
          campanha={campanhaSelecionada}
          atendimentos={atendimentos}
          onClose={() => setCampanhaModalOpen(false)}
          onSaved={() => {
            queryClient.invalidateQueries(['campanhas']);
            setCampanhaModalOpen(false);
          }}
        />
      )}

      {envioEmMassaOpen && (
        <EnvioEmMassaModal
          itens={filaPorStatus.pendente.filter(i => selecionados.includes(i.id))}
          config={config}
          onClose={() => { setEnvioEmMassaOpen(false); setSelecionados([]); }}
          onEnviado={(id) => {
            updateFilaMutation.mutate({
              id,
              data: { status: 'enviado', dataUltimoEnvio: new Date().toISOString(), tentativas: 1 }
            });
          }}
        />
      )}
    </div>
  );
}