import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Megaphone, Loader2, Check, ExternalLink } from 'lucide-react';
import { useUnidade } from '@/lib/UnidadeContext';
import { brl, linkPublico, promocaoEncerrada } from '@/lib/promocao';

export default function PopupPromocao() {
  const { user } = useUnidade();
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [fechando, setFechando] = useState(false);

  const { data: promocoes = [] } = useQuery({
    queryKey: ['promocoes-popup'],
    queryFn: async () => {
      const page = await base44.entities.Promocao.list({ sort: '-created_date', limit: 20 });
      return page.items || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: lidas = [] } = useQuery({
    queryKey: ['promocoes-lidas', user?.email],
    queryFn: () => base44.entities.PromocaoLida.filter({ usuario_email: user.email }),
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  const naoLidas = useMemo(() => {
    const vistas = new Set((lidas || []).map((l) => l.promocao_id));
    return (promocoes || []).filter(
      (p) => p.popup_ativo !== false && !promocaoEncerrada(p) && !vistas.has(p.id)
    );
  }, [promocoes, lidas]);

  useEffect(() => {
    if (!user || naoLidas.length === 0) return;
    const timer = setTimeout(() => setAberto(true), 2200);
    return () => clearTimeout(timer);
  }, [user, naoLidas.length]);

  const marcarComoLida = async () => {
    setAberto(false);
    if (naoLidas.length === 0 || !user?.email) return;
    setFechando(true);
    try {
      await base44.entities.PromocaoLida.bulkCreate(
        naoLidas.map((p) => ({ promocao_id: p.id, usuario_email: user.email }))
      );
      qc.invalidateQueries({ queryKey: ['promocoes-lidas', user.email] });
    } catch {
      // reaparece na próxima visita
    }
    setFechando(false);
  };

  if (naoLidas.length === 0) return null;

  const promocao = naoLidas[0];

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && marcarComoLida()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {promocao.banner_url ? (
          <div className="relative">
            <img src={promocao.banner_url} alt={promocao.titulo} className="w-full h-36 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-white font-bold text-lg leading-tight">{promocao.titulo}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5" /> {promocao.titulo}
              </DialogTitle>
              <DialogDescription className="text-orange-50">Ofertas especiais para você</DialogDescription>
            </DialogHeader>
          </div>
        )}

        <div className="px-5 py-3 max-h-[52vh] overflow-y-auto space-y-2">
          {promocao.texto && <p className="text-sm text-slate-600 whitespace-pre-wrap">{promocao.texto}</p>}
          {(promocao.produtos || []).map((p) => (
            <div key={p.produto_id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-2">
              {p.foto_url ? (
                <img src={p.foto_url} alt={p.nome} className="w-12 h-12 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-5 h-5 text-orange-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{p.nome}</p>
                <p className="text-xs text-slate-500">
                  <span className="line-through mr-1">{brl(p.valor_original)}</span>
                  <span className="text-orange-600 font-bold">{brl(p.valor_promocional)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-4 pt-2 border-t border-slate-100 space-y-2">
          {naoLidas.length > 1 && (
            <p className="text-xs text-slate-500">{naoLidas.length} promoções ativas. Veja todas na página de ofertas.</p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(linkPublico(promocao.id), '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" /> Ver a página de ofertas
          </Button>
          <Button onClick={marcarComoLida} disabled={fechando} className="w-full bg-orange-500 hover:bg-orange-600">
            {fechando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}