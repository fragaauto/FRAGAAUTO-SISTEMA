import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User, Plus, Phone, Loader2 } from 'lucide-react';

export default function BuscarClienteModal({ clientes, onSelect, onCreate, onClose, isCreating }) {
  const [busca, setBusca] = useState('');
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', cpf_cnpj: '', email: '' });

  const clientesFiltrados = clientes.filter(c => {
    const q = busca.toLowerCase();
    return c.nome?.toLowerCase().includes(q) || c.telefone?.includes(q) || c.cpf_cnpj?.replace(/\D/g, '').includes(busca.replace(/\D/g, ''));
  });

  const handleCriar = () => {
    if (!novoCliente.nome || !novoCliente.telefone) return;
    onCreate(novoCliente);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cliente</DialogTitle>
          <DialogDescription>Busque um cliente cadastrado ou cadastre um novo</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="buscar">
          <TabsList className="w-full">
            <TabsTrigger value="buscar" className="flex-1">
              <Search className="w-4 h-4 mr-2" /> Buscar Existente
            </TabsTrigger>
            <TabsTrigger value="novo" className="flex-1">
              <Plus className="w-4 h-4 mr-2" /> Cadastrar Novo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buscar" className="space-y-3 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 border rounded-lg">
              {clientesFiltrados.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-sm">
                  {busca ? 'Nenhum cliente encontrado' : 'Digite para buscar clientes'}
                </p>
              ) : (
                clientesFiltrados.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{c.nome}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {c.telefone}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="novo" className="space-y-4 pt-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={novoCliente.nome}
                onChange={(e) => setNovoCliente(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome completo"
                className="h-11"
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={novoCliente.telefone}
                onChange={(e) => setNovoCliente(p => ({ ...p, telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="h-11"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={novoCliente.email}
                onChange={(e) => setNovoCliente(p => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
                className="h-11"
              />
            </div>

            <Button
              onClick={handleCriar}
              disabled={!novoCliente.nome || !novoCliente.telefone || isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Cadastrar e Selecionar
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}