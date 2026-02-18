import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageCircle, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function OrdemServicoTecnica({ atendimento, config, onClose }) {
  if (!atendimento) return null;

  const nomeEmpresa = config?.nome_empresa || 'FRAGA AUTO PORTAS';
  const logoUrl = config?.logo_url || null;

  // Filtrar apenas itens aprovados (deduplicar por produto_id)
  const idsQueixa = new Set((atendimento.itens_queixa || []).filter(i => i.status_aprovacao === 'aprovado').map(i => i.produto_id));
  const itensAprovados = [
    ...(atendimento.itens_queixa?.filter(item => item.status_aprovacao === 'aprovado') || []),
    ...(atendimento.itens_orcamento?.filter(item => item.status_aprovacao === 'aprovado' && !idsQueixa.has(item.produto_id)) || [])
  ];

  const sep = '================================';
  const sepFino = '--------------------------------';

  const gerarTextoOS = () => {
    const hoje = format(new Date(), 'dd/MM/yyyy');
    let t = '';
    t += `${sep}\n`;
    t += `🔧 *ORDEM DE SERVIÇO TÉCNICA* 🔧\n`;
    t += `${sep}\n`;
    t += `📋 *OS:* ${atendimento.id?.slice(-8).toUpperCase()}\n`;
    t += `📅 *Data:* ${hoje}\n`;
    t += `${sepFino}\n`;
    t += `🚗 *VEÍCULO*\n`;
    t += `Placa: *${atendimento.placa}*\n`;
    t += `Modelo: *${atendimento.modelo}*\n`;
    if (atendimento.ano) t += `Ano: ${atendimento.ano}\n`;
    t += `${sepFino}\n`;
    t += `👤 *CLIENTE*\n`;
    t += `Nome: *${(atendimento.cliente_nome || '-').toUpperCase()}*\n`;
    t += `Tel: ${atendimento.cliente_telefone || '-'}\n`;
    t += `${sep}\n`;
    t += `✅ *SERVIÇOS APROVADOS: ${itensAprovados.length}*\n`;
    t += `${sep}\n`;
    if (itensAprovados.length === 0) {
      t += `⚠️ Nenhum serviço aprovado ainda.\n`;
    } else {
      itensAprovados.forEach((item, idx) => {
        t += `\n*${idx + 1}. ${item.nome}*`;
        if (item.quantidade > 1) t += ` _(x${item.quantidade})_`;
        t += `\n`;
        if (item.observacao_item) t += `   📝 _${item.observacao_item}_\n`;
        t += `   📍 Local/Porta: _________________\n`;
        t += `   ◻ Pendente  ◻ Em Andamento  ◻ Concluído\n`;
      });
    }
    t += `\n${sepFino}\n`;
    t += `☑ *CHECKLIST FINAL*\n`;
    t += `◻ Teste de funcionamento\n`;
    t += `◻ Limpeza realizada\n`;
    t += `◻ Ferramentas recolhidas\n`;
    t += `${sep}\n`;
    t += `✍ Técnico: ______________________\n`;
    t += `📅 Conclusão: ____/____/____\n`;
    t += `${sep}\n`;
    t += `_${nomeEmpresa}_`;
    return t;
  };

  const textoOS = gerarTextoOS();

  const handleCopiar = () => {
    navigator.clipboard.writeText(textoOS);
    toast.success('Texto da OS copiado para área de transferência!');
  };

  const handleWhatsApp = () => {
    const mensagem = encodeURIComponent(textoOS);
    window.open(`https://wa.me/?text=${mensagem}`, '_blank');
  };

  const handleImprimir = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const hoje = format(new Date(), 'dd/MM/yyyy');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>OS - ${atendimento.placa}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0 auto;
              padding: 4mm;
              background: white;
              color: #000;
            }
            .logo { text-align: center; margin-bottom: 6px; }
            .logo img { max-width: 40mm; max-height: 20mm; object-fit: contain; }
            .empresa { text-align: center; font-weight: bold; font-size: 13px; margin-bottom: 4px; }
            .sep { border: none; border-top: 1px dashed #000; margin: 6px 0; }
            .title { text-align: center; font-weight: bold; font-size: 13px; letter-spacing: 1px; }
            .section-title { font-weight: bold; margin: 6px 0 2px; }
            .item { margin: 4px 0; }
            .item-obs { margin-left: 8px; font-size: 11px; }
            .checklist { margin: 2px 0; }
            .footer { text-align: center; font-size: 11px; margin-top: 6px; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
            .print-button {
              position: fixed; top: 10px; right: 10px;
              background: #f97316; color: white; border: none;
              padding: 8px 16px; border-radius: 4px; font-size: 12px;
              font-weight: bold; cursor: pointer;
            }
            @media print { .print-button { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>

          ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="Logo" /></div>` : ''}
          <div class="empresa">${nomeEmpresa}</div>

          <hr class="sep"/>
          <div class="title">ORDEM DE SERVICO</div>
          <hr class="sep"/>

          <div>OS: ${atendimento.id?.slice(-8).toUpperCase()}</div>
          <div>Data: ${hoje}</div>

          <hr class="sep"/>
          <div class="section-title">VEICULO</div>
          <div>Placa: ${atendimento.placa}</div>
          <div>Modelo: ${atendimento.modelo}</div>
          ${atendimento.ano ? `<div>Ano: ${atendimento.ano}</div>` : ''}

          <hr class="sep"/>
          <div class="section-title">CLIENTE</div>
          <div>Nome: ${(atendimento.cliente_nome || '-').toUpperCase()}</div>
          <div>Tel: ${atendimento.cliente_telefone || '-'}</div>

          <hr class="sep"/>
          <div class="section-title">SERVICOS APROVADOS: ${itensAprovados.length}</div>
          ${itensAprovados.length === 0
            ? '<div>Nenhum servico aprovado ainda.</div>'
            : itensAprovados.map((item, idx) => `
              <div class="item">${idx + 1}. ${item.nome}${item.quantidade > 1 ? ` (x${item.quantidade})` : ''}</div>
              ${item.observacao_item ? `<div class="item-obs">Obs: ${item.observacao_item}</div>` : ''}
              <div class="item-obs">Local: _________________</div>
            `).join('')}

          <hr class="sep"/>
          <div class="section-title">CHECKLIST FINAL</div>
          <div class="checklist">[ ] Teste funcionamento</div>
          <div class="checklist">[ ] Limpeza realizada</div>
          <div class="checklist">[ ] Ferramentas recolhidas</div>

          <hr class="sep"/>
          <div>Tecnico: ______________________</div>
          <div>Conclusao: ____/____/____</div>
          <hr class="sep"/>
          <div class="footer">${nomeEmpresa}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ordem de Serviço - Área Técnica</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Documentação técnica dos serviços aprovados pelo cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview do Texto */}
          <div>
            <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <span>Ordem de Serviço - Texto</span>
              <Badge className="bg-slate-700">Área Técnica</Badge>
            </h3>
            <Textarea
              value={textoOS}
              readOnly
              className="font-mono text-xs min-h-[400px] bg-slate-50"
            />
          </div>

          {/* Botões de Ação */}
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={handleCopiar} variant="outline" className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={handleWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button onClick={handleImprimir} className="w-full bg-orange-600 hover:bg-orange-700">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}