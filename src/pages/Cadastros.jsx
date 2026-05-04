import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Truck, UserCog, ShieldCheck } from 'lucide-react';
import ClientesTab from '@/components/cadastros/ClientesTab';
import FornecedoresTab from '@/components/cadastros/FornecedoresTab';
import FuncionariosTab from '@/components/cadastros/FuncionariosTab';
import UsuariosTab from '@/components/cadastros/UsuariosTab';

export default function Cadastros() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-800">Cadastros</h1>
          <p className="text-slate-500">Gerencie clientes, fornecedores e funcionários</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="clientes">
          <TabsList className="mb-6">
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Clientes
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="flex items-center gap-2">
              <Truck className="w-4 h-4" /> Fornecedores
            </TabsTrigger>
            <TabsTrigger value="funcionarios" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" /> Funcionários
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes">
            <ClientesTab />
          </TabsContent>
          <TabsContent value="fornecedores">
            <FornecedoresTab />
          </TabsContent>
          <TabsContent value="funcionarios">
            <FuncionariosTab />
          </TabsContent>
          <TabsContent value="usuarios">
            <UsuariosTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}