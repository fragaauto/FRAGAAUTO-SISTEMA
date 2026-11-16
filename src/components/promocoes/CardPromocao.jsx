import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Send, Link2, ExternalLink, Pencil, Trash2, Power, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { brl, linkPublico, promocaoEncerrada } from '@/lib/promocao';

export default function CardPromocao({ promocao, interesses, onEditar, onDisparar, onExcluir, onAlternarAtiva }) {
  const encerrada = promocaoEncerrada(promocao);
  const link = linkPublico(promocao.id);

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex gap-4">
          {promocao.banner_url ? (
            <img src={promocao.banner_url} alt={promocao.titulo} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-7 h-7 text-orange-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{promocao.titulo}</p>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <Badge className={encerrada ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-800'}>
                    {encerrada ? 'Encerrada' : 'Ativa'}
                  </Badge>
                  {promocao.popup_ativo && !encerrada && (
                    <Badge className="bg-purple-100 text-purple-800">Pop-up</Badge>
                  )}
                  <span className="text-xs text-slate-500">{promocao.produtos?.length || 0} produto(s)</span>
                  {promocao.data_fim && (
                    <span className="text-xs text-slate-500">até {promocao.data_fim.split('-').reverse().join('/')}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" onClick={() => onEditar(promocao)} title="Editar">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onAlternarAtiva(promocao)} title={promocao.ativa === false ? 'Ativar' : 'Desativar'}>
                  <Power className={`w-4 h-4 ${promocao.ativa === false ? 'text-slate-400' : 'text-green-600'}`} />
                </Button>
                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => onExcluir(promocao)} title="Excluir">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {(promocao.produtos || []).slice(0, 4).map((p) => (
                <span key={p.produto_id} className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                  {p.nome} • {brl(p.valor_promocional)}
                </span>
              ))}
              {(promocao.produtos || []).length > 4 && (
                <span className="text-xs text-slate-500">+{promocao.produtos.length - 4}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onDisparar(promocao)}>
                <Send className="w-3 h-3 mr-1" /> Disparar
              </Button>
              <Button size="sm" variant="outline" onClick={copiarLink}>
                <Link2 className="w-3 h-3 mr-1" /> Copiar link
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(link, '_blank')}>
                <ExternalLink className="w-3 h-3 mr-1" /> Ver página
              </Button>
              <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
                <Users className="w-3 h-3" /> {interesses} interesse(s) • {promocao.total_enviados || 0} envio(s)
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Eye className="w-3 h-3" /> {promocao.total_visitas || 0} visita(s)
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}