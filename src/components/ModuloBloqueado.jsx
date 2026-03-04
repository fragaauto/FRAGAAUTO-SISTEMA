import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ModuloBloqueado({ nomeModulo }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Módulo não disponível</h2>
        <p className="text-slate-500 text-sm mb-6">
          O módulo <strong>{nomeModulo}</strong> não está habilitado nesta instalação.
          Entre em contato com o administrador do sistema para ativar esta funcionalidade.
        </p>
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="outline">← Voltar ao Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}