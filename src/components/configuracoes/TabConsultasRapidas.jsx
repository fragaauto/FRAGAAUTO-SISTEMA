import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function TabConsultasRapidas({ formData, onChange, onSave, isSaving }) {
  const consultas = formData.consultas_rapidas || [];
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoLink, setNovoLink] = useState('');

  const gerarId = () => 'consulta_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  const adicionar = () => {
    if (!novoTitulo.trim()) return toast.error('Digite um título para a consulta');
    if (!novoLink.trim()) return toast.error('Cole o link público CSV da planilha');
    const nova = {
      id: gerarId(),
      titulo: novoTitulo.trim(),
      link_csv: novoLink.trim(),
      ativo: true,
    };
    onChange('consultas_rapidas', [...consultas, nova]);
    setNovoTitulo('');
    setNovoLink('');
    toast.success('Consulta adicionada! Lembre de salvar.');
  };

  const remover = (id) => {
    onChange('consultas_rapidas', consultas.filter(c => c.id !== id));
  };

  const toggleAtivo = (id, val) => {
    onChange('consultas_rapidas', consultas.map(c => c.id === id ? { ...c, ativo: val } : c));
  };

  const atualizarCampo = (id, campo, valor) => {
    onChange('consultas_rapidas', consultas.map(c => c.id === id ? { ...c, [campo]: valor } : c));
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong className="block mb-1">Consultas Rápidas (Botão Flutuante)</strong>
        Configure consultas que ficarão disponíveis no botão flutuante (canto inferior direito) em todas as páginas do sistema.
        Cada consulta busca dados de uma planilha Google Sheets <strong>publicada em formato CSV</strong>.
        <div className="mt-2 text-xs text-blue-600">
          Como publicar: no Google Sheets → Arquivo → Compartilhar → Publicar na web → escolha "Valores separados por vírgulas (.csv)" → copie o link.
        </div>
      </div>

      {/* Lista de consultas existentes */}
      {consultas.length > 0 && (
        <div className="space-y-3">
          {consultas.map((c, idx) => (
            <div key={c.id} className="border rounded-lg p-4 bg-white space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1 text-slate-400 mt-2">
                  <GripVertical className="w-4 h-4" />
                  <span className="text-xs font-medium">#{idx + 1}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs">Título da consulta</Label>
                    <Input
                      value={c.titulo}
                      onChange={e => atualizarCampo(c.id, 'titulo', e.target.value)}
                      placeholder="Ex: Consulta de Encaixe de Lâmpadas"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Link público CSV da planilha</Label>
                    <Input
                      value={c.link_csv}
                      onChange={e => atualizarCampo(c.id, 'link_csv', e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 pt-5">
                  <div className="flex items-center gap-1">
                    <Switch checked={c.ativo} onCheckedChange={val => toggleAtivo(c.id, val)} />
                    <span className="text-xs text-slate-500">{c.ativo ? 'Ativa' : 'Inativa'}</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remover(c.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {c.link_csv && (
                <a href={c.link_csv} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Ver planilha
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Adicionar nova consulta */}
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 space-y-3 bg-slate-50">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar nova consulta
        </p>
        <div>
          <Label className="text-xs">Título *</Label>
          <Input
            value={novoTitulo}
            onChange={e => setNovoTitulo(e.target.value)}
            placeholder="Ex: Consulta de Encaixe de Lâmpadas"
          />
        </div>
        <div>
          <Label className="text-xs">Link público CSV *</Label>
          <Input
            value={novoLink}
            onChange={e => setNovoLink(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
          />
        </div>
        <Button onClick={adicionar} size="sm" className="w-full">
          <Plus className="w-4 h-4" /> Adicionar Consulta
        </Button>
      </div>

      {consultas.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Nenhuma consulta configurada ainda. Adicione a primeira acima.
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}