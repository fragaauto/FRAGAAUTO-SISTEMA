import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Tag } from 'lucide-react';

const CORES_SUGERIDAS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444',
  '#f59e0b', '#06b6d4', '#ec4899', '#64748b', '#84cc16'
];

export default function GerenciarStatus({ statusPersonalizados = [], onChange }) {
  const [novoLabel, setNovoLabel] = useState('');
  const [novaCor, setNovaCor] = useState('#f97316');

  const handleAdicionar = () => {
    if (!novoLabel.trim()) return;
    const valor = novoLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const jaExiste = statusPersonalizados.some(s => s.valor === valor);
    if (jaExiste) return;
    onChange([...statusPersonalizados, { valor, label: novoLabel.trim(), cor: novaCor }]);
    setNovoLabel('');
    setNovaCor('#f97316');
  };

  const handleRemover = (valor) => {
    onChange(statusPersonalizados.filter(s => s.valor !== valor));
  };

  const handleEditarLabel = (valor, novoLabel) => {
    onChange(statusPersonalizados.map(s => s.valor === valor ? { ...s, label: novoLabel } : s));
  };

  const handleEditarCor = (valor, novaCor) => {
    onChange(statusPersonalizados.map(s => s.valor === valor ? { ...s, cor: novaCor } : s));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-orange-500" />
          Status de Atendimento Personalizados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          Defina seus próprios status para organizar os atendimentos conforme o fluxo da sua empresa.
        </p>

        {/* Lista de status existentes */}
        <div className="space-y-2">
          {statusPersonalizados.length === 0 && (
            <p className="text-sm text-slate-400 italic text-center py-4">
              Nenhum status personalizado cadastrado ainda.
            </p>
          )}
          {statusPersonalizados.map((s) => (
            <div key={s.valor} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <input
                type="color"
                value={s.cor || '#64748b'}
                onChange={(e) => handleEditarCor(s.valor, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                title="Cor do status"
              />
              <Input
                value={s.label}
                onChange={(e) => handleEditarLabel(s.valor, e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <span className="text-xs text-slate-400 font-mono hidden sm:block">{s.valor}</span>
              <div
                className="px-2 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
                style={{ background: s.cor || '#64748b' }}
              >
                {s.label}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                onClick={() => handleRemover(s.valor)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Adicionar novo */}
        <div className="border-t pt-4">
          <Label className="text-sm font-medium mb-2 block">Adicionar novo status</Label>
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500">Cor</Label>
              <input
                type="color"
                value={novaCor}
                onChange={(e) => setNovaCor(e.target.value)}
                className="w-10 h-9 rounded cursor-pointer border border-slate-200 p-0.5"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-500">Nome do status</Label>
              <Input
                value={novoLabel}
                onChange={(e) => setNovoLabel(e.target.value)}
                placeholder="Ex: Aguardando Peça"
                onKeyDown={(e) => e.key === 'Enter' && handleAdicionar()}
              />
            </div>
            <Button
              onClick={handleAdicionar}
              disabled={!novoLabel.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {CORES_SUGERIDAS.map(cor => (
              <button
                key={cor}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: cor, borderColor: novaCor === cor ? '#1e293b' : 'transparent' }}
                onClick={() => setNovaCor(cor)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}