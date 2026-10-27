import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function FormMetaCategoria({ aberto, meta, categorias = [], unidadeId, onFechar }) {
  const queryClient = useQueryClient();
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setCategoria(meta?.categoria || '');
    setValor(meta?.meta_mes ? String(meta.meta_mes) : '');
  }, [aberto, meta]);

  const salvar = async () => {
    if (!categoria.trim()) {
      toast.error('Selecione a categoria');
      return;
    }
    if (!(Number(valor) > 0)) {
      toast.error('Informe o valor da meta');
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        categoria: categoria.trim(),
        meta_mes: Number(valor),
        ativa: true,
        unidade_id: unidadeId,
      };
      if (meta?.id) {
        await base44.entities.MetaCategoria.update(meta.id, payload);
      } else {
        await base44.entities.MetaCategoria.create(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['metas_categoria'] });
      toast.success('Meta por categoria salva!');
      onFechar();
    } catch (e) {
      toast.error('Erro ao salvar meta: ' + (e.message || e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            {meta?.id ? 'Editar meta da categoria' : 'Nova meta por categoria'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Meta mensal (R$)</Label>
            <Input
              type="number"
              min="0"
              placeholder="Ex: 15000"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando} className="bg-blue-600 hover:bg-blue-700">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar meta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}