import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Upload, Loader2, Package } from 'lucide-react';
import { toast } from "sonner";

// Mostra a foto do produto (cadastro) e permite anexar uma foto que fica salva no cadastro.
export default function FotoProdutoCompra({ prod, onAtualizado, className = '' }) {
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const [enviando, setEnviando] = useState(false);

  const foto = prod?.fotos?.[0]?.url;

  const enviar = async (file) => {
    if (!file || !prod) return;
    if (!file.type.startsWith('image/')) return toast.error('Apenas imagens são permitidas');
    if (file.size > 10 * 1024 * 1024) return toast.error('Imagem muito grande. Máximo 10MB.');
    setEnviando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.entities.Produto.update(prod.id, {
        fotos: [...(prod.fotos || []), { url: file_url, descricao: file.name || '', data_upload: new Date().toISOString(), usuario: 'Sistema' }],
      });
      toast.success('Foto anexada ao cadastro do produto!');
      if (onAtualizado) onAtualizado();
    } catch {
      toast.error('Erro ao enviar a foto');
    } finally {
      setEnviando(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (foto) {
    return (
      <img
        src={foto}
        alt={prod?.nome || 'Produto'}
        className={`w-11 h-11 rounded-md object-cover border border-slate-200 flex-shrink-0 ${className}`}
      />
    );
  }

  if (!prod) {
    return (
      <div className={`w-11 h-11 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 ${className}`}>
        <Package className="w-4 h-4 text-slate-300" />
      </div>
    );
  }

  return (
    <div className={`w-11 h-11 rounded-md border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center gap-0.5 flex-shrink-0 ${className}`}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => enviar(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => enviar(e.target.files[0])} />
      {enviando ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <>
          <button type="button" onClick={() => cameraRef.current?.click()} title="Tirar foto" className="text-blue-500 hover:text-blue-700 p-0.5">
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} title="Enviar foto" className="text-slate-500 hover:text-slate-700 p-0.5">
            <Upload className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}