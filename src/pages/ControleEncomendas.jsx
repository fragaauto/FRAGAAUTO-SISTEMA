import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnidade } from '@/lib/UnidadeContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search,
  Package,
  Loader2,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  Calendar,
  ShoppingCart,
  Truck,
  Bell,
  Gift,
  Plus,
} from 'lucide-react';
import MenuAtendimento from '@/components/atendimento/MenuAtendimento';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  nao_comprada: {
    label: 'Não comprada',
    color: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
    icon: ShoppingCart,
  },
  comprada_aguardando: {
    label: 'Aguardando chegada',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
    icon: Truck,
  },
  chegou_nao_avisado: {
    label: 'Chegou — avisar cliente',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    icon: Bell,
  },
  avisado_nao_entregue: {
    label: 'Avisado — aguardando retirada',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
    icon: Clock,
  },
  entregue: {
    label: 'Entregue',
    color: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    icon: CheckCircle2,
  },
};

const FILTROS = [
  { id: 'todos', label: 'Todas' },
  { id: 'nao_comprada', label: 'Não compradas' },
  { id: 'comprada_aguardando', label: 'Aguardando chegada' },
  { id: 'chegou_nao_avisado', label: 'Chegou' },
  { id: 'avisado_nao_entregue', label: 'Avisadas' },
  { id: 'entregue', label: 'Entregues' },
];

function calcularStatus(enc) {
  if (enc.foi_entregue) return 'entregue';
  if (enc.data_aviso_cliente) return 'avisado_nao_entregue';
  if (enc.data_chegada) return 'chegou_nao_avisado';
  if (enc.foi_comprada) return 'comprada_aguardando';
  return 'nao_comprada';
}

function diasSemAtualizacao(enc) {
  const ref = enc.data_aviso_cliente || enc.data_chegada || enc.updated_date || enc.created_date;
  if (!ref) return 0;
  return differenceInDays(new Date(), new Date(ref));
}

