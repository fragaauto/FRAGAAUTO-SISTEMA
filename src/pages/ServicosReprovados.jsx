import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { 
  XCircle, 
  Calendar,
  Phone,
  Car,
  DollarSign,
  Loader2,
  FileText,
  MessageCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OrcamentoRemarketingModal from '../components/remarketing/OrcamentoRemarketingModal';

export default function ServicosReprovados() {
  const [periodo, setPeriodo] = useState('90');
  const [dataEspecifica, setDataEspecifica] = useState({ from: null, to: null });
  const [modalAberto, setModalAberto] = useState(false);
  const [atendimentoSelecionado, setAtendimentoSelecionado] = useState(null);

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['atendimentos-reprovados'],
    queryFn: () => base44.entities.Atendimento.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000
  });

  const config = configs[0] || {};

  const abrirModalRemarketing = (atendimento) => {
    setAtendimentoSelecionado(atendimento);
    setModalAberto(true);
  };

  const servicosReprovados = useMemo(() => {
    const now = new Date();
    
    const atendimentosFiltrados = atendimentos.filter(atendimento => {
      const dataAtendimento = new Date(atendimento.created_date);
      dataAtendimento.setHours(0, 0, 0, 0);
      
      // Filtro de período
      let dentroPerio = false;
      if (periodo === 'hoje') {
        dentroPerio = dataAtendimento.toDateString() === now.toDateString();
      } else if (periodo === 'especifica' && dataEspecifica.from) {
        const from = new Date(dataEspecifica.from);
        from.setHours(0, 0, 0, 0);
        
        if (dataEspecifica.to) {
          const to = new Date(dataEspecifica.to);
          to.setHours(23, 59, 59, 999);
          dentroPerio = dataAtendimento >= from && dataAtendimento <= to;
        } else {
          dentroPerio = dataAtendimento.toDateString() === from.toDateString();
        }
      } else if (periodo === '0') {
        dentroPerio = true;
      } else {
        const diasFiltro = parseInt(periodo);
        const diffDias = Math.floor((now - dataAtendimento) / (1000 * 60 * 60 * 24));
        dentroPerio = diffDias <= diasFiltro;
      }

      if (!dentroPerio) return false;

      // Verificar se tem itens reprovados
      const todosItens = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])];
      return todosItens.some(item => item.status_aprovacao === 'reprovado');
    });

    // Processar para extrair os serviços reprovados de cada atendimento
    return atendimentosFiltrados.map(atendimento => {
      const todosItens = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])];
      const itensReprovados = todosItens.filter(item => item.status_aprovacao === 'reprovado');
      const valorTotal = itensReprovados.reduce((acc, item) => acc + (item.valor_total || 0), 0);

      return {
        ...atendimento,
        itens_reprovados: itensReprovados,
        valor_total_reprovado: valorTotal,
        quantidade_reprovada: itensReprovados.length
      };
    }).sort((a, b) => b.valor_total_reprovado - a.valor_total_reprovado);
  }, [atendimentos, periodo, dataEspecifica]);

  const estatisticas = useMemo(() => {
    const totalClientes = new Set(servicosReprovados.map(s => s.cliente_id)).size;
    const totalServicos = servicosReprovados.reduce((acc, s) => acc + s.quantidade_reprovada, 0);
    const valorTotal = servicosReprovados.reduce((acc, s) => acc + s.valor_total_reprovado, 0);

    return { totalClientes, totalServicos, valorTotal };
  }, [servicosReprovados]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                Serviços Reprovados
              </h1>
              <p className="text-slate-500 mt-1">Oportunidades de remarketing e ofertas especiais</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={periodo} onValueChange={(value) => {
                setPeriodo(value);
                if (value !== 'especifica') setDataEspecifica({ from: null, to: null });
              }}>
                <SelectTrigger className="w-48">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="0">Todo o período</SelectItem>
                  <SelectItem value="especifica">Data específica</SelectItem>
                </SelectContent>
              </Select>
              
              {periodo === 'especifica' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-64">
                      <Calendar className="w-4 h-4 mr-2" />
                      {dataEspecifica.from ? (
                        dataEspecifica.to ? (
                          `${format(dataEspecifica.from, 'dd/MM/yyyy')} - ${format(dataEspecifica.to, 'dd/MM/yyyy')}`
                        ) : (
                          format(dataEspecifica.from, 'dd/MM/yyyy')
                        )
                      ) : (
                        'Selecionar período'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="range"
                      selected={dataEspecifica}
                      onSelect={(range) => setDataEspecifica(range || { from: null, to: null })}
                      initialFocus
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total de Clientes</p>
                  <p className="text-3xl font-bold text-slate-800">{estatisticas.totalClientes}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Serviços Recusados</p>
                  <p className="text-3xl font-bold text-red-600">{estatisticas.totalServicos}</p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Valor Potencial</p>
                  <p className="text-2xl font-bold text-green-600">R$ {estatisticas.valorTotal.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Atendimentos com Serviços Reprovados */}
        <div className="space-y-4">
          {servicosReprovados.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <XCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  Nenhum serviço reprovado encontrado
                </h3>
                <p className="text-slate-500">
                  Não há serviços recusados no período selecionado.
                </p>
              </CardContent>
            </Card>
          ) : (
            servicosReprovados.map((atendimento) => (
              <Card key={atendimento.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="w-5 h-5 text-orange-500" />
                        {atendimento.placa} - {atendimento.modelo}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {atendimento.cliente_nome}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(atendimento.created_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="destructive" className="bg-red-500">
                        {atendimento.quantidade_reprovada} {atendimento.quantidade_reprovada === 1 ? 'serviço' : 'serviços'}
                      </Badge>
                      <span className="text-lg font-bold text-red-600">
                        R$ {atendimento.valor_total_reprovado.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-slate-700 mb-2">Serviços Recusados:</h4>
                    {atendimento.itens_reprovados.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{item.nome}</p>
                          {item.observacao_cliente && (
                            <p className="text-sm text-slate-600 mt-1">
                              <span className="font-medium">Motivo:</span> {item.observacao_cliente}
                            </p>
                          )}
                          {item.desvantagens && (
                            <p className="text-sm text-red-600 mt-1">
                              ⚠️ {item.desvantagens}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-slate-800">
                            R$ {item.valor_total?.toFixed(2) || '0.00'}
                          </p>
                          {item.quantidade > 1 && (
                            <p className="text-xs text-slate-500">
                              {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t">
                    <Link to={createPageUrl('VerAtendimento') + '?id=' + atendimento.id}>
                      <Button variant="outline" className="w-full">
                        <FileText className="w-4 h-4 mr-2" />
                        Ver Completo
                      </Button>
                    </Link>
                    <Button
                      onClick={() => abrirModalRemarketing(atendimento)}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Enviar Oferta
                    </Button>
                    {atendimento.cliente_telefone && (
                      <a 
                        href={`https://wa.me/55${atendimento.cliente_telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="w-full bg-green-600 hover:bg-green-700">
                          <Phone className="w-4 h-4 mr-2" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {atendimentoSelecionado && (
        <OrcamentoRemarketingModal
          open={modalAberto}
          onOpenChange={setModalAberto}
          atendimento={atendimentoSelecionado}
          mensagemPersonalizada={config.mensagem_remarketing}
          nomeEmpresa={config.nome_empresa}
        />
      )}
    </div>
  );
}