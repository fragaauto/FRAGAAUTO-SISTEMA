import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Tags } from 'lucide-react';

export default function ModalCategoriaProduto({ open, onOpenChange, categoria, onSalvar, salvando }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (open) {
      setNome(categoria?.nome || '');
      setDescricao(categoria?.descricao || '');
    }
  }, [open, categoria]);

  const salvar = () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    onSalvar({ nome: nomeLimpo, descricao: descricao.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-orange-500" />
            {categoria ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="nome-categoria">Nome *</Label>
            <Input
              id="nome-categoria"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && salvar()}
              placeholder="Ex: Retrovisores"
              disabled={salvando}
              className="h-11"
            />
            {categoria && (
              <p className="text-xs text-slate-500 mt-1">
                Ao renomear, os produtos desta categoria serão atualizados automaticamente.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="descricao-categoria">Descrição</Label>
            <Textarea
              id="descricao-categoria"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que entra nesta categoria (opcional)"
              className="min-h-[70px]"
              disabled={salvando}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={salvando || !nome.trim()}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}