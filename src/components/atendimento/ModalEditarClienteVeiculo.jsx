import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, User, Save, Loader2 } from 'lucide-react';

export default function ModalEditarClienteVeiculo({ atendimento, onSave, onClose, isLoading }) {
  const [dados, setDados] = useState({
    cliente_nome: atendimento.cliente_nome || '',
    cliente_telefone: atendimento.cliente_telefone || '',
    cliente_cpf: atendimento.cliente_cpf || '',
    placa: atendimento.placa || '',
    modelo: atendimento.modelo || '',
    marca: atendimento.marca || '',
    ano: atendimento.ano || '',
    km_atual: atendimento.km_atual || '',
  });

  const handleSave = () => {
    onSave({
      ...dados,
      placa: dados.placa.toUpperCase()
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Dados do Atendimento</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cliente">
          <TabsList className="w-full">
            <TabsTrigger value="cliente" className="flex-1">
              <User className="w-4 h-4 mr-2" /> Cliente
            </TabsTrigger>
            <TabsTrigger value="veiculo" className="flex-1">
              <Car className="w-4 h-4 mr-2" /> Veículo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cliente" className="space-y-4 pt-4">
            <div>
              <Label>Nome do Cliente</Label>
              <Input
                value={dados.cliente_nome}
                onChange={(e) => setDados(p => ({ ...p, cliente_nome: e.target.value }))}
                placeholder="Nome completo"
                className="h-11"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={dados.cliente_telefone}
                onChange={(e) => setDados(p => ({ ...p, cliente_telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="h-11"
              />
            </div>
          </TabsContent>

          <TabsContent value="veiculo" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Placa *</Label>
                <Input
                  value={dados.placa}
                  onChange={(e) => setDados(p => ({ ...p, placa: e.target.value.toUpperCase() }))}
                  placeholder="ABC-1234"
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label>KM Atual</Label>
                <Input
                  value={dados.km_atual}
                  onChange={(e) => setDados(p => ({ ...p, km_atual: e.target.value }))}
                  placeholder="50.000"
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Marca</Label>
                <Input
                  value={dados.marca}
                  onChange={(e) => setDados(p => ({ ...p, marca: e.target.value }))}
                  placeholder="Volkswagen"
                  className="h-11"
                />
              </div>
              <div>
                <Label>Modelo *</Label>
                <Input
                  value={dados.modelo}
                  onChange={(e) => setDados(p => ({ ...p, modelo: e.target.value }))}
                  placeholder="Gol"
                  className="h-11"
                />
              </div>
              <div>
                <Label>Ano</Label>
                <Input
                  value={dados.ano}
                  onChange={(e) => setDados(p => ({ ...p, ano: e.target.value }))}
                  placeholder="2020"
                  className="h-11"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading} className="flex-1 bg-orange-500 hover:bg-orange-600">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}