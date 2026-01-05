import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Car, 
  Calendar,
  ArrowRight,
  FileText,
  Loader2,
  Filter
} from 'lucide-react';
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

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  queixa_pendente: { label: 'Queixa Pendente', color: 'bg-yellow-100 text-yellow-800' },
  queixa_aprovada: { label: 'Queixa Aprovada', color: 'bg-blue-100 text-blue-800' },
  queixa_reprovada: { label: 'Queixa Reprovada', color: 'bg-red-100 text-red-800' },
  em_diagnostico: { label: 'Em Diagnóstico', color: 'bg-orange-100 text-orange-800' },
  aguardando_aprovacao_checklist: { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-800' },
  checklist_aprovado: { label: 'Checklist Aprovado', color: 'bg-green-100 text-green-800' },
  checklist_reprovado: { label: 'Checklist Reprovado', color: 'bg-red-100 text-red-800' },
  em_execucao: { label: 'Em Execução', color: 'bg-purple-100 text-purple-800' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-800' }
};

export default function Atendimentos() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => base44.entities.Atendimento.list('-created_date'),
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000
  });

  const filteredAtendimentos = atendimentos.filter(a => {
    const matchSearch = 
      a.placa?.toLowerCase().includes(search.toLowerCase()) ||
      a.modelo?.toLowerCase().includes(search.toLowerCase()) ||
      a.cliente_nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
              placeholder="Buscar por placa, modelo ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="queixa_pendente">Queixa Pendente</SelectItem>
              <SelectItem value="em_diagnostico">Em Diagnóstico</SelectItem>
              <SelectItem value="aguardando_aprovacao_checklist">Aguardando Aprovação</SelectItem>
              <SelectItem value="checklist_aprovado">Checklist Aprovado</SelectItem>
              <SelectItem value="em_execucao">Em Execução</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          <div className="space-y-3">
            {filteredAtendimentos.map((atendimento, index) => (
              <motion.div
                key={atendimento.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-orange-200"
                  onClick={() => navigate(createPageUrl(`VerAtendimento?id=${atendimento.id}`))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Car className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">{atendimento.placa}</h3>
                            <Badge className={STATUS_CONFIG[atendimento.status]?.color || 'bg-gray-100'}>
                              {STATUS_CONFIG[atendimento.status]?.label || atendimento.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {atendimento.marca} {atendimento.modelo} {atendimento.ano && `• ${atendimento.ano}`}
                          </p>
                          {atendimento.cliente_nome && (
                            <p className="text-sm text-slate-500">{atendimento.cliente_nome}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="font-bold text-green-600">
                            R$ {atendimento.valor_final?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {atendimento.data_entrada 
                              ? format(new Date(atendimento.data_entrada), "dd/MM/yyyy", { locale: ptBR })
                              : format(new Date(atendimento.created_date), "dd/MM/yyyy", { locale: ptBR })
                            }
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}