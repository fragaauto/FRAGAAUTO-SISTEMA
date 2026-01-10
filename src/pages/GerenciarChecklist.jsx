import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ClipboardCheck, 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical,
  Loader2,
  Save,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Search
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function GerenciarChecklist() {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef(null);
  const [showDialog, setShowDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState(null);
  const [deleteId, setDeleteId] = React.useState(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    item: '',
    categoria: '',
    obrigatorio: false,
    produtos_padrao: [],
    ativo: true
  });
  const [searchProduto, setSearchProduto] = React.useState('');

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const list = await base44.entities.ChecklistItem.list();
      return list.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    },
    staleTime: 5 * 60 * 1000
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingItem) {
        return base44.entities.ChecklistItem.update(editingItem.id, data);
      }
      return base44.entities.ChecklistItem.create({
        ...data,
        ordem: items.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklist-items']);
      setShowDialog(false);
      setEditingItem(null);
      setFormData({ item: '', categoria: '', obrigatorio: false, ativo: true });
      toast.success(editingItem ? 'Item atualizado!' : 'Item criado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['checklist-items']);
      toast.success('Item excluído!');
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (reorderedItems) => {
      for (let i = 0; i < reorderedItems.length; i++) {
        await base44.entities.ChecklistItem.update(reorderedItems[i].id, {
          ordem: i
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklist-items']);
      toast.success('Ordem atualizada!');
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    queryClient.setQueryData(['checklist-items'], reordered);
    updateOrderMutation.mutate(reordered);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item: item.item,
      categoria: item.categoria,
      obrigatorio: item.obrigatorio,
      produtos_padrao: item.produtos_padrao || [],
      ativo: item.ativo
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.item || !formData.categoria) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    saveMutation.mutate(formData);
  };

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistItem.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['checklist-items']);
      toast.success(`${result.length} itens importados!`);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      let text = decoder.decode(arrayBuffer);
      
      // Tentar ISO-8859-1 se UTF-8 falhar
      if (text.includes('�')) {
        const decoderLatin = new TextDecoder('iso-8859-1');
        text = decoderLatin.decode(arrayBuffer);
      }
      
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo vazio ou inválido');
        setIsImporting(false);
        return;
      }

      const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase().replace(/"/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      const itemIdx = headers.findIndex(h => h === 'item' || h === 'nome');
      const categoriaIdx = headers.findIndex(h => h === 'categoria');
      const obrigatorioIdx = headers.findIndex(h => h.includes('obrigatorio'));

      if (itemIdx === -1 || categoriaIdx === -1) {
        toast.error('O arquivo deve ter colunas "item" e "categoria"');
        setIsImporting(false);
        return;
      }

      const novosItens = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/[,;]/).map(v => v.trim().replace(/"/g, ''));
        const item = values[itemIdx];
        const categoria = values[categoriaIdx];
        
        if (item && categoria) {
          novosItens.push({
            item,
            categoria,
            ordem: items.length + i - 1,
            obrigatorio: obrigatorioIdx !== -1 ? (values[obrigatorioIdx]?.toLowerCase() === 'sim' || values[obrigatorioIdx] === '1') : false,
            ativo: true
          });
        }
      }

      if (novosItens.length === 0) {
        toast.error('Nenhum item válido encontrado no arquivo');
        setIsImporting(false);
        return;
      }

      await bulkCreateMutation.mutateAsync(novosItens);
      setIsImporting(false);
    } catch (error) {
      toast.error('Erro ao importar arquivo');
      console.error(error);
      setIsImporting(false);
    }
    
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const csvContent = "item;categoria;obrigatorio\nEsguicho para-brisa dianteiro;Limpeza e Visibilidade;nao\nFarol dianteiro esquerdo;Iluminação;sim\nTravas elétricas;Elétrica;nao";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_checklist.csv';
    link.click();
  };

  const exportToExcel = () => {
    const csvContent = 'item;categoria;obrigatorio;ordem\n' + 
      items.map(item => 
        `${item.item};${item.categoria};${item.obrigatorio ? 'sim' : 'nao'};${item.ordem || 0}`
      ).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `checklist_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Checklist exportado!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-orange-500" />
                Gerenciar Checklist
              </h1>
              <p className="text-slate-500">Personalize os itens e ordem (arraste para reordenar)</p>
            </div>
            <div className="flex gap-2">
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
                onClick={exportToExcel}
                disabled={items.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button
                variant="outline"
                onClick={downloadTemplate}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Modelo
              </Button>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ item: '', categoria: '', obrigatorio: false, produtos_padrao: [], ativo: true });
                  setShowDialog(true);
                }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : items.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">Nenhum item no checklist</p>
              <Button onClick={() => setShowDialog(true)} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="checklist">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={!item.ativo ? 'opacity-50' : ''}
                        >
                          <CardContent className="flex items-center gap-3 p-4">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-5 h-5 text-slate-400 cursor-grab" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-slate-800">{item.item}</p>
                                {item.obrigatorio && (
                                  <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                                )}
                                {!item.ativo && (
                                  <Badge variant="outline" className="text-xs bg-slate-100">Inativo</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-500">{item.categoria}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(item.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Nome do Item *</Label>
              <Input
                value={formData.item}
                onChange={(e) => setFormData(prev => ({ ...prev, item: e.target.value }))}
                placeholder="Ex: Esguicho para-brisa dianteiro"
              />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Input
                value={formData.categoria}
                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                placeholder="Ex: Limpeza e Visibilidade"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Item Obrigatório</Label>
              <Switch
                checked={formData.obrigatorio}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, obrigatorio: checked }))}
              />
            </div>
            <div>
              <Label>Produtos Padrão (Opcionais)</Label>
              <p className="text-xs text-slate-500 mb-2">Produtos sugeridos quando este item tiver defeito</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchProduto}
                  onChange={(e) => setSearchProduto(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>
              <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                {produtos
                  .filter(p => {
                    if (!searchProduto) return true;
                    const search = searchProduto.toLowerCase();
                    return p.nome?.toLowerCase().includes(search) ||
                           p.codigo?.toLowerCase().includes(search);
                  })
                  .map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.produtos_padrao.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, produtos_padrao: [...prev.produtos_padrao, p.id] }));
                          } else {
                            setFormData(prev => ({ ...prev, produtos_padrao: prev.produtos_padrao.filter(id => id !== p.id) }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {p.codigo && <span className="text-slate-500">{p.codigo} - </span>}
                        {p.nome}
                      </span>
                    </label>
                  ))}
                {produtos.filter(p => {
                  if (!searchProduto) return true;
                  const search = searchProduto.toLowerCase();
                  return p.nome?.toLowerCase().includes(search) ||
                         p.codigo?.toLowerCase().includes(search);
                }).length === 0 && (
                  <p className="text-center py-2 text-slate-500 text-sm">
                    Nenhum produto encontrado
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Item Obrigatório</Label>
              <Switch
                checked={formData.obrigatorio}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, obrigatorio: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Item Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              deleteMutation.mutate(deleteId);
              setDeleteId(null);
            }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}