import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ClipboardCheck, 
  FileText, 
  Package, 
  Users, 
  Car,
  ArrowRight,
  Wrench,
  Shield,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon: Icon, title, description, href, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
  >
    <Link to={href}>
      <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-orange-200 h-full cursor-pointer">
        <CardContent className="p-6">
          <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
          <div className="flex items-center gap-2 mt-4 text-orange-600 font-medium text-sm group-hover:gap-3 transition-all">
            Acessar <ArrowRight className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

export default function Home() {
  const [periodo, setPeriodo] = useState('30');
  const [dataEspecifica, setDataEspecifica] = useState(null);

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => base44.entities.Atendimento.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const stats = useMemo(() => {
    const now = new Date();
    
    const atendimentosFiltrados = atendimentos.filter(a => {
      const dataAtendimento = new Date(a.created_date);
      
      if (periodo === 'hoje') {
        return dataAtendimento.toDateString() === now.toDateString();
      } else if (periodo === 'especifica' && dataEspecifica) {
        return dataAtendimento.toDateString() === dataEspecifica.toDateString();
      } else if (periodo === '0') {
        return true;
      } else {
        const diasFiltro = parseInt(periodo);
        const diffDias = Math.floor((now - dataAtendimento) / (1000 * 60 * 60 * 24));
        return diffDias <= diasFiltro;
      }
    });

    const totalOrcamentos = atendimentosFiltrados.length;
    
    let servicosAprovados = 0;
    let servicosReprovados = 0;
    let valorTotalAprovado = 0;
    
    atendimentosFiltrados.forEach(atendimento => {
      const todosItens = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])];
      todosItens.forEach(item => {
        if (item.status_aprovacao === 'aprovado') {
          servicosAprovados++;
          valorTotalAprovado += item.valor_total || 0;
        } else if (item.status_aprovacao === 'reprovado') {
          servicosReprovados++;
        }
      });
    });

    const concluidos = atendimentosFiltrados.filter(a => a.status === 'concluido').length;
    const emAndamento = atendimentosFiltrados.filter(a => 
      ['queixa_pendente', 'em_diagnostico', 'aguardando_aprovacao_checklist', 'em_execucao'].includes(a.status)
    ).length;

    return {
      totalOrcamentos,
      servicosAprovados,
      servicosReprovados,
      valorTotalAprovado,
      concluidos,
      emAndamento
    };
  }, [atendimentos, periodo, dataEspecifica]);

  const features = [
    {
      icon: ClipboardCheck,
      title: 'Novo Atendimento',
      description: 'Iniciar checklist técnico completo do veículo e gerar orçamento.',
      href: createPageUrl('NovoAtendimento'),
      color: 'bg-orange-500'
    },
    {
      icon: FileText,
      title: 'Atendimentos',
      description: 'Visualizar histórico de atendimentos e orçamentos gerados.',
      href: createPageUrl('Atendimentos'),
      color: 'bg-blue-500'
    },
    {
      icon: Package,
      title: 'Produtos e Serviços',
      description: 'Gerenciar catálogo de produtos e serviços disponíveis.',
      href: createPageUrl('Produtos'),
      color: 'bg-green-500'
    },
    {
      icon: Users,
      title: 'Clientes',
      description: 'Cadastro e histórico de clientes atendidos.',
      href: createPageUrl('Clientes'),
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center gap-8"
          >
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <img src="/logo.png" alt="Fraga Auto" className="w-12 h-12 rounded-xl object-cover" onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }} />
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center" style={{display: 'none'}}>
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <span className="text-orange-400 font-semibold tracking-wider text-sm">SISTEMA DE GESTÃO</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Fraga Auto Portas
              </h1>
              <p className="text-slate-300 text-lg md:text-xl max-w-xl">
                Sistema profissional de checklist técnico e geração de orçamentos para manutenção automotiva.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-8">
                <Link to={createPageUrl('NovoAtendimento')}>
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-6 text-base">
                    <ClipboardCheck className="w-5 h-5 mr-2" />
                    Novo Atendimento
                  </Button>
                </Link>
                <Link to={createPageUrl('Atendimentos')}>
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-6 text-base">
                    Ver Atendimentos
                  </Button>
                </Link>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="hidden md:flex items-center justify-center"
            >
              <div className="relative">
                <div className="w-64 h-64 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full absolute blur-3xl" />
                <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                  <Car className="w-32 h-32 text-orange-400" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
            Acesso Rápido
          </h2>
          <p className="text-slate-600">
            Selecione uma opção para começar
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={0.1 * index}
            />
          ))}
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Visão Geral</h2>
            <div className="flex items-center gap-3">
              <Select value={periodo} onValueChange={(value) => {
                setPeriodo(value);
                if (value !== 'especifica') setDataEspecifica(null);
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
                  <SelectItem value="0">Todo o período</SelectItem>
                  <SelectItem value="especifica">Data específica</SelectItem>
                </SelectContent>
              </Select>
              
              {periodo === 'especifica' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-48">
                      <Calendar className="w-4 h-4 mr-2" />
                      {dataEspecifica ? format(dataEspecifica, 'dd/MM/yyyy') : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dataEspecifica}
                      onSelect={setDataEspecifica}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Total de Orçamentos</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalOrcamentos}</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Serviços Aprovados</p>
                    <p className="text-3xl font-bold text-green-600">{stats.servicosAprovados}</p>
                  </div>
                  <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Serviços Reprovados</p>
                    <p className="text-3xl font-bold text-red-600">{stats.servicosReprovados}</p>
                  </div>
                  <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center">
                    <XCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Valor Aprovado</p>
                    <p className="text-2xl font-bold text-emerald-600">R$ {stats.valorTotalAprovado.toFixed(2)}</p>
                  </div>
                  <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Concluídos</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.concluidos}</p>
                  </div>
                  <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Em Andamento</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.emAndamento}</p>
                  </div>
                  <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}