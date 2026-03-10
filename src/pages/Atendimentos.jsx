import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Search, 
  Car, 
  Calendar,
  ArrowRight,
  FileText,
  Loader2,
  Filter,
  CheckSquare,
  ChevronDown,
  Tag,
  Trash2,
  Lock,
  RotateCcw,
  Printer,
  MessageCircle,
  CheckCircle2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Paginacao from '@/components/ui/Paginacao';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReciboAtendimento from '@/components/financeiro/ReciboAtendimento';
import { FileCheck } from 'lucide-react';

const STATUS_FIXOS = {
  rascunho: { label: 'Rascunho', cor: '#94a3b8' },
  queixa_pendente: { label: 'Queixa Pendente', cor: '#f59e0b' },
  queixa_aprovada: { label: 'Queixa Aprovada', cor: '#3b82f6' },
  queixa_reprovada: { label: 'Queixa Reprovada', cor: '#ef4444' },
  em_diagnostico: { label: 'Em Diagnóstico', cor: '#f97316' },
  aguardando_aprovacao_checklist: { label: 'Aguardando Aprovação', cor: '#f59e0b' },
  checklist_aprovado: { label: 'Checklist Aprovado', cor: '#10b981' },
  checklist_reprovado: { label: 'Checklist Reprovado', cor: '#ef4444' },
  em_execucao: { label: 'Em Execução', cor: '#8b5cf6' },
  concluido: { label: 'Concluído', cor: '#10b981' },
  cancelado: { label: 'Cancelado', cor: '#64748b' }
};

function getStatusInfo(statusValue, statusPersonalizados = []) {
  if (STATUS_FIXOS[statusValue]) return STATUS_FIXOS[statusValue];
  const custom = statusPersonalizados.find(s => s.valor === statusValue);
  if (custom) return { label: custom.label, cor: custom.cor };
  return { label: statusValue, cor: '#64748b' };
}

function StatusBadge({ statusValue, statusPersonalizados }) {
  const info = getStatusInfo(statusValue, statusPersonalizados);
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
      style={{ background: info.cor }}
    >
      {info.label}
    </span>
  );
}