export default function ControleEncomendas() {
  const queryClient = useQueryClient();
  const { unidadeAtual } = useUnidade();

  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [editando, setEditando] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [criando, setCriando] = useState(false);
  const [novaEncomenda, setNovaEncomenda] = useState({
    peca: '', nome_cliente: '', telefone_cliente: '',
    placa_veiculo: '', modelo_veiculo: '', ano_veiculo: '',
    valor_venda: '', custo_encomenda: '', observacoes: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Encomenda.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['encomendas']);
      toast.success('Encomenda criada!');
      setCriando(false);
      setNovaEncomenda({ peca: '', nome_cliente: '', telefone_cliente: '', placa_veiculo: '', modelo_veiculo: '', ano_veiculo: '', valor_venda: '', custo_encomenda: '', observacoes: '' });
    },
  });

  const salvarNova = () => {
    if (!novaEncomenda.peca.trim() || !novaEncomenda.nome_cliente.trim()) {
      toast.error('Peça e Cliente são obrigatórios');
      return;
    }
    createMutation.mutate({
      ...novaEncomenda,
      unidade_id: unidadeAtual?.id || null,
      valor_venda: parseFloat(novaEncomenda.valor_venda) || 0,
      custo_encomenda: parseFloat(novaEncomenda.custo_encomenda) || 0,
      foi_comprada: false,
      foi_entregue: false,
      status: 'nao_comprada',
    });
  };

  const { data: encomendas = [], isLoading } = useQuery({
    queryKey: ['encomendas', unidadeAtual?.id],
    queryFn: () => unidadeAtual?.id
      ? base44.entities.Encomenda.filter({ unidade_id: unidadeAtual.id })
      : base44.entities.Encomenda.list(),
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Encomenda.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['encomendas']);
      toast.success('Encomenda atualizada!');
      setEditando(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Encomenda.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['encomendas']);
      toast.success('Encomenda excluída!');
      setDeleteId(null);
    },
  });

  const encomendasComStatus = useMemo(() => {
    return encomendas
      .map(enc => ({ ...enc, _status: calcularStatus(enc), _dias: diasSemAtualizacao(enc) }))
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [encomendas]);

  const encomendasFiltradas = useMemo(() => {
    return encomendasComStatus.filter(enc => {
      const matchSearch =
        String(enc.numero_os || '').includes(search) ||
        enc.nome_cliente?.toLowerCase().includes(search.toLowerCase()) ||
        enc.placa_veiculo?.toLowerCase().includes(search.toLowerCase()) ||
        enc.modelo_veiculo?.toLowerCase().includes(search.toLowerCase()) ||
        enc.peca?.toLowerCase().includes(search.toLowerCase());
      const matchFiltro = filtroStatus === 'todos' || enc._status === filtroStatus;
      return matchSearch && matchFiltro;
    });
  }, [encomendasComStatus, search, filtroStatus]);

  // Totais por status
  const totais = useMemo(() => {
    const t = {};
    FILTROS.forEach(f => { t[f.id] = 0; });
    encomendasComStatus.forEach(enc => {
      t['todos']++;
      t[enc._status] = (t[enc._status] || 0) + 1;
    });
    return t;
  }, [encomendasComStatus]);

  // Lucro total das entregues
  const lucroTotal = useMemo(() => {
    return encomendasComStatus
      .filter(e => e._status === 'entregue')
      .reduce((acc, e) => acc + ((e.valor_venda || 0) - (e.custo_encomenda || 0)), 0);
  }, [encomendasComStatus]);

  const marcarComprada = (enc) => {
    updateMutation.mutate({ id: enc.id, data: { foi_comprada: true, status: 'comprada_aguardando' } });
  };

  const marcarChegou = (enc) => {
    updateMutation.mutate({
      id: enc.id,
      data: { data_chegada: new Date().toISOString().split('T')[0], status: 'chegou_nao_avisado' },
    });
  };

  const marcarAvisado = (enc) => {
    const hoje = new Date().toISOString().split('T')[0];
    updateMutation.mutate({
      id: enc.id,
      data: { data_aviso_cliente: hoje, status: 'avisado_nao_entregue' },
    });
    // Enviar WhatsApp automático
    if (enc.telefone_cliente) {
      const tel = enc.telefone_cliente.replace(/\D/g, '');
      const msg = `Olá ${enc.nome_cliente || ''}! 🎉\n\nSua peça *${enc.peca}* chegou e está disponível para retirada.\n\n🚗 Veículo: ${enc.modelo_veiculo || ''} — ${enc.placa_veiculo || ''}\n\nAguardamos sua visita! 😊`;
      window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const marcarEntregue = (enc) => {
    updateMutation.mutate({ id: enc.id, data: { foi_entregue: true, status: 'entregue' } });
  };

  const abrirEdicao = (enc) => {
    setEditando({
      id: enc.id,
      peca: enc.peca || '',
      nome_cliente: enc.nome_cliente || '',
      telefone_cliente: enc.telefone_cliente || '',
      modelo_veiculo: enc.modelo_veiculo || '',
      ano_veiculo: enc.ano_veiculo || '',
      placa_veiculo: enc.placa_veiculo || '',
      valor_venda: enc.valor_venda || '',
      custo_encomenda: enc.custo_encomenda || '',
      data_chegada: enc.data_chegada || '',
      data_aviso_cliente: enc.data_aviso_cliente || '',
      foi_comprada: enc.foi_comprada || false,
      foi_entregue: enc.foi_entregue || false,
      observacoes: enc.observacoes || '',
    });
  };

  const salvarEdicao = () => {
    if (!editando) return;
    const { id, ...data } = editando;
    data.status = calcularStatus(data);
    updateMutation.mutate({ id, data });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <MenuAtendimento currentPath="ControleEncomendas" />

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-6 h-6 text-orange-500" />
                Controle de Encomendas
              </h1>
              <p className="text-slate-500">{encomendas.length} encomenda(s) registrada(s)</p>
            </div>
            <div className="flex items-center gap-3">
              {lucroTotal > 0 && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-green-700">Lucro Total (Entregues)</p>
                    <p className="font-bold text-green-700">R$ {lucroTotal.toFixed(2)}</p>
                  </div>
                </div>
              )}
              <Button onClick={() => setCriando(true)} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" /> Nova Encomenda
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-2 flex-wrap mb-4">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltroStatus(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filtroStatus === f.id
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
              }`}
            >
              {f.label} {totais[f.id] > 0 && <span className="ml-1 opacity-70">({totais[f.id]})</span>}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por OS, cliente, placa, veículo ou peça..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : encomendasFiltradas.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">Nenhuma encomenda encontrada</p>
              <p className="text-xs text-slate-400 mt-1">As encomendas são criadas automaticamente ao salvar um atendimento com peça sob encomenda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {encomendasFiltradas.map((enc) => {
              const cfg = STATUS_CONFIG[enc._status] || STATUS_CONFIG.nao_comprada;
              const Icon = cfg.icon;
              const atrasada = enc._status !== 'entregue' && enc._dias > 3;

              return (
                <Card key={enc.id} className={`transition-all border-2 ${atrasada ? 'border-amber-300 bg-amber-50/40' : 'border-transparent hover:border-orange-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Ícone + Status */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color.split(' ')[0]}`}>
                          <Icon className="w-5 h-5" style={{ color: 'currentColor' }} />
                        </div>
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {atrasada && (
                            <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
                              <AlertTriangle className="w-3 h-3" />
                              {enc._dias}d sem atualização
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dados principais */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {enc.numero_os && (
                            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              OS #{String(enc.numero_os).padStart(6, '0')}
                            </span>
                          )}
                          <span className="font-bold text-slate-800">{enc.peca}</span>
                        </div>
                        <p className="text-sm text-slate-600">
                          👤 {enc.nome_cliente} &nbsp;·&nbsp; 🚗 {enc.modelo_veiculo} {enc.ano_veiculo && `(${enc.ano_veiculo})`} {enc.placa_veiculo && `— ${enc.placa_veiculo}`}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                          {enc.valor_venda > 0 && (
                            <span className="text-green-700 font-semibold">Venda: R$ {enc.valor_venda.toFixed(2)}</span>
                          )}
                          {enc.custo_encomenda > 0 && (
                            <span className="text-red-600 font-semibold">Custo: R$ {enc.custo_encomenda.toFixed(2)}</span>
                          )}
                          {enc.valor_venda > 0 && enc.custo_encomenda > 0 && (
                            <span className={`font-bold ${enc.valor_venda - enc.custo_encomenda >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              Lucro: R$ {(enc.valor_venda - enc.custo_encomenda).toFixed(2)}
                            </span>
                          )}
                          {enc.data_chegada && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Chegou: {format(new Date(enc.data_chegada + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                          )}
                          {enc.data_aviso_cliente && (
                            <span className="flex items-center gap-1 text-purple-600"><Bell className="w-3 h-3" /> Avisado: {format(new Date(enc.data_aviso_cliente + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        {enc._status === 'nao_comprada' && (
                          <Button size="sm" onClick={() => marcarComprada(enc)} className="bg-yellow-500 hover:bg-yellow-600 text-white h-8 text-xs">
                            <ShoppingCart className="w-3 h-3 mr-1" /> Marcar Comprada
                          </Button>
                        )}
                        {enc._status === 'comprada_aguardando' && (
                          <Button size="sm" onClick={() => marcarChegou(enc)} className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs">
                            <Truck className="w-3 h-3 mr-1" /> Chegou
                          </Button>
                        )}
                        {enc._status === 'chegou_nao_avisado' && (
                          <Button size="sm" onClick={() => marcarAvisado(enc)} className="bg-purple-500 hover:bg-purple-600 text-white h-8 text-xs">
                            <MessageCircle className="w-3 h-3 mr-1" /> Avisar Cliente
                          </Button>
                        )}
                        {enc._status === 'avisado_nao_entregue' && (
                          <Button size="sm" onClick={() => marcarEntregue(enc)} className="bg-green-500 hover:bg-green-600 text-white h-8 text-xs">
                            <Gift className="w-3 h-3 mr-1" /> Marcar Entregue
                          </Button>
                        )}
                        {enc.telefone_cliente && enc._status !== 'nao_comprada' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => {
                              const tel = enc.telefone_cliente.replace(/\D/g, '');
                              window.open(`https://wa.me/55${tel}`, '_blank');
                            }}
                          >
                            <MessageCircle className="w-3 h-3 mr-1" /> WA
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => abrirEdicao(enc)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(enc.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nova Encomenda */}
      <Dialog open={criando} onOpenChange={(open) => !open && setCriando(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Encomenda Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Peça *</Label>
                <Input value={novaEncomenda.peca} onChange={e => setNovaEncomenda(p => ({ ...p, peca: e.target.value }))} placeholder="Ex: Trava elétrica 2 fios" autoFocus />
              </div>
              <div>
                <Label>Cliente *</Label>
                <Input value={novaEncomenda.nome_cliente} onChange={e => setNovaEncomenda(p => ({ ...p, nome_cliente: e.target.value }))} placeholder="Nome do cliente" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={novaEncomenda.telefone_cliente} onChange={e => setNovaEncomenda(p => ({ ...p, telefone_cliente: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Placa</Label>
                <Input value={novaEncomenda.placa_veiculo} onChange={e => setNovaEncomenda(p => ({ ...p, placa_veiculo: e.target.value }))} placeholder="ABC1234" />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={novaEncomenda.modelo_veiculo} onChange={e => setNovaEncomenda(p => ({ ...p, modelo_veiculo: e.target.value }))} placeholder="Ex: Gol" />
              </div>
              <div>
                <Label>Ano</Label>
                <Input value={novaEncomenda.ano_veiculo} onChange={e => setNovaEncomenda(p => ({ ...p, ano_veiculo: e.target.value }))} placeholder="2020" />
              </div>
              <div>
                <Label>Valor de Venda (R$)</Label>
                <Input type="number" step="0.01" value={novaEncomenda.valor_venda} onChange={e => setNovaEncomenda(p => ({ ...p, valor_venda: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label>Custo (R$)</Label>
                <Input type="number" step="0.01" value={novaEncomenda.custo_encomenda} onChange={e => setNovaEncomenda(p => ({ ...p, custo_encomenda: e.target.value }))} placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={novaEncomenda.observacoes} onChange={e => setNovaEncomenda(p => ({ ...p, observacoes: e.target.value }))} className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriando(false)}>Cancelar</Button>
            <Button onClick={salvarNova} disabled={createMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Encomenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edição */}
      <Dialog open={!!editando} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Encomenda</DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Peça *</Label>
                  <Input value={editando.peca} onChange={e => setEditando(p => ({ ...p, peca: e.target.value }))} />
                </div>
                <div>
                  <Label>Cliente *</Label>
                  <Input value={editando.nome_cliente} onChange={e => setEditando(p => ({ ...p, nome_cliente: e.target.value }))} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={editando.telefone_cliente} onChange={e => setEditando(p => ({ ...p, telefone_cliente: e.target.value }))} />
                </div>
                <div>
                  <Label>Placa</Label>
                  <Input value={editando.placa_veiculo} onChange={e => setEditando(p => ({ ...p, placa_veiculo: e.target.value }))} />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input value={editando.modelo_veiculo} onChange={e => setEditando(p => ({ ...p, modelo_veiculo: e.target.value }))} />
                </div>
                <div>
                  <Label>Ano</Label>
                  <Input value={editando.ano_veiculo} onChange={e => setEditando(p => ({ ...p, ano_veiculo: e.target.value }))} />
                </div>
                <div>
                  <Label>Valor de Venda (R$)</Label>
                  <Input type="number" step="0.01" value={editando.valor_venda} onChange={e => setEditando(p => ({ ...p, valor_venda: parseFloat(e.target.value) || '' }))} />
                </div>
                <div>
                  <Label>Custo (R$)</Label>
                  <Input type="number" step="0.01" value={editando.custo_encomenda} onChange={e => setEditando(p => ({ ...p, custo_encomenda: parseFloat(e.target.value) || '' }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de Chegada</Label>
                  <Input type="date" value={editando.data_chegada} onChange={e => setEditando(p => ({ ...p, data_chegada: e.target.value }))} />
                </div>
                <div>
                  <Label>Data Aviso Cliente</Label>
                  <Input type="date" value={editando.data_aviso_cliente} onChange={e => setEditando(p => ({ ...p, data_aviso_cliente: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editando.foi_comprada} onChange={e => setEditando(p => ({ ...p, foi_comprada: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">Foi comprada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editando.foi_entregue} onChange={e => setEditando(p => ({ ...p, foi_entregue: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">Foi entregue</span>
                </label>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={editando.observacoes} onChange={e => setEditando(p => ({ ...p, observacoes: e.target.value }))} className="min-h-[60px]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={updateMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir encomenda?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}