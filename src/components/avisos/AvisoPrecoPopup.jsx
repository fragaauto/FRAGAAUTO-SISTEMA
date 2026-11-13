import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Megaphone, Loader2, Check } from 'lucide-react';
import { useUnidade } from '@/lib/UnidadeContext';
import ItemAvisoPreco from '@/components/avisos/ItemAvisoPreco';

export default function AvisoPrecoPopup() {
  const { user } = useUnidade();
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [fechando, setFechando] = useState(false);

  const { data: avisos = [] } = useQuery({
    queryKey: ['avisos-preco'],
    queryFn: async () => {
      const page = await base44.entities.AvisoPreco.list({ sort: '-created_date', limit: 30 });
      return page.items || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: lidos = [] } = useQuery({
    queryKey: ['avisos-preco-lidos', user?.email],
    queryFn: () => base44.entities.AvisoPrecoLido.filter({ usuario_email: user.email }),
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  const naoLidos = useMemo(() => {
    const vistos = new Set((lidos || []).map((l) => l.aviso_id));
    return (avisos || []).filter((a) => !vistos.has(a.id));
  }, [avisos, lidos]);

  // Junta os itens de todos os avisos não lidos (o mais recente prevalece por produto)
  const itens = useMemo(() => {
    const mapa = new Map();
    [...naoLidos].reverse().forEach((aviso) => {
      (aviso.itens || []).forEach((item) => {
        mapa.set(item.produto_id || item.nome, item);
      });
    });
    return Array.from(mapa.values());
  }, [naoLidos]);

  useEffect(() => {
    if (!user || itens.length === 0) return;
    const timer = setTimeout(() => setAberto(true), 1500);
    return () => clearTimeout(timer);
  }, [user, itens.length]);

  const marcarComoLido = async () => {
    setAberto(false);
    if (naoLidos.length === 0 || !user?.email) return;
    setFechando(true);
    try {
      await base44.entities.AvisoPrecoLido.bulkCreate(
        naoLidos.map((a) => ({ aviso_id: a.id, usuario_email: user.email }))
      );
      qc.invalidateQueries({ queryKey: ['avisos-preco-lidos', user.email] });
    } catch {
      // se falhar, o anúncio reaparece na próxima visita
    }
    setFechando(false);
  };

  if (itens.length === 0) return null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && marcarComoLido()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Comunicado de preços
            </DialogTitle>
            <DialogDescription className="text-orange-50">
              Houve alteração de preço nos produtos. Confira os novos valores abaixo.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 py-2 max-h-[55vh] overflow-y-auto">
          {itens.map((item, idx) => (
            <ItemAvisoPreco key={`${item.produto_id || item.nome}-${idx}`} item={item} />
          ))}
        </div>

        <div className="px-5 pb-4 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-3">
            {itens.length} produto(s) com preço atualizado. Este aviso aparece apenas uma vez.
          </p>
          <Button onClick={marcarComoLido} disabled={fechando} className="w-full bg-orange-500 hover:bg-orange-600">
            {fechando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Entendi, vi os preços
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}