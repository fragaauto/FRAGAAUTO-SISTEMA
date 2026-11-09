import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Camera, Upload, Trash2, Loader2, Image } from 'lucide-react';
import { toast } from "sonner";

export default function FotosOrcamentoAvulso({ fotos = [], onChange }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB.');
      return;
    }

    setUploading(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });

      onChange([
        ...fotos,
        {
          url: file_url,
          descricao: file.name || 'Foto do orçamento',
          data_upload: new Date().toISOString(),
          usuario: user?.full_name || user?.email || 'Sistema',
        },
      ]);
      toast.success('Foto anexada ao orçamento!');
    } catch {
      toast.error('Erro ao enviar a foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const remover = (idx) => onChange(fotos.filter((_, i) => i !== idx));

  return (
    <div className="border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Image className="w-4 h-4 text-orange-500" /> Fotos do Orçamento ({fotos.length})
        </p>
        <div className="flex gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => handleUpload(e.target.files[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleUpload(e.target.files[0])}
          />
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
            <Camera className="w-3 h-3" /> Câmera
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Anexar
          </Button>
        </div>
      </div>

      {fotos.length === 0 ? (
        <p className="text-xs text-slate-400 bg-slate-50 border border-dashed rounded-lg p-3 text-center">
          Nenhuma foto anexada. A primeira foto é enviada junto do orçamento no WhatsApp.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotos.map((foto, idx) => (
            <div key={idx} className="relative group">
              <img src={foto.url} alt={foto.descricao || `Foto ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => remover(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 bg-orange-500 text-white text-[9px] font-semibold px-1 py-0.5 rounded">
                  ENVIO
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}