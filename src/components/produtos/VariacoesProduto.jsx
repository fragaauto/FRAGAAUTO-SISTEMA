import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ImagePlus, X, Loader2, Layers, ChevronDown, ChevronUp, Package } from 'lucide-react';
import SeletorComponenteKit from '@/components/produtos/SeletorComponenteKit';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function genId() {
  return 'var_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export default function VariacoesProduto({ formData, setFormData }) {
  const [expandido, setExpandido] = useState({});
  const [uploadingFoto, setUploadingFoto] = useState(null);

  const { data: produtosLista = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('', 3000),
    staleTime: 5 * 60 * 1000
  });

  const variacoes = formData.variacoes || [];

  const adicionarVariacao = () => {
    const nova = {
      id: genId(),
      nome: '',
      descricao: '',
      valor: 0,
      usar_faixa_preco: false,
      valor_minimo: 0,
      valor_maximo: 0,
      composicao: [],
      fotos: [],
    };
    setFormData({ ...formData, variacoes: [...variacoes, nova] });
    setExpandido({ ...expandido, [nova.id]: true });
  };

  const removerVariacao = (idx) => {
    setFormData({ ...formData, variacoes: variacoes.filter((_, i) => i !== idx) });
  };

  const atualizarVariacao = (idx, campo, valor) => {
    const novas = [...variacoes];
    novas[idx] = { ...novas[idx], [campo]: valor };
    setFormData({ ...formData, variacoes: novas });
  };

  // Composição da variação
  const adicionarComponente = (vIdx) => {
    const novas = [...variacoes];
    novas[vIdx] = {
      ...novas[vIdx],
      composicao: [...(novas[vIdx].composicao || []), { produto_id: '', produto_nome: '', codigo: '', quantidade: 1 }],
    };
    setFormData({ ...formData, variacoes: novas });
  };

  const removerComponente = (vIdx, cIdx) => {
    const novas = [...variacoes];
    novas[vIdx] = {
      ...novas[vIdx],
      composicao: (novas[vIdx].composicao || []).filter((_, i) => i !== cIdx),
    };
    setFormData({ ...formData, variacoes: novas });
  };

  const selecionarComponente = (vIdx, cIdx, produtoId) => {
    const prod = produtosLista.find(p => p.id === produtoId);
    const novas = [...variacoes];
    novas[vIdx].composicao[cIdx] = {
      ...novas[vIdx].composicao[cIdx],
      produto_id: produtoId,
      produto_nome: prod?.nome || '',
      codigo: prod?.codigo || '',
    };
    setFormData({ ...formData, variacoes: novas });
  };

  const atualizarQtdComponente = (vIdx, cIdx, qtd) => {
    const novas = [...variacoes];
    novas[vIdx].composicao[cIdx] = { ...novas[vIdx].composicao[cIdx], quantidade: parseFloat(qtd) || 1 };
    setFormData({ ...formData, variacoes: novas });
  };

  // Fotos da variação
  const handleUploadFoto = async (vIdx, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingFoto(vIdx);
    try {
      const novas = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        novas.push({ url: file_url, descricao: '', data_upload: new Date().toISOString(), usuario: 'Sistema' });
      }
      const vars = [...variacoes];
      vars[vIdx] = { ...vars[vIdx], fotos: [...(vars[vIdx].fotos || []), ...novas] };
      setFormData({ ...formData, variacoes: vars });
      toast.success(`${novas.length} foto(s) adicionada(s)`);
    } catch (err) {
      toast.error('Erro ao enviar foto: ' + (err.message || err));
    } finally {
      setUploadingFoto(null);
      e.target.value = '';
    }
  };

  const removerFoto = (vIdx, fIdx) => {
    const vars = [...variacoes];
    vars[vIdx] = { ...vars[vIdx], fotos: (vars[vIdx].fotos || []).filter((_, i) => i !== fIdx) };
    setFormData({ ...formData, variacoes: vars });
  };

  const toggleExpandido = (id) => setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Variações do Produto
          </Label>
          <p className="text-xs text-slate-500 mt-0.5">
            Cada variação pode ter preço, composição e fotos próprios. Ao incluir no atendimento, o sistema pede qual variação usar.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={adicionarVariacao}>
          <Plus className="w-3 h-3 mr-1" /> Nova Variação
        </Button>
      </div>

      {variacoes.length > 0 ? (
        <div className="space-y-2">
          {variacoes.map((v, idx) => (
            <div key={v.id || idx} className="bg-white border rounded-lg overflow-hidden">
              {/* Cabeçalho da variação */}
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50" onClick={() => toggleExpandido(v.id)}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button className="flex-shrink-0">
                    {expandido[v.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  <span className="text-sm font-medium truncate">{v.nome || `Variação ${idx + 1}`}</span>
                  <span className="text-xs text-green-700 font-semibold whitespace-nowrap">
                    {v.usar_faixa_preco
                      ? `R$ ${(v.valor_minimo || 0).toFixed(2)} – R$ ${(v.valor_maximo || 0).toFixed(2)}`
                      : `R$ ${(v.valor || 0).toFixed(2)}`}
                  </span>
                  {v.composicao?.length > 0 && (
                    <span className="text-xs text-indigo-600 flex items-center gap-0.5"><Package className="w-3 h-3" />{v.composicao.length}</span>
                  )}
                  {v.fotos?.length > 0 && (
                    <span className="text-xs text-blue-600">{v.fotos.length} 📷</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removerVariacao(idx); }}
                  className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Detalhes da variação */}
              {expandido[v.id] && (
                <div className="p-3 border-t space-y-3 bg-slate-50">
                  <div>
                    <Label className="text-xs">Nome da Variação *</Label>
                    <Input
                      value={v.nome}
                      onChange={e => atualizarVariacao(idx, 'nome', e.target.value)}
                      placeholder="Ex: Para 2 portas, Para 4 portas, Modelo X..."
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Descrição (vai para observações do item)</Label>
                    <Textarea
                      value={v.descricao}
                      onChange={e => atualizarVariacao(idx, 'descricao', e.target.value)}
                      placeholder="Detalhes da instalação, diferenças, etc..."
                      className="min-h-[50px] text-sm"
                    />
                  </div>

                  {/* Preço */}
                  <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!v.usar_faixa_preco}
                        onCheckedChange={checked => atualizarVariacao(idx, 'usar_faixa_preco', checked)}
                      />
                      <span className="text-xs font-medium">Usar faixa de preço</span>
                    </div>
                    {v.usar_faixa_preco ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Valor Mínimo</Label>
                          <Input type="number" step="0.01" min="0" value={v.valor_minimo}
                            onChange={e => atualizarVariacao(idx, 'valor_minimo', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">Valor Máximo</Label>
                          <Input type="number" step="0.01" min="0" value={v.valor_maximo}
                            onChange={e => atualizarVariacao(idx, 'valor_maximo', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm" />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input type="number" step="0.01" min="0" value={v.valor}
                          onChange={e => atualizarVariacao(idx, 'valor', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm" />
                      </div>
                    )}
                  </div>

                  {/* Composição da variação */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Composição desta Variação</Label>
                      <Button type="button" size="sm" variant="ghost" onClick={() => adicionarComponente(idx)} className="h-7 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Componente
                      </Button>
                    </div>
                    {v.composicao?.length > 0 ? (
                      <div className="space-y-1.5">
                        {v.composicao.map((comp, cIdx) => (
                          <div key={cIdx} className="flex items-end gap-2 bg-white border rounded p-1.5">
                            <div className="flex-1 min-w-0">
                              <SeletorComponenteKit
                                produtos={produtosLista.filter(p => p.id !== formData.id)}
                                value={comp.produto_id}
                                onSelect={(p) => selecionarComponente(idx, cIdx, p.id)}
                              />
                            </div>
                            <Input type="number" min="1" value={comp.quantidade}
                              onChange={e => atualizarQtdComponente(idx, cIdx, e.target.value)}
                              className="w-14 h-8 text-sm text-center" />
                            <button type="button" onClick={() => removerComponente(idx, cIdx)} className="text-red-400 hover:text-red-600 pb-1.5">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Sem composição própria — usa a composição do produto pai.</p>
                    )}
                  </div>

                  {/* Fotos da variação */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Fotos da Instalação</Label>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={e => handleUploadFoto(idx, e)}
                          className="hidden"
                          id={`upload-foto-var-${v.id || idx}`}
                          disabled={uploadingFoto === idx}
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById(`upload-foto-var-${v.id || idx}`)?.click()} disabled={uploadingFoto === idx} className="h-7 text-xs">
                          {uploadingFoto === idx ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImagePlus className="w-3 h-3 mr-1" />}
                          Fotos
                        </Button>
                      </div>
                    </div>
                    {v.fotos?.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {v.fotos.map((foto, fIdx) => (
                          <div key={fIdx} className="relative group aspect-square rounded-lg overflow-hidden border">
                            <img src={foto.url} alt={foto.descricao || 'Foto'} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removerFoto(idx, fIdx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Nenhuma foto</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 text-center py-2">Nenhuma variação. Este produto tem preço único.</p>
      )}
    </div>
  );
}