import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnidade } from '@/lib/UnidadeContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Loader2, Trash2, Printer, CheckCircle2, XCircle, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import MenuAtendimento from '@/components/atendimento/MenuAtendimento';
import OrcamentoForm from '@/components/orcamentos/OrcamentoForm';
import OrcamentoPrintModal from '@/components/orcamentos/OrcamentoPrintModal';

const UNIDADE_AUTO_PORTAS_ID = '69ea76b72f920804f5d68eab';

const STATUS_INFO = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-700' },
  convertido: { label: 'Convertido em OS', color: 'bg-blue-100 text-blue-700' },
};

export default function Orcamentos() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { unidadeAtual } = useUnidade();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [printOrcamento, setPrintOrcamento] = useState(null);

  const { data: orcamentosBrutos = [], isLoading } = useQuery({
    queryKey: ['orcamentos_avulsos'],
    queryFn: () => base44.entities.OrcamentoAvulso.list('-created_date', 500),
    staleTime: 2 * 60 * 1000,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000,
  });
  const config = configs[0] || {};

  const orcamentos = useMemo(() => {
    if (!unidadeAtual) return orcamentosBrutos;
    return orcamentosBrutos.filter(o => {
      if (o.unidade_id) return o.unidade_id === unidadeAtual.id;
      return unidadeAtual.id === UNIDADE_AUTO_PORTAS_ID;
    });
  }, [orcamentosBrutos, unidadeAtual]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OrcamentoAvulso.delete(id),
    onSuccess: () => { qc.invalidateQueries(['orcamentos_avulsos']); toast.success('Orçamento excluído!'); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.OrcamentoAvulso.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(['orcamentos_avulsos']),
  });

  const converterEmOS = async (orcamento) => {
    try {
      const user = await base44.auth.me();
      // Buscar próximo número OS
      const todos = await base44.entities.Atendimento.list('-numero_os', 1);
      const proximoNumero = (todos[0]?.numero_os || 0) + 1;

      const atendimento = await base44.entities.Atendimento.create({
        unidade_id: unidadeAtual?.id || null,
        numero_os: proximoNumero,
        cliente_nome: orcamento.cliente_nome,
        cliente_telefone: orcamento.cliente_telefone,
        cliente_cpf: orcamento.cliente_cpf,
        placa: orcamento.veiculo_placa,
        modelo: orcamento.veiculo_modelo,
        ano: orcamento.veiculo_ano,
        km_atual: orcamento.veiculo_km,
        data_entrada: new Date().toISOString(),
        status: 'rascunho',
        itens_orcamento: (orcamento.itens || []).map(i => ({
          ...i,
          status_aprovacao: 'pendente',
          status_servico: 'aguardando_autorizacao',
        })),
        subtotal: orcamento.subtotal || 0,
        desconto: orcamento.desconto || 0,
        valor_final: orcamento.total || 0,
        obs_interna: `Convertido do Orçamento #${orcamento.numero || orcamento.id.slice(0, 6)}`,
      });

      await base44.entities.OrcamentoAvulso.update(orcamento.id, {
        status: 'convertido',
        atendimento_id: atendimento.id,
      });

      qc.invalidateQueries(['orcamentos_avulsos']);
      toast.success('Orçamento convertido em OS com sucesso!');
      navigate(createPageUrl(`VerAtendimento?id=${atendimento.id}`));
    } catch (e) {
      toast.error('Erro ao converter orçamento');
    }
  };

  const filtrados = orcamentos.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.cliente_nome?.toLowerCase().includes(s) ||
      o.veiculo_placa?.toLowerCase().includes(s) ||
      o.veiculo_modelo?.toLowerCase().includes(s) ||
      String(o.numero || '').includes(s);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <MenuAtendimento currentPath="Orcamentos" />

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Orçamentos</h1>
              <p className="text-slate-500">{filtrados.length} orçamentos</p>
            </div>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => { setEditando(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, placa, modelo ou número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : filtrados.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Nenhum orçamento encontrado</p>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Criar Orçamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtrados.map(o => {
              const si = STATUS_INFO[o.status] || STATUS_INFO.pendente;
              return (
                <Card key={o.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {o.numero && (
                            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              ORC #{String(o.numero).padStart(4, '0')}
                            </span>
                          )}
                          <span className="font-bold text-slate-800">{o.cliente_nome}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${si.color}`}>{si.label}</span>
                        </div>
                        {(o.veiculo_placa || o.veiculo_modelo) && (
                          <p className="text-sm text-slate-600">
                            {o.veiculo_placa} {o.veiculo_modelo && `• ${o.veiculo_modelo}`} {o.veiculo_ano && `• ${o.veiculo_ano}`}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          {o.itens?.length || 0} item(ns) · {format(new Date(o.created_date), "dd/MM/yyyy", { locale: ptBR })}
                          {o.validade_dias && ` · Válido por ${o.validade_dias} dias`}
                        </p>

                        {/* Ações */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPrintOrcamento(o)}>
                            <Printer className="w-3 h-3" /> Imprimir
                          </Button>
                          {o.status === 'pendente' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-slate-200" onClick={() => { setEditando(o); setShowForm(true); }}>
                                Editar
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50" onClick={() => updateStatusMutation.mutate({ id: o.id, status: 'aprovado' })}>
                                <CheckCircle2 className="w-3 h-3" /> Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => updateStatusMutation.mutate({ id: o.id, status: 'reprovado' })}>
                                <XCircle className="w-3 h-3" /> Reprovar
                              </Button>
                            </>
                          )}
                          {(o.status === 'pendente' || o.status === 'aprovado') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="h-7 text-xs gap-1 bg-orange-500 hover:bg-orange-600 text-white">
                                  <ClipboardList className="w-3 h-3" /> Converter em OS
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Converter em Ordem de Serviço?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Um novo atendimento (OS) será criado com os dados e itens deste orçamento.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction className="bg-orange-500 hover:bg-orange-600" onClick={() => converterEmOS(o)}>
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-600 gap-1">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(o.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-green-700 text-lg">
                          R$ {(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {o.desconto > 0 && (
                          <p className="text-xs text-red-500">- R$ {o.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} desc.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <OrcamentoForm
          orcamento={editando}
          unidadeAtual={unidadeAtual}
          config={config}
          onClose={() => { setShowForm(false); setEditando(null); }}
          onSaved={() => { setShowForm(false); setEditando(null); qc.invalidateQueries(['orcamentos_avulsos']); }}
        />
      )}

      {printOrcamento && (
        <OrcamentoPrintModal
          orcamento={printOrcamento}
          config={config}
          onClose={() => setPrintOrcamento(null)}
        />
      )}
    </div>
  );
}