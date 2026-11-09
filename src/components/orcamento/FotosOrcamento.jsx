import React, { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Trash2, Loader2, Image, X } from 'lucide-react';
import { toast } from "sonner";

export default function FotosOrcamento({ atendimentoId, unidadeId, readOnly = false }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedFoto, setSelectedFoto] = useState(null);

  const { data: fotos = [] } = useQuery({
    queryKey: ['fotos_orcamento', atendimentoId],
    queryFn: () => base44.entities.FotoOrcamento.filter({ atendimento_id: atendimentoId }),
    enabled: !!atendimentoId,
  });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['fotos_orcamento', atendimentoId] });

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

      await base44.entities.FotoOrcamento.create({
        atendimento_id: atendimentoId,
        unidade_id: unidadeId,
        url: file_url,
        descricao: file.name || 'Foto do orçamento',
        usuario: user?.full_name || user?.email || 'Sistema',
      });

      recarregar();
      toast.success('Foto anexada ao orçamento!');
    } catch (err) {
      toast.error('Erro ao enviar a foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemover = async (foto) => {
    await base44.entities.FotoOrcamento.delete(foto.id);
    recarregar();
    toast.success('Foto removida');
  };

  return (
    <Card className="border-green-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Image className="w-5 h-5 text-green-600" />
          Fotos do Orçamento ({fotos.length})
        </CardTitle>
        {!readOnly && (
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="text-green-700 border-green-300"
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
          <div className="text-center py-6 text-slate-400">
            <Image className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma foto anexada ao orçamento</p>
            {!readOnly && (
              <p className="text-xs mt-1">A primeira foto é enviada no WhatsApp com o orçamento como legenda</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fotos.map((foto, index) => (
              <div key={foto.id} className="relative group cursor-pointer" onClick={() => setSelectedFoto(foto)}>
                <img
                  src={foto.url}
                  alt={foto.descricao || `Foto ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
                />
                {!readOnly && (
                  <button
                    onClick={e => { e.stopPropagation(); handleRemover(foto); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 bg-green-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    1ª do envio
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

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
          </div>
        )}
      </CardContent>
    </Card>
  );
}