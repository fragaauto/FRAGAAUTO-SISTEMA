import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, MessageCircle, CheckCircle2 } from 'lucide-react';

const FORMA_LABEL = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  faturado: 'Faturado',
};

export default function ReciboAtendimento({ atendimento, config }) {
  const reciboRef = useRef(null);

  const itensAprovados = [
    ...(atendimento.itens_queixa || []).filter(i => i.status_aprovacao === 'aprovado'),
    ...(atendimento.itens_orcamento || []).filter(i => i.status_aprovacao === 'aprovado'),
  ];

  const temDecisoes = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])].some(
    i => i.status_aprovacao === 'aprovado' || i.status_aprovacao === 'reprovado'
  );

  const valorFinalPago = atendimento.valor_final_pago ?? atendimento.valor_final ?? 0;
  const desconto = atendimento.desconto_pagamento ?? 0;
  const formas = atendimento.formas_pagamento_lancamento || [];

  const gerarTextoWhatsApp = () => {
    const empresa = config?.nome_empresa || 'Auto Center';
    const cliente = atendimento.cliente_nome || '';
    const veiculo = `${atendimento.placa} - ${atendimento.modelo || ''}`;
    const data = atendimento.data_pagamento
      ? new Date(atendimento.data_pagamento).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');

    let texto = `*🧾 RECIBO DE SERVIÇO*\n`;
    texto += `*${empresa}*\n`;
    if (config?.telefone) texto += `📞 ${config.telefone}\n`;
    texto += `\n*Cliente:* ${cliente}\n`;
    texto += `*Veículo:* ${veiculo}\n`;
    texto += `*Data:* ${data}\n\n`;

    if (temDecisoes && itensAprovados.length > 0) {
      texto += `*Serviços realizados:*\n`;
      itensAprovados.forEach(item => {
        texto += `• ${item.nome} (${item.quantidade}x) — R$ ${Number(item.valor_total).toFixed(2)}\n`;
      });
    }

    if (desconto > 0) texto += `\n*Desconto:* - R$ ${desconto.toFixed(2)}\n`;

    texto += `\n*TOTAL PAGO: R$ ${valorFinalPago.toFixed(2)}*\n`;

    if (formas.length > 0) {
      texto += `\n*Forma(s) de pagamento:*\n`;
      formas.forEach(f => {
        texto += `• ${FORMA_LABEL[f.forma] || f.forma}: R$ ${Number(f.valor).toFixed(2)}\n`;
      });
    }

    if (atendimento.obs_externa) {
      texto += `\n📝 *Observações:*\n${atendimento.obs_externa}\n`;
    }

    texto += `\n✅ Obrigado pela preferência!`;
    return texto;
  };

  const handlePrint = () => {
    const empresa = config?.nome_empresa || 'Auto Center';
    const cliente = atendimento.cliente_nome || '';
    const veiculo = `${atendimento.placa} - ${atendimento.modelo || ''}`;
    const data = atendimento.data_pagamento
      ? new Date(atendimento.data_pagamento).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');

    const html = `
      <html><head><title>Recibo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
        h2 { text-align: center; margin: 0; }
        .subtitle { text-align: center; color: #555; font-size: 13px; margin-bottom: 16px; }
        .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
        .total { font-weight: bold; font-size: 16px; }
        .obs { font-size: 12px; color: #555; margin-top: 8px; }
        .footer { text-align: center; margin-top: 16px; font-size: 12px; color: #888; }
      </style></head><body>
      <h2>${empresa}</h2>
      <div class="subtitle">${config?.endereco || ''}</div>
      <div class="divider"></div>
      <div class="row"><span><b>Cliente:</b> ${cliente}</span></div>
      <div class="row"><span><b>Veículo:</b> ${veiculo}</span></div>
      <div class="row"><span><b>Data:</b> ${data}</span></div>
      <div class="divider"></div>
      ${temDecisoes && itensAprovados.length > 0 ? `
        <b>Serviços realizados:</b>
        ${itensAprovados.map(i => `<div class="row"><span>${i.nome} (${i.quantidade}x)</span><span>R$ ${Number(i.valor_total).toFixed(2)}</span></div>`).join('')}
        <div class="divider"></div>
      ` : ''}
      ${desconto > 0 ? `<div class="row"><span>Desconto</span><span>- R$ ${desconto.toFixed(2)}</span></div>` : ''}
      <div class="row total"><span>TOTAL PAGO</span><span>R$ ${valorFinalPago.toFixed(2)}</span></div>
      ${formas.length > 0 ? `
        <div class="divider"></div>
        <b>Pagamento:</b>
        ${formas.map(f => `<div class="row"><span>${FORMA_LABEL[f.forma] || f.forma}</span><span>R$ ${Number(f.valor).toFixed(2)}</span></div>`).join('')}
      ` : ''}
      ${atendimento.obs_externa ? `<div class="divider"></div><div class="obs"><b>Observações:</b> ${atendimento.obs_externa}</div>` : ''}
      <div class="divider"></div>
      <div class="footer">Obrigado pela preferência!</div>
      </body></html>
    `;

    const win = window.open('', '_blank', 'width=500,height=700');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const handleWhatsApp = () => {
    const texto = gerarTextoWhatsApp();
    const tel = atendimento.cliente_telefone?.replace(/\D/g, '') || '';
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <Card className="border-2 border-green-200 bg-green-50" ref={reciboRef}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          🧾 Recibo do Atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cabeçalho */}
        <div className="text-xs text-slate-500 space-y-0.5">
          <div className="flex justify-between">
            <span>Cliente:</span>
            <span className="font-medium text-slate-700">{atendimento.cliente_nome || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Veículo:</span>
            <span className="font-medium text-slate-700">{atendimento.placa} — {atendimento.modelo}</span>
          </div>
          {atendimento.data_pagamento && (
            <div className="flex justify-between">
              <span>Data pagamento:</span>
              <span className="font-medium text-slate-700">
                {new Date(atendimento.data_pagamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-green-200" />

        {/* Itens */}
        {temDecisoes && itensAprovados.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600">Serviços realizados:</p>
            {itensAprovados.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs text-slate-700">
                <span>{item.nome} {item.quantidade > 1 ? `(${item.quantidade}x)` : ''}</span>
                <span>R$ {Number(item.valor_total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Desconto + Total */}
        {desconto > 0 && (
          <div className="flex justify-between text-xs text-green-700">
            <span>Desconto</span>
            <span>- R$ {desconto.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm text-green-800 border-t border-green-300 pt-2">
          <span>TOTAL PAGO</span>
          <span>R$ {valorFinalPago.toFixed(2)}</span>
        </div>

        {/* Formas de pagamento */}
        {formas.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Pagamento:</p>
            {formas.map((f, idx) => (
              <div key={idx} className="flex justify-between text-xs text-slate-600">
                <Badge variant="outline" className="text-xs py-0 h-5">{FORMA_LABEL[f.forma] || f.forma}</Badge>
                <span>R$ {Number(f.valor).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Obs externa */}
        {atendimento.obs_externa && (
          <div className="p-2 bg-white border border-green-200 rounded text-xs text-slate-600">
            <span className="font-semibold">Obs: </span>{atendimento.obs_externa}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={handlePrint} className="flex-1 border-slate-300">
            <Printer className="w-3 h-3 mr-1" /> Imprimir
          </Button>
          <Button size="sm" onClick={handleWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}