import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, PackagePlus } from 'lucide-react';
import { useUnidade } from '@/lib/UnidadeContext';

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

export default function ModalNovoProdutoNota({ open, item, fornecedor, produtos = [], onClose, onCriado }) {
  const qc = useQueryClient();
  const { unidadeAtual } = useUnidade();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: '', codigo: '', categoria: 'outros', valor: '', localizacao_estoque: '' });

  useEffect(() => {
    if (!open || !item) return;
    setForm({
      nome: item.descricao || '',
      codigo: item.codigo || '',
      categoria: 'outros',
      valor: '',
      localizacao_estoque: '',
    });
  }, [open, item]);

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias-produto'],
    queryFn: () => base44.entities.CategoriaProduto.list(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const codigoDuplicado = (produtos || []).some(
    (p) => String(p.codigo || '').trim().toLowerCase() === form.codigo.trim().toLowerCase()
  );

  const salvar = async () => {
    if (!form.nome.trim() || !form.codigo.trim()) {
      toast.error('Informe o nome e o código do produto');
      return;
    }
    if (codigoDuplicado) {
      toast.error('Já existe um produto com este código');
      return;
    }
    setSalvando(true);
    try {
      const custo = num(item?.custo_unitario);
      const fornecedores = fornecedor?.nome
        ? [{
            fornecedor_id: fornecedor.id,
            fornecedor_nome: fornecedor.nome,
            codigo_fornecedor: item?.codigo || '',
            preco_compra: custo,
            principal: true,
          }]
        : [];

      const novo = await base44.entities.Produto.create({
        unidade_id: unidadeAtual?.id || null,
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        categoria: form.categoria.trim() || 'outros',
        valor: num(form.valor),
        custo,
        localizacao_estoque: form.localizacao_estoque.trim(),
        controla_estoque: true,
        estoque_atual: 0,
        estoque_minimo: 0,
        ativo: true,
        fornecedores,
      });

      qc.invalidateQueries({ queryKey: ['produtos-estoque'] });
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['categorias-produto'] });
      toast.success(`Produto "${novo.nome}" cadastrado`);
      onCriado(novo);
    } catch (err) {
      toast.error('Não foi possível cadastrar: ' + err.message);
    }
    setSalvando(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-blue-600" />
            Cadastrar novo produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-slate-600 space-y-1">
            <p><span className="text-slate-500">Item da nota:</span> <strong>{item?.descricao}</strong></p>
            {fornecedor?.nome && (
              <p>
                <span className="text-slate-500">Fornecedor:</span> <strong>{fornecedor.nome}</strong>
                {item?.codigo ? <> · <span className="text-slate-500">Código dele:</span> <strong>{item.codigo}</strong></> : null}
              </p>
            )}
            <p><span className="text-slate-500">Custo da nota:</span> <strong>R$ {num(item?.custo_unitario).toFixed(2)}</strong></p>
            <p className="text-[11px] text-slate-500">O fornecedor e o código dele já entram no cadastro do produto.</p>
          </div>

          <div>
            <Label>Nome do produto *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome que aparecerá no sistema"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código do produto *</Label>
              <Input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                className="h-11"
              />
              {codigoDuplicado && (
                <p className="text-[11px] text-red-600 mt-1">Este código já existe em outro produto</p>
              )}
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                list="categorias-nota-produto"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="h-11"
              />
              <datalist id="categorias-nota-produto">
                {(categorias || []).map((c) => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço de venda (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0.00"
                className="h-11"
              />
            </div>
            <div>
              <Label>Localização no estoque</Label>
              <Input
                value={form.localizacao_estoque}
                onChange={(e) => setForm({ ...form, localizacao_estoque: e.target.value })}
                placeholder="Ex: Prateleira A3"
                className="h-11"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando} className="bg-blue-600 hover:bg-blue-700">
            {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackagePlus className="w-4 h-4 mr-2" />}
            Cadastrar produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}