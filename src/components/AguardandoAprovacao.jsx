import React from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, LogOut, Wrench } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function AguardandoAprovacao({ user }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-orange-500" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-lg">Fraga Auto</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">Aguardando Aprovação</h1>
        <p className="text-slate-600 mb-2">
          Olá, <strong>{user?.full_name || user?.email}</strong>!
        </p>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Sua conta foi criada com sucesso, mas ainda precisa ser aprovada por um administrador do sistema.
          Você receberá acesso assim que um administrador aprovar seu cadastro.
        </p>
        <Button
          variant="outline"
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-2 mx-auto"
        >
          <LogOut className="w-4 h-4" />
          Sair e usar outra conta
        </Button>
      </div>
    </div>
  );
}