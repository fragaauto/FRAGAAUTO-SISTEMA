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

function fmtData(val) {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoeda(val) {
  return `R$ ${Number(val || 0).toFixed(2)}`;
}

export default function ReciboAtendimento({ atendimento, config }) {
  const reciboRef = useRef(null);

  const itensAprovados = [
    ...(atendimento.itens_queixa || []).filter(i => i.status_aprovacao === 'aprovado'),
    ...(atendimento.itens_orcamento || []).filter(i => i.status_aprovacao === 'aprovado'),
  ];

  // Deduplicar por produto_id
  const idsVistos = new Set();
  const itensSemDuplicata = itensAprovados.filter(i => {
    if (i.produto_id && idsVistos.has(i.produto_id)) return false;
    if (i.produto_id) idsVistos.add(i.produto_id);
    return true;
  });

  const temItens = itensSemDuplicata.length > 0;

  const valorFinalPago = atendimento.valor_final_pago ?? atendimento.valor_final ?? 0;
  const desconto = atendimento.desconto_pagamento ?? atendimento.desconto ?? 0;
  const formas = atendimento.formas_pagamento_lancamento || [];
  const formaUnica = atendimento.forma_pagamento_lancamento;
  const obsCliente = atendimento.obs_externa || '';
  const tecnicosResp = atendimento.tecnicos_responsaveis || [];

  const dataServico = atendimento.data_pagamento || atendimento.data_entrada || atendimento.created_date;
  const osNum = atendimento.numero_os ? `OS #${String(atendimento.numero_os).padStart(6, '0')}` : '';

  const gerarTextoWhatsApp = () => {
    const empresa = config?.nome_empresa || 'Auto Center';
    const cnpj = config?.cnpj ? `CNPJ: ${config.cnpj}` : '';
    const tel = config?.telefone ? `📞 ${config.telefone}` : '';

    let texto = `*🧾 COMPROVANTE DE SERVIÇO*\n`;
    texto += `*${empresa}*\n`;
    if (cnpj) texto += `${cnpj}\n`;
    if (config?.endereco) texto += `📍 ${config.endereco}\n`;
    if (tel) texto += `${tel}\n`;
    texto += `\n`;

    if (osNum) texto += `*${osNum}*\n`;
    texto += `*Data:* ${fmtData(dataServico)}\n\n`;

    texto += `*CLIENTE*\n`;
    texto += `Nome: ${atendimento.cliente_nome || '-'}\n`;
    if (atendimento.cliente_telefone) texto += `Telefone: ${atendimento.cliente_telefone}\n`;
    if (atendimento.cliente_cpf) texto += `CPF/CNPJ: ${atendimento.cliente_cpf}\n`;
    texto += `\n`;

    texto += `*VEÍCULO*\n`;
    texto += `Placa: ${atendimento.placa || '-'}\n`;
    texto += `Modelo: ${atendimento.marca ? `${atendimento.marca} ` : ''}${atendimento.modelo || '-'}${atendimento.ano ? ` (${atendimento.ano})` : ''}\n`;
    if (atendimento.km_atual) texto += `KM: ${atendimento.km_atual}\n`;
    texto += `\n`;

    if (temItens) {
      texto += `*SERVIÇOS REALIZADOS*\n`;
      itensSemDuplicata.forEach(item => {
        texto += `• ${item.nome} (${item.quantidade}x) — ${fmtMoeda(item.valor_total)}\n`;
      });
      texto += `\n`;
    }

    if (desconto > 0) texto += `Desconto: - ${fmtMoeda(desconto)}\n`;
    texto += `*TOTAL: ${fmtMoeda(valorFinalPago)}*\n`;

    if (formas.length > 0) {
      texto += `\n*Pagamento:*\n`;
      formas.forEach(f => {
        texto += `• ${FORMA_LABEL[f.forma] || f.forma}: ${fmtMoeda(f.valor)}\n`;
      });
    } else if (formaUnica) {
      texto += `\n*Pagamento:* ${FORMA_LABEL[formaUnica] || formaUnica}\n`;
    }

    if (tecnicosResp.length > 0) texto += `\n*Técnico(s):* ${tecnicosResp.map(t => t.nome).join(', ')}\n`;
    else if (atendimento.tecnico) texto += `\n*Técnico:* ${atendimento.tecnico}\n`;
    if (obsCliente) texto += `\n📝 *Observações:*\n${obsCliente}\n`;

    texto += `\n✅ Obrigado pela preferência!`;
    return texto;
  };

  const handlePrint = () => {
    const empresa = config?.nome_empresa || 'Auto Center';

    const itensHtml = temItens
      ? `<div style="font-weight:bold;margin-top:12px;margin-bottom:4px">SERVIÇOS REALIZADOS</div>
         ${itensSemDuplicata.map(i => `
           <div style="display:flex;justify-content:space-between;font-size:12px;margin:2px 0">
             <span>${i.nome} ${i.quantidade > 1 ? `(${i.quantidade}x)` : ''}</span>
             <span>${fmtMoeda(i.valor_total)}</span>
           </div>`).join('')}`
      : '';

    const descontoHtml = desconto > 0
      ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#16a34a"><span>Desconto</span><span>- ${fmtMoeda(desconto)}</span></div>`
      : '';

    const formasHtml = formas.length > 0
      ? `<div style="font-weight:bold;font-size:12px;margin-top:8px">Pagamento:</div>
         ${formas.map(f => `
           <div style="display:flex;justify-content:space-between;font-size:12px">
             <span>${FORMA_LABEL[f.forma] || f.forma}</span>
             <span>${fmtMoeda(f.valor)}</span>
           </div>`).join('')}`
      : formaUnica
        ? `<div style="font-size:12px"><b>Pagamento:</b> ${FORMA_LABEL[formaUnica] || formaUnica}</div>`
        : '';

    const html = `
      <html><head><title>Comprovante de Serviço</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; color: #1e293b; }
        h2 { text-align: center; margin: 0 0 4px; font-size: 18px; }
        .center { text-align: center; color: #555; font-size: 12px; }
        .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
        .section-title { font-weight: bold; font-size: 12px; color: #555; margin: 8px 0 4px; text-transform: uppercase; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin: 3px 0; }
        .total { font-weight: bold; font-size: 16px; border-top: 2px solid #1e293b; padding-top: 6px; margin-top: 6px; }
        .footer { text-align: center; margin-top: 16px; font-size: 12px; color: #888; }
        .os { text-align:center; font-size: 13px; font-weight:bold; margin-bottom: 4px; }
      </style></head><body>
      <h2>${empresa}</h2>
      ${config?.cnpj ? `<div class="center">CNPJ: ${config.cnpj}</div>` : ''}
      ${config?.endereco ? `<div class="center">${config.endereco}</div>` : ''}
      ${config?.telefone ? `<div class="center">Tel: ${config.telefone}</div>` : ''}
      <div class="divider"></div>
      ${osNum ? `<div class="os">${osNum}</div>` : ''}
      <div class="row"><span><b>Data:</b></span><span>${fmtData(dataServico)}</span></div>
      <div class="divider"></div>
      <div class="section-title">Cliente</div>
      <div class="row"><span>Nome:</span><span>${atendimento.cliente_nome || '-'}</span></div>
      ${atendimento.cliente_telefone ? `<div class="row"><span>Telefone:</span><span>${atendimento.cliente_telefone}</span></div>` : ''}
      ${atendimento.cliente_cpf ? `<div class="row"><span>CPF/CNPJ:</span><span>${atendimento.cliente_cpf}</span></div>` : ''}
      <div class="divider"></div>
      <div class="section-title">Veículo</div>
      <div class="row"><span>Placa:</span><span>${atendimento.placa || '-'}</span></div>
      <div class="row"><span>Modelo:</span><span>${atendimento.marca ? atendimento.marca + ' ' : ''}${atendimento.modelo || '-'}${atendimento.ano ? ' (' + atendimento.ano + ')' : ''}</span></div>
      ${atendimento.km_atual ? `<div class="row"><span>KM:</span><span>${atendimento.km_atual}</span></div>` : ''}
      <div class="divider"></div>
      ${itensHtml}
      <div class="divider"></div>
      ${descontoHtml}
      <div class="row total"><span>TOTAL</span><span>${fmtMoeda(valorFinalPago)}</span></div>
      ${formasHtml}
      ${tecnicosResp.length > 0 ? `<div class="divider"></div><div class="row"><span>Técnico(s):</span><span>${tecnicosResp.map(t => t.nome).join(', ')}</span></div>` : atendimento.tecnico ? `<div class="divider"></div><div class="row"><span>Técnico:</span><span>${atendimento.tecnico}</span></div>` : ''}
      ${obsCliente ? `<div class="divider"></div><div style="font-size:12px;margin:4px 0"><b>Observações / Garantia:</b><br>${obsCliente}</div>` : ''}
      <div class="divider"></div>
      <div style="margin-top:32px">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:32px">
          <div style="flex:1;text-align:center">
            <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;color:#555">Assinatura do Cliente</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="border-top:1px solid #333;padding-top:6px;font-size:12px;color:#555">Responsável pela Empresa</div>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="footer">✅ Obrigado pela preferência!</div>
      </body></html>
    `;

    const win = window.open('', '_blank', 'width=520,height=750');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const handleWhatsApp = () => {
    const texto = gerarTextoWhatsApp();
    const tel = atendimento.cliente_telefone?.replace(/\D/g, '') || '';
    const prefixo = tel.startsWith('55') ? tel : `55${tel}`;
    window.open(`https://wa.me/${prefixo}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <Card className="border-2 border-green-200 bg-green-50" ref={reciboRef}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          🧾 Comprovante de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Empresa */}
        <div className="text-center pb-1 border-b border-green-200">
          {config?.logo_url && (
            <img src={config.logo_url} alt="Logo" className="h-12 object-contain mx-auto mb-1" />
          )}
          <p className="font-bold text-slate-800 text-sm">{config?.nome_empresa || 'Auto Center'}</p>
          {config?.cnpj && <p className="text-slate-500">CNPJ: {config.cnpj}</p>}
          {config?.endereco && <p className="text-slate-500">{config.endereco}</p>}
          {config?.telefone && <p className="text-slate-500">Tel: {config.telefone}</p>}
        </div>

        {/* OS + Data */}
        <div className="space-y-0.5">
          {osNum && <div className="flex justify-between"><span className="text-slate-500">Nº OS:</span><span className="font-mono font-bold text-slate-700">{osNum}</span></div>}
          <div className="flex justify-between"><span className="text-slate-500">Data:</span><span className="font-medium text-slate-700">{fmtData(dataServico)}</span></div>
        </div>

        <div className="border-t border-green-200" />

        {/* Cliente */}
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-600 uppercase text-xs">Cliente</p>
          <div className="flex justify-between"><span className="text-slate-500">Nome:</span><span className="font-medium text-slate-700">{atendimento.cliente_nome || '-'}</span></div>
          {atendimento.cliente_telefone && <div className="flex justify-between"><span className="text-slate-500">Tel:</span><span className="text-slate-700">{atendimento.cliente_telefone}</span></div>}
          {atendimento.cliente_cpf && <div className="flex justify-between"><span className="text-slate-500">CPF/CNPJ:</span><span className="text-slate-700">{atendimento.cliente_cpf}</span></div>}
        </div>

        <div className="border-t border-green-200" />

        {/* Veículo */}
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-600 uppercase text-xs">Veículo</p>
          <div className="flex justify-between"><span className="text-slate-500">Placa:</span><span className="font-bold text-slate-700">{atendimento.placa || '-'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Modelo:</span><span className="text-slate-700">{atendimento.marca ? `${atendimento.marca} ` : ''}{atendimento.modelo || '-'}{atendimento.ano ? ` (${atendimento.ano})` : ''}</span></div>
          {atendimento.km_atual && <div className="flex justify-between"><span className="text-slate-500">KM:</span><span className="text-slate-700">{atendimento.km_atual}</span></div>}
        </div>

        {/* Itens */}
        {temItens && (
          <>
            <div className="border-t border-green-200" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-600 uppercase text-xs">Serviços Realizados</p>
              {itensSemDuplicata.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span>{item.nome}{item.quantidade > 1 ? ` (${item.quantidade}x)` : ''}</span>
                  <span>{fmtMoeda(item.valor_total)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-green-200" />

        {/* Desconto + Total */}
        {desconto > 0 && (
          <div className="flex justify-between text-green-700">
            <span>Desconto</span>
            <span>- {fmtMoeda(desconto)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm text-green-800 border-t border-green-300 pt-2">
          <span>TOTAL</span>
          <span>{fmtMoeda(valorFinalPago)}</span>
        </div>

        {/* Formas de pagamento */}
        {formas.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-slate-500">Pagamento:</p>
            {formas.map((f, idx) => (
              <div key={idx} className="flex justify-between text-slate-600">
                <Badge variant="outline" className="text-xs py-0 h-5">{FORMA_LABEL[f.forma] || f.forma}</Badge>
                <span>{fmtMoeda(f.valor)}</span>
              </div>
            ))}
          </div>
        )}
        {!formas.length && formaUnica && (
          <div className="flex justify-between text-slate-600">
            <span className="text-slate-500">Pagamento:</span>
            <Badge variant="outline" className="text-xs py-0 h-5">{FORMA_LABEL[formaUnica] || formaUnica}</Badge>
          </div>
        )}

        {/* Técnico(s) */}
        {tecnicosResp.length > 0 && (
          <div className="flex justify-between text-slate-600">
            <span className="text-slate-500">Técnico(s):</span>
            <span className="text-right">{tecnicosResp.map(t => t.nome).join(', ')}</span>
          </div>
        )}
        {!tecnicosResp.length && atendimento.tecnico && (
          <div className="flex justify-between text-slate-600">
            <span className="text-slate-500">Técnico:</span>
            <span>{atendimento.tecnico}</span>
          </div>
        )}

        {/* Obs para o cliente */}
        {obsCliente && (
          <div className="p-2 bg-white border border-green-200 rounded text-slate-600">
            <span className="font-semibold">Obs / Garantia: </span>{obsCliente}
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