function StatusSelect({ value, onChange, statusPersonalizados, onClick }) {
  const todosStatus = [
    ...Object.entries(STATUS_FIXOS).map(([valor, s]) => ({ valor, label: s.label, cor: s.cor })),
    ...(statusPersonalizados || [])
  ];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-7 text-xs border-slate-200 bg-white w-40"
        onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {todosStatus.map(s => (
          <SelectItem key={s.valor} value={s.valor}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.cor }} />
              {s.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Atendimentos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selecionados, setSelecionados] = useState([]);
  const [statusEmMassa, setStatusEmMassa] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => base44.entities.Atendimento.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000
  });

  const config = configs[0] || {};
  const statusPersonalizados = config.status_atendimento_personalizados || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Atendimento.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['atendimentos'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Atendimento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['atendimentos']);
      toast.success('Atendimento excluído!');
    }
  });

  const handleExcluirEmMassa = async () => {
    await Promise.all(selecionados.map(id => deleteMutation.mutateAsync(id)));
    toast.success(`${selecionados.length} atendimento(s) excluído(s)!`);
    setSelecionados([]);
  };

  const filteredAtendimentos = atendimentos.filter(a => {
    const matchSearch = 
      a.placa?.toLowerCase().includes(search.toLowerCase()) ||
      a.modelo?.toLowerCase().includes(search.toLowerCase()) ||
      a.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
      (a.numero_os && String(a.numero_os).includes(search));
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;

    const dataAtendimento = a.data_entrada ? new Date(a.data_entrada) : new Date(a.created_date);
    const matchDataInicio = !dataInicio || dataAtendimento >= new Date(dataInicio + 'T00:00:00');
    const matchDataFim = !dataFim || dataAtendimento <= new Date(dataFim + 'T23:59:59');

    return matchSearch && matchStatus && matchDataInicio && matchDataFim;
  });

  const totalPaginas = Math.ceil(filteredAtendimentos.length / POR_PAGINA);
  const atendimentosPaginados = filteredAtendimentos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const todosStatusOpcoes = [
    ...Object.entries(STATUS_FIXOS).map(([valor, s]) => ({ valor, label: s.label, cor: s.cor })),
    ...statusPersonalizados
  ];

  // Checkboxes
  const todosSelecionados = filteredAtendimentos.length > 0 && filteredAtendimentos.every(a => selecionados.includes(a.id));
  const algunsSelecionados = selecionados.length > 0 && !todosSelecionados;

  const toggleSelecionado = (id, e) => {
    e.stopPropagation();
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleTodos = () => {
    if (todosSelecionados) {
      setSelecionados([]);
    } else {
      setSelecionados(filteredAtendimentos.map(a => a.id));
    }
  };

  const handleAlterarStatusEmMassa = async () => {
    if (!statusEmMassa || selecionados.length === 0) return;
    await Promise.all(selecionados.map(id => updateStatusMutation.mutateAsync({ id, status: statusEmMassa })));
    toast.success(`Status de ${selecionados.length} atendimento(s) atualizado!`);
    setSelecionados([]);
    setStatusEmMassa('');
  };

  const handleAlterarStatusIndividual = async (id, novoStatus, statusAtual) => {
    if (novoStatus === statusAtual) return;
    await updateStatusMutation.mutateAsync({ id, status: novoStatus });
    toast.success('Status atualizado!');
  };

  const estornarPagamento = async (atendimento, e) => {
    e.stopPropagation();
    const lancamentos = await base44.entities.LancamentoFinanceiro.filter({ atendimento_id: atendimento.id });
    for (const lanc of lancamentos) {
      if (!lanc.estornado) {
        await base44.entities.LancamentoFinanceiro.update(lanc.id, { estornado: true });
        await base44.entities.LancamentoFinanceiro.create({
          tipo: 'saida',
          descricao: `ESTORNO - ${lanc.descricao}`,
          valor: lanc.valor,
          forma_pagamento: lanc.forma_pagamento,
          atendimento_id: atendimento.id,
          data_lancamento: new Date().toISOString(),
          categoria: 'estorno',
          estornado: false,
        });
      }
    }
    // Reverter movimentos de estoque
    const movimentos = await base44.entities.MovimentoEstoque.filter({ atendimento_id: atendimento.id });
    for (const mov of movimentos) {
      if (mov.tipo === 'saida') {
        const prod = await base44.entities.Produto.get(mov.produto_id).catch(() => null);
        if (prod?.controla_estoque) {
          await base44.entities.Produto.update(mov.produto_id, { estoque_atual: (prod.estoque_atual || 0) + (mov.quantidade || 0) });
        }
      }
    }
    await base44.entities.Atendimento.update(atendimento.id, { status_pagamento: null, data_pagamento: null, usuario_pagamento: null });
    queryClient.invalidateQueries(['atendimentos']);
    toast.success('Estorno realizado! Atendimento reaberto.');
  };

  const imprimirAtendimento = (atendimento, e) => {
    e.stopPropagation();
    navigate(createPageUrl(`VerAtendimento?id=${atendimento.id}`));
  };

  const enviarWhatsApp = (atendimento, e) => {
    e.stopPropagation();
    const telefone = atendimento.cliente_telefone?.replace(/\D/g, '');
    if (!telefone) { toast.error('Cliente sem telefone cadastrado'); return; }
    const msg = `*Olá ${atendimento.cliente_nome || ''}!*\n\nSeu atendimento foi *finalizado* com sucesso! ✅\n\n🚗 *Veículo:* ${atendimento.placa} - ${atendimento.modelo}\n💰 *Valor:* R$ ${atendimento.valor_final_pago?.toFixed(2) || atendimento.valor_final?.toFixed(2) || '0.00'}\n\nObrigado pela preferência! 🙏`;
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Atendimentos</h1>
              <p className="text-slate-500">{atendimentos.length} registros</p>
            </div>
            <Link to={createPageUrl('NovoAtendimento')}>
              <Button className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Novo Atendimento
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por placa, modelo, cliente ou Nº OS..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagina(1); }}
              className="pl-10 h-12"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagina(1); }}>
            <SelectTrigger className="w-full sm:w-56 h-12">
              <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {todosStatusOpcoes.map(s => (
                <SelectItem key={s.valor} value={s.valor}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.cor }} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por data */}
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-10 text-sm"
              placeholder="Data inicial"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-slate-400 text-sm flex-shrink-0">até</span>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" className="h-10 text-slate-500 px-2" onClick={() => { setDataInicio(''); setDataFim(''); }}>
              Limpar
            </Button>
          )}
        </div>

        {/* Barra de ação em massa */}
        {filteredAtendimentos.length > 0 && (
          <div className="flex items-center gap-3 mt-3 py-2 px-3 bg-white rounded-lg border border-slate-200">
            <Checkbox
              checked={todosSelecionados}
              onCheckedChange={toggleTodos}
              className={algunsSelecionados ? 'data-[state=unchecked]:bg-slate-200' : ''}
            />
            <span className="text-sm text-slate-600">
              {selecionados.length > 0 ? `${selecionados.length} selecionado(s)` : 'Selecionar todos'}
            </span>

            {selecionados.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <Select value={statusEmMassa} onValueChange={setStatusEmMassa}>
                  <SelectTrigger className="h-8 text-sm w-48">
                    <SelectValue placeholder="Alterar status para..." />
                  </SelectTrigger>
                  <SelectContent>
                    {todosStatusOpcoes.map(s => (
                      <SelectItem key={s.valor} value={s.valor}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: s.cor }} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleAlterarStatusEmMassa}
                  disabled={!statusEmMassa || updateStatusMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 h-8"
                >
                  {updateStatusMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Aplicar'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="h-8">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir atendimentos?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você está prestes a excluir {selecionados.length} atendimento(s). Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleExcluirEmMassa}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-slate-500"
                  onClick={() => setSelecionados([])}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredAtendimentos.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Nenhum atendimento encontrado</p>
              <Link to={createPageUrl('NovoAtendimento')}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Atendimento
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
          <div className="space-y-3">
            {atendimentosPaginados.map((atendimento, index) => {
              const isSelecionado = selecionados.includes(atendimento.id);
              const pago = !!atendimento.status_pagamento && atendimento.status_pagamento !== null;
              return (
                <motion.div
                  key={atendimento.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className={`transition-all border-2 ${
                      pago
                        ? 'border-green-200 bg-green-50/60'
                        : isSelecionado
                        ? 'border-orange-300 bg-orange-50'
                        : 'hover:shadow-lg hover:border-orange-200 cursor-pointer'
                    }`}
                    onClick={() => !isSelecionado && !pago && navigate(createPageUrl(`VerAtendimento?id=${atendimento.id}`))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        {!pago && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelecionado}
                              onCheckedChange={(checked) => {
                                setSelecionados(prev => checked ? [...prev, atendimento.id] : prev.filter(x => x !== atendimento.id));
                              }}
                            />
                          </div>
                        )}

                        {/* Ícone */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pago ? 'bg-green-100' : 'bg-slate-100'}`}>
                          {pago ? <Lock className="w-5 h-5 text-green-600" /> : <Car className="w-5 h-5 text-slate-600" />}
                        </div>

                        {/* Dados */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            {atendimento.numero_os && (
                              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                OS #{String(atendimento.numero_os).padStart(6, '0')}
                              </span>
                            )}
                            <h3 className="font-bold text-slate-800">{atendimento.placa}</h3>
                            <StatusBadge statusValue={atendimento.status} statusPersonalizados={statusPersonalizados} />
                            {pago && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-600 text-white">
                                <CheckCircle2 className="w-3 h-3" /> Pago
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 truncate">
                            {atendimento.marca} {atendimento.modelo} {atendimento.ano && `• ${atendimento.ano}`}
                          </p>
                          {atendimento.cliente_nome && (
                            <p className="text-xs text-slate-500">{atendimento.cliente_nome}</p>
                          )}

                          {/* Status select — apenas se não pago */}
                          {!pago && (
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                              <StatusSelect
                                value={atendimento.status}
                                onChange={(novoStatus) => handleAlterarStatusIndividual(atendimento.id, novoStatus, atendimento.status)}
                                statusPersonalizados={statusPersonalizados}
                              />
                            </div>
                          )}

                          {/* Ações para atendimento pago */}
                          {pago && (
                            <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 px-2">
                                    <RotateCcw className="w-3 h-3 mr-1" /> Estornar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar estorno?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Todos os lançamentos financeiros serão estornados e o estoque revertido. O atendimento será reaberto para edição.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={(e) => estornarPagamento(atendimento, e)}>
                                      Confirmar Estorno
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={(e) => imprimirAtendimento(atendimento, e)}>
                                <Printer className="w-3 h-3 mr-1" /> Imprimir
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50 px-2" onClick={(e) => enviarWhatsApp(atendimento, e)}>
                                <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Valor e data */}
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold text-sm ${pago ? 'text-green-700' : 'text-green-600'}`}>
                            R$ {(pago ? atendimento.valor_final_pago : atendimento.valor_final)?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                            <Calendar className="w-3 h-3" />
                            {atendimento.data_entrada
                              ? format(new Date(atendimento.data_entrada), "dd/MM/yyyy", { locale: ptBR })
                              : format(new Date(atendimento.created_date), "dd/MM/yyyy", { locale: ptBR })
                            }
                          </p>
                          {pago && atendimento.data_pagamento && (
                            <p className="text-xs text-green-600 font-medium mt-0.5">
                              Pago: {format(new Date(atendimento.data_pagamento), "dd/MM", { locale: ptBR })}
                            </p>
                          )}
                          {atendimento.numero_os && (
                            <p className="text-xs font-mono text-slate-400 mt-0.5">
                              #{String(atendimento.numero_os).padStart(6, '0')}
                            </p>
                          )}
                        </div>

                        {!pago && (
                          <ArrowRight
                            className="w-5 h-5 text-slate-400 flex-shrink-0 hidden sm:block"
                            onClick={() => navigate(createPageUrl(`VerAtendimento?id=${atendimento.id}`))}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <Paginacao
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onMudar={(p) => { setPagina(p); window.scrollTo(0, 0); }}
            totalRegistros={filteredAtendimentos.length}
            porPagina={POR_PAGINA}
          />
          </>
        )}
      </div>
    </div>
  );
}