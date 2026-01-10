import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Package,
  Edit,
  Trash2,
  Upload,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIAS = [
  { value: 'eletrica', label: 'Elétrica', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'portas', label: 'Portas', color: 'bg-blue-100 text-blue-800' },
  { value: 'acessorios', label: 'Acessórios', color: 'bg-purple-100 text-purple-800' },
  { value: 'estetica', label: 'Estética', color: 'bg-pink-100 text-pink-800' },
  { value: 'seguranca', label: 'Segurança', color: 'bg-red-100 text-red-800' },
  { value: 'vidros', label: 'Vidros', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'limpeza', label: 'Limpeza', color: 'bg-green-100 text-green-800' },
  { value: 'outros', label: 'Outros', color: 'bg-gray-100 text-gray-800' }
];

const getCategoriaColor = (cat) => CATEGORIAS.find(c => c.value === cat)?.color || 'bg-gray-100';

export default function Produtos() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteMultiple, setShowDeleteMultiple] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: '',
    valor: '',
    descricao: '',
    vantagens: '',
    desvantagens: '',
    ativo: true
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('', 3000),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Produto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['produtos']);
      toast.success('Produto criado!');
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Produto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['produtos']);
      toast.success('Produto atualizado!');
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Produto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['produtos']);
      toast.success('Produto excluído!');
      setDeleteId(null);
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids) => {
      setDeleteProgress(0);
      const total = ids.length;
      
      for (let i = 0; i < ids.length; i++) {
        await base44.entities.Produto.delete(ids[i]);
        setDeleteProgress(((i + 1) / total) * 100);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['produtos']);
      toast.success(`${selectedIds.length} produto(s) excluído(s)!`);
      setSelectedIds([]);
      setShowDeleteMultiple(false);
      setDeleteProgress(0);
    },
    onError: () => {
      setDeleteProgress(0);
      toast.error('Erro ao excluir produtos');
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Produto.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['produtos']);
      toast.success(`${result.length} produtos importados!`);
    }
  });

  const filteredProdutos = produtos.filter(p => {
    const matchSearch = p.nome?.toLowerCase().includes(search.toLowerCase()) || 
                        p.codigo?.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = categoriaFilter === 'all' || p.categoria === categoriaFilter;
    return matchSearch && matchCategoria;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProdutos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProdutos.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openModal = (produto = null) => {
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        codigo: produto.codigo || '',
        nome: produto.nome,
        categoria: produto.categoria,
        valor: produto.valor,
        descricao: produto.descricao || '',
        vantagens: produto.vantagens || '',
        desvantagens: produto.desvantagens || '',
        ativo: produto.ativo !== false
      });
    } else {
      setEditingProduto(null);
      setFormData({
        codigo: '',
        nome: '',
        categoria: '',
        valor: '',
        descricao: '',
        vantagens: '',
        desvantagens: '',
        ativo: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduto(null);
    setFormData({
      codigo: '',
      nome: '',
      categoria: '',
      valor: '',
      descricao: '',
      vantagens: '',
      desvantagens: '',
      ativo: true
    });
  };

  const handleSave = () => {
    if (!formData.codigo || !formData.nome || !formData.categoria || !formData.valor) {
      toast.error('Preencha todos os campos obrigatórios (código, nome, categoria, valor)');
      return;
    }

    const data = {
      ...formData,
      valor: parseFloat(formData.valor)
    };

    if (editingProduto) {
      updateMutation.mutate({ id: editingProduto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo vazio ou inválido');
        setIsImporting(false);
        return;
      }

      const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const codigoIdx = headers.findIndex(h => h === 'codigo' || h === 'código');
      const nomeIdx = headers.findIndex(h => h === 'nome');
      const categoriaIdx = headers.findIndex(h => h === 'categoria');
      const valorIdx = headers.findIndex(h => h === 'valor');
      const descricaoIdx = headers.findIndex(h => h === 'descricao' || h === 'descrição');
      const vantagensIdx = headers.findIndex(h => h === 'vantagens');
      const desvantagensIdx = headers.findIndex(h => h === 'desvantagens');

      if (codigoIdx === -1 || nomeIdx === -1 || valorIdx === -1) {
        toast.error('O arquivo deve ter colunas "codigo", "nome" e "valor"');
        setIsImporting(false);
        return;
      }

      const produtos = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/[,;]/).map(v => v.trim().replace(/"/g, ''));
        const codigo = values[codigoIdx];
        const nome = values[nomeIdx];
        const valor = parseFloat(values[valorIdx]?.replace(',', '.')) || 0;
        
        if (codigo && nome && valor > 0) {
          produtos.push({
            codigo,
            nome,
            categoria: (values[categoriaIdx] || 'outros').toLowerCase(),
            valor,
            descricao: values[descricaoIdx] || '',
            vantagens: values[vantagensIdx] || '',
            desvantagens: values[desvantagensIdx] || '',
            ativo: true
          });
        }
      }

      if (produtos.length === 0) {
        toast.error('Nenhum produto válido encontrado no arquivo');
        setIsImporting(false);
        return;
      }

      await bulkCreateMutation.mutateAsync(produtos);
      setIsImporting(false);
    } catch (error) {
      toast.error('Erro ao importar arquivo');
      setIsImporting(false);
    }
    
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const csvContent = "codigo;nome;categoria;valor;descricao;vantagens;desvantagens\nP001;Exemplo Serviço;eletrica;150.00;Descrição do serviço;Melhora a segurança;Pode causar falhas\nP002;Exemplo Produto;portas;89.90;Descrição do produto;Evita infiltrações;Danos ao veículo";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_produtos.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Produtos e Serviços</h1>
              <p className="text-slate-500">
                {produtos.length} cadastrados
                {selectedIds.length > 0 && ` • ${selectedIds.length} selecionado(s)`}
              </p>
            </div>
            <div className="flex gap-2">{selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteMultiple(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir ({selectedIds.length})
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Importar
              </Button>
              <Button
                variant="outline"
                onClick={downloadTemplate}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Modelo
              </Button>
              <Button 
                onClick={() => openModal()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {filteredProdutos.length > 0 && (
            <label className="flex items-center gap-2 px-3 h-12 border rounded-lg bg-white cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredProdutos.length}
                onChange={toggleSelectAll}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Selecionar todos</span>
            </label>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar produto ou serviço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIAS.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredProdutos.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Nenhum produto encontrado</p>
              <Button onClick={() => openModal()} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Produto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredProdutos.map((produto, index) => (
              <motion.div
                key={produto.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(produto.id)}
                          onChange={() => toggleSelect(produto.id)}
                          className="w-4 h-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                             {produto.codigo || 'S/C'}
                           </span>
                           <h3 className="font-semibold text-slate-800">{produto.nome}</h3>
                         </div>
                         <div className="flex items-center gap-2">
                           <Badge className={getCategoriaColor(produto.categoria)}>
                             {produto.categoria}
                           </Badge>
                            {produto.descricao && (
                              <span className="text-xs text-slate-500 truncate max-w-[200px]">
                                {produto.descricao}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-green-600 text-lg">
                          R$ {produto.valor?.toFixed(2)}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openModal(produto)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(produto.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ex: P001"
                className="h-12"
              />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do produto ou serviço"
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
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
                className="h-12"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Observações sobre o produto..."
                className="min-h-[60px]"
              />
            </div>
            <div>
              <Label>Vantagens de Fazer</Label>
              <Textarea
                value={formData.vantagens}
                onChange={(e) => setFormData({ ...formData, vantagens: e.target.value })}
                placeholder="Benefícios de realizar o serviço..."
                className="min-h-[60px]"
              />
            </div>
            <div>
              <Label>Desvantagens de Não Fazer</Label>
              <Textarea
                value={formData.desvantagens}
                onChange={(e) => setFormData({ ...formData, desvantagens: e.target.value })}
                placeholder="Riscos de não realizar o serviço..."
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Multiple Confirmation */}
      <AlertDialog open={showDeleteMultiple} onOpenChange={setShowDeleteMultiple}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} produto(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os produtos selecionados serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMultipleMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Excluindo produtos...</span>
                <span className="font-semibold text-slate-700">{Math.round(deleteProgress)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${deleteProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Por favor, aguarde. Não feche esta janela.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMultipleMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMultipleMutation.mutate(selectedIds)}
              disabled={deleteMultipleMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMultipleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Todos'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}