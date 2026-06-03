import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileDown, Eye, ArrowUpFromLine, ArrowDownToLine, Camera, PenLine, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

export default function HistoricoKitsTab() {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [itemFilter, setItemFilter] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const [exportando, setExportando] = useState(false);

  const { data: movs = [], isLoading } = useQuery({
    queryKey: ['movimentacoes'],
    queryFn: () => base44.entities.MovimentacaoFerramenta.list('-data_hora', 500),
  });

  // Apenas movimentações de kits (ou todas se quiser mostrar histórico geral)
  const filtered = movs.filter(m => {
    const matchSearch = !search ||
      m.responsavel_nome?.toLowerCase().includes(search.toLowerCase()) ||
      m.kit_nome?.toLowerCase().includes(search.toLowerCase()) ||
      m.ferramenta_nome?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === 'all' || m.tipo === tipoFilter;
    const matchItem = itemFilter === 'all' || m.item_tipo === itemFilter;
    const matchInicio = !dataInicio || (m.data_hora && new Date(m.data_hora) >= new Date(dataInicio));
    const matchFim = !dataFim || (m.data_hora && new Date(m.data_hora) <= new Date(dataFim + 'T23:59:59'));
    return matchSearch && matchTipo && matchItem && matchInicio && matchFim;
  });

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      const addPage = () => {
        doc.addPage();
        y = margin;
      };

      const checkY = (needed = 10) => {
        if (y + needed > pageH - margin) addPage();
      };

      // Cabeçalho
      doc.setFillColor(234, 88, 12);
      doc.rect(0, 0, pageW, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Histórico de Movimentações — Kits e Ferramentas', margin, 12);
      y = 25;

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} · Total: ${filtered.length} registro(s)`, margin, y);
      y += 8;

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

      for (const m of filtered) {
        checkY(50);

        // Cabeçalho do registro
        const tipoColor = m.tipo === 'Retirada' ? [59, 130, 246] : [34, 197, 94];
        doc.setFillColor(...tipoColor);
        doc.roundedRect(margin, y, pageW - margin * 2, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${m.tipo} — ${m.item_tipo}: ${m.kit_nome || m.ferramenta_nome || '—'}`, margin + 3, y + 5.5);
        y += 10;

        // Dados principais
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Responsável: ${m.responsavel_nome || '—'}`, margin + 3, y);
        y += 5;
        doc.text(`Data/Hora: ${m.data_hora ? format(new Date(m.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}`, margin + 3, y);
        y += 5;
        const statusLabel = m.status === 'Aberto' ? 'Em aberto' : 'Finalizado';
        doc.text(`Status: ${statusLabel}`, margin + 3, y);
        y += 5;
        if (m.observacao) {
          const lines = doc.splitTextToSize(`Obs: ${m.observacao}`, pageW - margin * 2 - 6);
          doc.text(lines, margin + 3, y);
          y += lines.length * 4.5;
        }

        // Assinatura
        if (m.assinatura && m.assinatura.startsWith('data:')) {
          checkY(30);
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.text('Assinatura:', margin + 3, y);
          y += 3;
          doc.addImage(m.assinatura, 'PNG', margin + 3, y, 60, 20);
          y += 23;
        }

        // Fotos
        if (m.fotos && m.fotos.length > 0) {
          checkY(10);
          doc.setTextColor(100, 116, 139);
          doc.setFontSize(8);
          doc.text(`Fotos (${m.fotos.length}):`, margin + 3, y);
          y += 4;

          for (const foto of m.fotos) {
            checkY(55);
            if (foto.url) {
              try {
                // Tenta carregar a imagem via fetch para base64
                const resp = await fetch(foto.url);
                const blob = await resp.blob();
                const base64 = await new Promise((res) => {
                  const reader = new FileReader();
                  reader.onloadend = () => res(reader.result);
                  reader.readAsDataURL(blob);
                });
                doc.addImage(base64, 'JPEG', margin + 3, y, 70, 50);
                if (foto.descricao) {
                  doc.setFontSize(7);
                  doc.setTextColor(100, 116, 139);
                  doc.text(foto.descricao, margin + 3, y + 52);
                  y += 4;
                }
                y += 53;
              } catch {
                doc.setFontSize(8);
                doc.setTextColor(180, 180, 180);
                doc.text('[Imagem não disponível]', margin + 3, y);
                y += 6;
              }
            }
          }
        }

        // Separador
        checkY(5);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
      }

      doc.save(`historico-ferramentas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar responsável ou item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="Retirada">Retiradas</SelectItem>
            <SelectItem value="Devolução">Devoluções</SelectItem>
          </SelectContent>
        </Select>
        <Select value={itemFilter} onValueChange={setItemFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os itens</SelectItem>
            <SelectItem value="Kit">Kits</SelectItem>
            <SelectItem value="Ferramenta">Ferramentas</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-36" placeholder="De" />
        <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-36" placeholder="Até" />
        <Button size="sm" onClick={exportarPDF} disabled={exportando || filtered.length === 0} className="bg-slate-700 hover:bg-slate-800 text-white">
          <FileDown className="w-4 h-4 mr-1" /> {exportando ? 'Gerando...' : 'Exportar PDF'}
        </Button>
      </div>

      <p className="text-xs text-slate-400 mb-3">{filtered.length} registro(s) encontrado(s)</p>

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Nenhum registro encontrado.</div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(m => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:border-orange-200 transition-colors cursor-pointer" onClick={() => setDetalhe(m)}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${m.tipo === 'Retirada' ? 'bg-blue-50' : 'bg-green-50'}`}>
                {m.tipo === 'Retirada' ? <ArrowUpFromLine className="w-4 h-4 text-blue-500" /> : <ArrowDownToLine className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${m.tipo === 'Retirada' ? 'text-blue-600 border-blue-300' : 'text-green-600 border-green-300'}`}>{m.tipo}</Badge>
                  <span className="font-semibold text-sm text-slate-800">{m.kit_nome || m.ferramenta_nome || '—'}</span>
                  <Badge variant="outline" className="text-xs text-slate-500">{m.item_tipo}</Badge>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                  <span>👤 {m.responsavel_nome}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{m.data_hora ? format(new Date(m.data_hora), 'dd/MM/yy HH:mm') : '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {m.assinatura && <span title="Tem assinatura"><PenLine className="w-4 h-4 text-purple-400" /></span>}
                {m.fotos?.length > 0 && <span title={`${m.fotos.length} foto(s)`} className="flex items-center gap-1 text-xs text-orange-500"><Camera className="w-4 h-4" />{m.fotos.length}</span>}
                <Badge variant="outline" className={`text-xs ${m.status === 'Aberto' ? 'text-amber-600 border-amber-300' : 'text-green-600 border-green-300'}`}>{m.status}</Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7"><Eye className="w-4 h-4 text-slate-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detalhe?.tipo === 'Retirada' ? <ArrowUpFromLine className="w-4 h-4 text-blue-500" /> : <ArrowDownToLine className="w-4 h-4 text-green-500" />}
              {detalhe?.tipo} — {detalhe?.kit_nome || detalhe?.ferramenta_nome}
            </DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Responsável</p>
                  <p className="font-semibold text-slate-800">{detalhe.responsavel_nome || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Data/Hora</p>
                  <p className="font-semibold text-slate-800">{detalhe.data_hora ? format(new Date(detalhe.data_hora), "dd/MM/yyyy 'às' HH:mm") : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Tipo de Item</p>
                  <p className="font-semibold text-slate-800">{detalhe.item_tipo}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <Badge variant="outline" className={`text-xs ${detalhe.status === 'Aberto' ? 'text-amber-600 border-amber-300' : 'text-green-600 border-green-300'}`}>{detalhe.status}</Badge>
                </div>
              </div>

              {detalhe.observacao && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Observação</p>
                  <p className="text-sm text-slate-700">{detalhe.observacao}</p>
                </div>
              )}

              {detalhe.assinatura && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> Assinatura</p>
                  <div className="border border-slate-200 rounded-lg bg-slate-50 p-2 inline-block">
                    <img src={detalhe.assinatura} alt="Assinatura" className="max-h-24 max-w-full" />
                  </div>
                </div>
              )}

              {detalhe.fotos?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Fotos ({detalhe.fotos.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {detalhe.fotos.map((foto, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-slate-200">
                        <img src={foto.url} alt={foto.descricao || `Foto ${idx + 1}`} className="w-full h-36 object-cover" />
                        {foto.descricao && <p className="text-xs text-slate-500 px-2 py-1 bg-slate-50">{foto.descricao}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-slate-700 hover:bg-slate-800 text-white"
                onClick={async () => {
                  setExportando(true);
                  // Exportar apenas este registro
                  const m = detalhe;
                  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                  const pageW = doc.internal.pageSize.getWidth();
                  const margin = 15;
                  let y = margin;

                  doc.setFillColor(234, 88, 12);
                  doc.rect(0, 0, pageW, 18, 'F');
                  doc.setTextColor(255, 255, 255);
                  doc.setFontSize(13);
                  doc.setFont('helvetica', 'bold');
                  doc.text(`${m.tipo} — ${m.kit_nome || m.ferramenta_nome || '—'}`, margin, 12);
                  y = 26;

                  doc.setTextColor(30, 41, 59);
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.text(`Responsável: ${m.responsavel_nome || '—'}`, margin, y); y += 6;
                  doc.text(`Data/Hora: ${m.data_hora ? format(new Date(m.data_hora), "dd/MM/yyyy 'às' HH:mm") : '—'}`, margin, y); y += 6;
                  doc.text(`Status: ${m.status}`, margin, y); y += 6;
                  if (m.observacao) {
                    const lines = doc.splitTextToSize(`Obs: ${m.observacao}`, pageW - margin * 2);
                    doc.text(lines, margin, y); y += lines.length * 5;
                  }
                  y += 4;

                  if (m.assinatura && m.assinatura.startsWith('data:')) {
                    doc.setTextColor(100, 116, 139);
                    doc.setFontSize(9);
                    doc.text('Assinatura:', margin, y); y += 4;
                    doc.addImage(m.assinatura, 'PNG', margin, y, 70, 25);
                    y += 30;
                  }

                  if (m.fotos?.length > 0) {
                    doc.setTextColor(100, 116, 139);
                    doc.setFontSize(9);
                    doc.text(`Fotos:`, margin, y); y += 4;
                    for (const foto of m.fotos) {
                      if (foto.url) {
                        try {
                          const resp = await fetch(foto.url);
                          const blob = await resp.blob();
                          const base64 = await new Promise((res) => { const reader = new FileReader(); reader.onloadend = () => res(reader.result); reader.readAsDataURL(blob); });
                          if (y + 60 > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
                          doc.addImage(base64, 'JPEG', margin, y, 80, 60);
                          if (foto.descricao) { doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text(foto.descricao, margin, y + 62); y += 4; }
                          y += 65;
                        } catch { y += 5; }
                      }
                    }
                  }

                  doc.save(`movimentacao-${m.id?.slice(0, 8) || 'kit'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
                  setExportando(false);
                }}
                disabled={exportando}
              >
                <FileDown className="w-4 h-4 mr-2" /> Exportar este registro em PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}