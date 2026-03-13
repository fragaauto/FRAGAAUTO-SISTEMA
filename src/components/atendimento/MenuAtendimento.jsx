import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, Clock, XCircle, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const ABAS_CONFIG = [
  { id: 'lista', nome: 'Lista de OS', path: 'Atendimentos', icon: FileText },
  { id: 'novo', nome: 'Nova OS', path: 'NovoAtendimento', icon: Plus },
  { id: 'aprovacoes', nome: 'Aprovações Pendentes', path: 'Dashboard', icon: Clock },
  { id: 'reprovados', nome: 'Serviços Reprovados', path: 'ServicosReprovados', icon: XCircle },
  { id: 'vendas_diretas', nome: 'Vendas Diretas', path: 'Atendimentos?venda_direta=true', icon: ShoppingBag }
];

export default function MenuAtendimento({ currentPath }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.FuncaoFuncionario.list(),
    enabled: !!user && user?.role !== 'admin',
  });

  // Admin vê todas as abas
  if (user?.role === 'admin') {
    return (
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {ABAS_CONFIG.map(aba => {
              const isActive = currentPath === aba.path;
              const Icon = aba.icon;
              return (
                <Link
                  key={aba.id}
                  to={createPageUrl(aba.path)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                    isActive
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {aba.nome}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Obter abas permitidas pela função
  const funcao = user?.funcao_id ? funcoes.find(f => f.id === user.funcao_id) : null;
  const abasPermitidas = funcao?.abas_atendimento || ['lista', 'novo'];

  const abasFiltradas = ABAS_CONFIG.filter(aba => abasPermitidas.includes(aba.id));

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto">
          {abasFiltradas.map(aba => {
            const isActive = currentPath === aba.path;
            const Icon = aba.icon;
            return (
              <Link
                key={aba.id}
                to={createPageUrl(aba.path)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                  isActive
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {aba.nome}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}