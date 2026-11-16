import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadArquivoPublico } from '@/lib/promocao';

export default function UploadsPromocao({ bannerUrl, onBannerChange, artes, onArtesChange }) {
  const bannerRef = useRef(null);
  const artesRef = useRef(null);
  const [enviandoBanner, setEnviandoBanner] = useState(false);
  const [enviandoArtes, setEnviandoArtes] = useState(false);

  const enviarBanner = async (file) => {
    if (!file) return;
    setEnviandoBanner(true);
    try {
      const url = await uploadArquivoPublico(file);
      onBannerChange(url);
      toast.success('Banner adicionado');
    } catch (e) {
      toast.error('Não foi possível enviar o banner: ' + e.message);
    }
    setEnviandoBanner(false);
  };

  const enviarArtes = async (files) => {
    if (!files?.length) return;
    setEnviandoArtes(true);
    try {
      const novas = [];
      for (const file of Array.from(files)) {
        const url = await uploadArquivoPublico(file);
        novas.push({ url, descricao: file.name });
      }
      onArtesChange([...(artes || []), ...novas]);
      toast.success(`${novas.length} arte(s) adicionada(s)`);
    } catch (e) {
      toast.error('Não foi possível enviar as artes: ' + e.message);
    }
    setEnviandoArtes(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700">Banner do topo da página</p>
        <p className="text-xs text-slate-500 mb-2">
          Proporção recomendada <strong>8:3 (paisagem)</strong> — ex: 1600 × 600 px. Mínimo 1200 × 450 px.
        </p>
        {bannerUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-slate-200">
            <img src={bannerUrl} alt="Banner" className="w-full aspect-[8/3] object-cover" />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={() => onBannerChange('')}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => bannerRef.current?.click()}
            className="w-full aspect-[8/3] border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
          >
            {enviandoBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-6 h-6 mb-1" />}
            <span className="text-sm">{enviandoBanner ? 'Enviando...' : 'Enviar banner'}</span>
          </button>
        )}
        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => enviarBanner(e.target.files?.[0])}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">Artes promocionais (aparecem ao longo da página)</p>
        <p className="text-xs text-slate-500 mb-2">
          Proporção recomendada <strong>1:1 (quadrada)</strong> — ex: 1080 × 1080 px.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(artes || []).map((arte, idx) => (
            <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200">
              <img src={arte.url} alt={arte.descricao || 'Arte'} className="w-full h-20 object-cover" />
              <button
                type="button"
                onClick={() => onArtesChange(artes.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => artesRef.current?.click()}
            className="h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
          >
            {enviandoArtes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-xs mt-1">{enviandoArtes ? '...' : 'Arte'}</span>
          </button>
        </div>
        <input
          ref={artesRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => enviarArtes(e.target.files)}
        />
      </div>
    </div>
  );
}