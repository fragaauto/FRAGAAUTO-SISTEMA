import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, Tags, Download, Package } from 'lucide-react';
import { toast } from 'sonner';
import ModalCategoriaProduto from '@/components/cadastros/ModalCategoriaProduto';

const LOTE = 500;

export default function CategoriasProdutoTab() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [excluir, setExcluir] = useState(null);

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-produto'],
    queryFn: async () => {
      const { items } = await base44.entities.CategoriaProduto.list({ sort: 'nome' });
      return items;
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-resumo-categorias'],
    queryFn: async () => {
      const { items } = await base44.entities.Produto.filter({}, {
        fields: ['nome', 'categoria', 'controla_estoque', 'estoque_atual', 'estoque_minimo'],
        limit: 3000,
      });
      return items;
    },
    staleTime: 5 * 60 * 1000,
  });

  const resumo = useMemo(() => {
    const mapa = new Map();
    produtos.forEach((p) => {
      const chave = (p.categoria || '').trim();
      if (!chave) return;
      const atual = mapa.get(chave) || { produtos: 0, itens: 0, baixo: 0 };
      atual.produtos += 1;
      if (p.controla_estoque) {
        atual.itens += p.estoque_atual || 0;
        if ((p.estoque_atual || 0) <= (p.estoque_minimo || 0)) atual.baixo += 1;
      }
      mapa.set(chave, atual);
    });
    return mapa;
  }, [produtos]);

  const faltandoImportar = useMemo(() => {
    const registradas = new Set(categorias.map((c) => (c.nome || '').trim().toLowerCase()));
    return Array.from(resumo.keys()).filter((cat) => !registradas.has(cat.toLowerCase()));
  }, [categorias, resumo]);

  const salvarMutation = useMutation({
    mutationFn: async ({ id, nome, descricao, nomeAnterior }) => {
      if (id) {
        await base44.entities.CategoriaProduto.update(id, { nome, descricao });
      } else {
        await base44.entities.CategoriaProduto.create({ nome, descricao });
      }

      if (id && nomeAnterior && nomeAnterior !== nome) {
        const ids = produtos
          .filter((p) => (p.categoria || '').trim() === nomeAnterior)
          .map((p) => p.id);
        for (let i = 0; i < ids.length; i += LOTE) {
          await base44.entities.Produto.bulkUpdate(
            ids.slice(i, i + LOTE).map((produtoId) => ({ id: produtoId, categoria: nome }))
          );
        }
        return { quantidade: ids.length };
      }
      return { quantidade: 0 };
    },
    onSuccess: ({ quantidade }) => {
      queryClient.invalidateQueries(['categorias-produto']);
      if (quantidade > 0) {
        queryClient.invalidateQueries(['produtos']);
        queryClient.invalidateQueries(['produtos-resumo-categorias']);
        toast.success(`Categoria salva • ${quantidade} produto(s) atualizado(s)`);
      } else {
        toast.success('Categoria salva!');
      }
      setShowModal(false);
      setEditando(null);
    },
    onError: (e) => toast.error('Erro ao salvar categoria: ' + (e?.message || '')),
  });

  const importarMutation = useMutation({
    mutationFn: async () => {
      if (faltandoImportar.length === 0) return { quantidade: 0 };
      await base44.entities.CategoriaProduto.bulkCreate(
        faltandoImportar.map((nome) => ({ nome, descricao: '' }))
      );
      return { quantidade: faltandoImportar.length };
    },
    onSuccess: ({ quantidade }) => {
      queryClient.invalidateQueries(['categorias-produto']);
      toast.success(`${quantidade} categoria(s) importada(s) dos produtos`);
    },
    onError: () => toast.error('Erro ao importar categorias'),
  });

  const excluirMutation = useMutation({
    mutationFn: (id) => base44.entities.CategoriaProduto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['categorias-produto']);
      toast.success('Categoria excluída!');
      setExcluir(null);
    },
    onError: () => toast.error('Erro ao excluir categoria'),
  });

  const abrirNova = () => {
    setEditando(null);
    setShowModal(true);
  };

  const abrirEdicao = (categoria) => {
    setEditando(categoria);
    setShowModal(true);
  };

  const tentarExcluir = (categoria) => {
    const emUso = resumo.get((categoria.nome || '').trim())?.produtos || 0;
    if (emUso > 0) {
      toast.error(`"${categoria.nome}" está em uso por ${emUso} produto(s). Troque a categoria desses produtos antes de excluir.`);
      return;
    }
    setExcluir(categoria);
  };

  const handleSalvar = ({ nome, descricao }) => {
    const duplicada = categorias.some(
      (c) => c.id !== editando?.id && (c.nome || '').trim().toLowerCase() === nome.toLowerCase()
    );
    if (duplicada) {
      toast.error('Já existe uma categoria com esse nome');
      return;
    }
    salvarMutation.mutate({
      id: editando?.id,
      nome,
      descricao,
      nomeAnterior: editando?.nome,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Categorias de Produtos</h2>
          <p className="text-sm text-slate-500">
            Organize as peças e serviços do estoque. As categorias cadastradas aparecem na seleção ao criar um produto.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => importarMutation.mutate()}
            disabled={faltandoImportar.length === 0 || importarMutation.isPending}
          >
            {importarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Importar dos produtos ({faltandoImportar.length})
          </Button>
          <Button onClick={abrirNova} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Nova categoria
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : categorias.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Tags className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-1">Nenhuma categoria cadastrada</p>
            <p className="text-xs text-slate-400 mb-4">
              Crie categorias novas ou importe as que já existem nos seus produtos.
            </p>
            <Button onClick={abrirNova} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {categorias.map((categoria) => {
            const dados = resumo.get((categoria.nome || '').trim()) || { produtos: 0, itens: 0, baixo: 0 };
            return (
              <Card key={categoria.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                        <Tags className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{categoria.nome}</h3>
                        {categoria.descricao && (
                          <p className="text-sm text-slate-500">{categoria.descricao}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Package className="w-3 h-3 mr-1" />
                            {dados.produtos} produto(s)
                          </Badge>
                          {dados.itens > 0 && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              {dados.itens} item(ns) em estoque
                            </Badge>
                          )}
                          {dados.baixo > 0 && (
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              ⚠ {dados.baixo} com estoque baixo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(categoria)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => tentarExcluir(categoria)}
                        className="text-red-500 hover:text-red-700"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ModalCategoriaProduto
        open={showModal}
        onOpenChange={(v) => {
          setShowModal(v);
          if (!v) setEditando(null);
        }}
        categoria={editando}
        onSalvar={handleSalvar}
        salvando={salvarMutation.isPending}
      />

      <AlertDialog open={!!excluir} onOpenChange={() => setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria "{excluir?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os produtos não são afetados, pois nenhum usa esta categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => excluirMutation.mutate(excluir.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              {excluirMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}