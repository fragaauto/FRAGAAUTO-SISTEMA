import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Trash2, Loader2, Image, X } from 'lucide-react';
import { toast } from "sonner";

export default function FotosAtendimento({ atendimento, onUpdate, readOnly = false }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFoto, setSelectedFoto] = useState(null);

  const fotos = atendimento?.fotos || [];

  const handleUpload = async (file) => {
    if (!file) return;
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB.');
      return;
    }

    setUploading(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const novaFoto = {
        url: file_url,
        descricao: file.name || 'Foto',
        data_upload: new Date().toISOString(),
        usuario: user?.full_name || user?.email || 'Sistema'
      };

      const fotosAtualizadas = [...fotos, novaFoto];
      onUpdate({ fotos: fotosAtualizadas });
      toast.success('Foto anexada com sucesso!');
    } catch (err) {
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
      // Reset inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemover = (index) => {
    const fotosAtualizadas = fotos.filter((_, i) => i !== index);
    onUpdate({ fotos: fotosAtualizadas });
    toast.success('Foto removida');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Image className="w-5 h-5 text-blue-500" />
          Fotos do Atendimento ({fotos.length})
        </CardTitle>
        {!readOnly && (
          <div className="flex gap-2">
            {/* Input câmera (celular) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleUpload(e.target.files[0])}
            />
            {/* Input galeria/arquivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleUpload(e.target.files[0])}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="text-blue-600 border-blue-300"
            >
              <Camera className="w-4 h-4 mr-1" />
              Câmera
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Galeria
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {fotos.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Image className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma foto anexada</p>
            {!readOnly && (
              <p className="text-xs mt-1">Use "Câmera" para tirar uma foto ou "Galeria" para selecionar</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fotos.map((foto, index) => (
              <div key={index} className="relative group cursor-pointer" onClick={() => setSelectedFoto(foto)}>
                <img
                  src={foto.url}
                  alt={foto.descricao || `Foto ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
                />
                {!readOnly && (
                  <button
                    onClick={e => { e.stopPropagation(); handleRemover(index); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {foto.descricao && (
                  <p className="text-xs text-slate-500 mt-1 truncate">{foto.descricao}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lightbox simples */}
        {selectedFoto && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedFoto(null)}
          >
            <button
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
              onClick={() => setSelectedFoto(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedFoto.url}
              alt={selectedFoto.descricao}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
            {selectedFoto.descricao && (
              <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                {selectedFoto.descricao}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}