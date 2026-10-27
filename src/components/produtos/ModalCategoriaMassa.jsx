import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tags, Loader2, Check } from 'lucide-react';

export default function ModalCategoriaMassa({ open, onOpenChange, quantidade, categorias, onConfirm, salvando }) {
  const [categoria, setCategoria] = useState('');

  const fechar = () => {
    setCategoria('');
    onOpenChange(false);
  };

  const confirmar = () => {
    const nome = categoria.trim();
    if (!nome) return;
    onConfirm(nome);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setCategoria('');
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-orange-500" />
            Adicionar à categoria
          </DialogTitle>
          <DialogDescription>
            {quantidade} produto(s) selecionado(s) serão movidos para a categoria escolhida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="categoria-massa">Nova categoria ou existente</Label>
            <Input
              id="categoria-massa"
              autoFocus
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmar()}
              placeholder="Digite o nome da categoria"
              disabled={salvando}
            />
            <p className="text-xs text-slate-500 mt-1">Digite um nome novo para criar a categoria.</p>
          </div>

          {categorias.length > 0 && (
            <div>
              <Label className="text-xs text-slate-500">Categorias existentes</Label>
              <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto">
                {categorias.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategoria(c.value)}
                    disabled={salvando}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      categoria === c.value
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={fechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={salvando || !categoria.trim()}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Aplicar a {quantidade}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}