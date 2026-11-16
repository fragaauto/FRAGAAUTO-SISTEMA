import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, Upload, X, Sparkles } from 'lucide-react';

export default function ItemPersonalizadoModal({ item, onClose, onSaved }) {
  const [nome, setNome] = useState(item?.nome || '');
  const [descricao, setDescricao] = useState(item?.descricao || '');
  const [valorOriginal, setValorOriginal] = useState(item?.valor_original ?? '');
  const [valorPromocional, setValorPromocional] = useState(item?.valor_promocional ?? '');
  const [fotoUrl, setFotoUrl] = useState(item?.foto_url || '');
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const enviarFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoFoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setFotoUrl(file_url);
    } catch {
      toast.error('Não foi possível enviar a foto');
    }
    setEnviandoFoto(false);
    e.target.value = '';
  };

  const salvar = () => {
    if (!nome.trim()) return toast.error('Informe o nome do item');
    if (valorPromocional === '' || Number(valorPromocional) < 0) {
      return toast.error('Informe o valor da oferta');
    }
    onSaved({
      uid: item?.uid || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      nome: nome.trim(),
      descricao: descricao.trim(),
      foto_url: fotoUrl,
      valor_original: valorOriginal === '' ? null : Number(valorOriginal),
      valor_promocional: Number(valorPromocional) || 0,
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            {item ? 'Editar item personalizado' : 'Novo item personalizado'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nome do item / oferta *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Instalação de 2 portas automáticas"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da oferta que o cliente vai ler na página"
              className="min-h-[70px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Valor normal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={valorOriginal}
                onChange={(e) => setValorOriginal(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Valor da oferta (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={valorPromocional}
                onChange={(e) => setValorPromocional(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <Label>Foto do item</Label>
            <div className="flex items-center gap-3 mt-1">
              {fotoUrl ? (
                <div className="relative">
                  <img src={fotoUrl} alt="Foto" className="w-20 h-20 rounded-lg object-contain bg-white border" />
                  <button
                    type="button"
                    onClick={() => setFotoUrl('')}
                    className="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow"
                  >
                    <X className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-slate-700 hover:bg-slate-50">
                {enviandoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {fotoUrl ? 'Trocar foto' : 'Escolher foto'}
                <input type="file" accept="image/*" className="hidden" onChange={enviarFoto} disabled={enviandoFoto} />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} className="bg-orange-500 hover:bg-orange-600">
            <Save className="w-4 h-4 mr-2" /> Salvar item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}