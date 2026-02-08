import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Save } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";

export default function ModalCadastroProduto({ open, onClose, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: 'outros',
    valor: '',
    descricao: '',
    vantagens: '',
    desvantagens: '',
    aplicacao_universal: false,
    modelos_compativeis: ''
  });

  const handleSave = () => {
    if (!formData.codigo || !formData.nome || !formData.valor) return;
    onSave(formData);
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      categoria: 'outros',
      valor: '',
      descricao: '',
      vantagens: '',
      desvantagens: '',
      aplicacao_universal: false,
      modelos_compativeis: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500" />
            Cadastrar Novo Produto/Serviço
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código do Produto *</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ex: P001"
                className="h-12"
              />
            </div>
            <div>
              <Label>Nome do Produto/Serviço *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Troca de fechadura"
                className="h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
                className="h-12"
              />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eletrica">Elétrica</SelectItem>
                  <SelectItem value="portas">Portas</SelectItem>
                  <SelectItem value="acessorios">Acessórios</SelectItem>
                  <SelectItem value="estetica">Estética</SelectItem>
                  <SelectItem value="seguranca">Segurança</SelectItem>
                  <SelectItem value="vidros">Vidros</SelectItem>
                  <SelectItem value="limpeza">Limpeza</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição / Observações</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Detalhes técnicos, garantia, etc..."
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label>Vantagens de Realizar o Serviço</Label>
            <Textarea
              value={formData.vantagens}
              onChange={(e) => setFormData({ ...formData, vantagens: e.target.value })}
              placeholder="Por que o cliente deve fazer este serviço?"
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label>Riscos / Desvantagens de Não Realizar</Label>
            <Textarea
              value={formData.desvantagens}
              onChange={(e) => setFormData({ ...formData, desvantagens: e.target.value })}
              placeholder="O que pode acontecer se não fizer?"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Checkbox
                id="aplicacao-universal"
                checked={formData.aplicacao_universal}
                onCheckedChange={(checked) => setFormData({ ...formData, aplicacao_universal: checked })}
              />
              <label htmlFor="aplicacao-universal" className="font-medium cursor-pointer">
                Aplicação Universal (serve para todos os veículos)
              </label>
            </div>

            {!formData.aplicacao_universal && (
              <div>
                <Label>Modelos Compatíveis (separados por vírgula)</Label>
                <Input
                  value={formData.modelos_compativeis}
                  onChange={(e) => setFormData({ ...formData, modelos_compativeis: e.target.value })}
                  placeholder="Ex: Gol, Palio, Uno, Celta"
                  className="h-10"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite os modelos compatíveis separados por vírgula
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.codigo || !formData.nome || !formData.valor || isLoading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar e Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}