import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from 'lucide-react';

const CAMPOS = [
  { key: 'nome', label: 'Nome', placeholder: 'Nome completo', required_key: 'cliente_nome_obrigatorio' },
  { key: 'telefone', label: 'Telefone', placeholder: '(11) 99999-9999', required_key: 'cliente_telefone_obrigatorio' },
  { key: 'cpf_cnpj', label: 'CPF / CNPJ', placeholder: '000.000.000-00', required_key: 'cliente_cpf_obrigatorio' },
  { key: 'data_nascimento', label: 'Data de Nascimento', placeholder: 'DD/MM/AAAA', required_key: 'cliente_nascimento_obrigatorio', type: 'date' },
  { key: 'endereco', label: 'Endereço', placeholder: 'Rua, número, bairro, cidade', required_key: 'cliente_endereco_obrigatorio' },
];

export default function ModalCadastrarCliente({ open, onClose, onSave, loading, nomeInicial = '', configCampos = {} }) {
  const [form, setForm] = useState({
    nome: nomeInicial,
    telefone: '',
    cpf_cnpj: '',
    data_nascimento: '',
    endereco: ''
  });

  React.useEffect(() => {
    if (open) {
      setForm(prev => ({ ...prev, nome: nomeInicial }));
    }
  }, [open, nomeInicial]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validar obrigatórios
    for (const campo of CAMPOS) {
      if (configCampos[campo.required_key] && !form[campo.key]) {
        alert(`O campo "${campo.label}" é obrigatório.`);
        return;
      }
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-500" />
            Cadastrar Novo Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {CAMPOS.map(campo => {
            const isObrigatorio = configCampos[campo.required_key];
            return (
              <div key={campo.key}>
                <Label>
                  {campo.label}
                  {isObrigatorio && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  type={campo.type || 'text'}
                  placeholder={campo.placeholder}
                  value={form[campo.key]}
                  onChange={(e) => handleChange(campo.key, e.target.value)}
                  className="h-11"
                />
              </div>
            );
          })}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}