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
import { Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function OrdemServicoTecnica({ atendimento, onClose }) {
  if (!atendimento) return null;

  // Filtrar apenas itens aprovados
  const itensAprovados = [
    ...(atendimento.itens_queixa?.filter(item => item.status_aprovacao === 'aprovado') || []),
    ...(atendimento.itens_orcamento?.filter(item => item.status_aprovacao === 'aprovado') || [])
  ];

  const handleImprimir = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ordem de Serviço Técnica - ${atendimento.placa}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              background: white;
            }
            .header {
              border-bottom: 4px solid #f97316;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              color: #1e293b;
              margin-bottom: 5px;
            }
            .header p {
              color: #64748b;
              font-size: 14px;
            }
            .title-box {
              background: #1e293b;
              color: white;
              text-align: center;
              padding: 12px;
              border-radius: 6px;
              margin-bottom: 15px;
            }
            .title-box h2 {
              font-size: 18px;
            }
            .info-section {
              background: #f8fafc;
              border-radius: 6px;
              padding: 15px;
              margin-bottom: 15px;
            }
            .info-section h3 {
              font-size: 14px;
              color: #1e293b;
              margin-bottom: 10px;
              font-weight: 600;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              font-size: 13px;
            }
            .info-item strong {
              color: #1e293b;
              display: block;
              margin-bottom: 2px;
            }
            .servicos-section {
              margin-top: 20px;
            }
            .servico-item {
              background: #fff;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .servico-header {
              display: flex;
              justify-content: space-between;
              align-items: start;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            .servico-nome {
              font-size: 16px;
              font-weight: 600;
              color: #1e293b;
            }
            .servico-badge {
              background: #22c55e;
              color: white;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
            }
            .servico-detalhes {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-bottom: 10px;
            }
            .detalhe-item {
              font-size: 12px;
            }
            .detalhe-item strong {
              display: block;
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .detalhe-item span {
              color: #1e293b;
              font-weight: 600;
            }
            .observacao-tecnica {
              background: #fef3c7;
              border-left: 3px solid #f59e0b;
              padding: 10px;
              margin-top: 10px;
              border-radius: 4px;
            }
            .observacao-tecnica strong {
              color: #92400e;
              font-size: 11px;
              display: block;
              margin-bottom: 5px;
            }
            .observacao-tecnica p {
              color: #78350f;
              font-size: 12px;
              line-height: 1.4;
            }
            .espacos-trabalho {
              margin-top: 30px;
              page-break-inside: avoid;
            }
            .checkbox-list {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              margin-top: 10px;
            }
            .checkbox-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
            }
            .checkbox {
              width: 16px;
              height: 16px;
              border: 2px solid #94a3b8;
              border-radius: 3px;
            }
            .assinaturas {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              page-break-inside: avoid;
            }
            .assinatura {
              text-align: center;
            }
            .assinatura-line {
              border-top: 1px solid #94a3b8;
              padding-top: 8px;
              margin-top: 40px;
            }
            .assinatura p {
              font-size: 13px;
              font-weight: 600;
              color: #1e293b;
            }
            .assinatura small {
              font-size: 11px;
              color: #64748b;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #f97316;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
            }
            .print-button:hover {
              background: #ea580c;
            }
            @media print {
              .print-button { display: none; }
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>
          
          <div class="header">
            <h1>FRAGA AUTO PORTAS</h1>
            <p>Ordem de Serviço Técnica</p>
          </div>

          <div class="title-box">
            <h2>ORDEM DE SERVIÇO - ÁREA TÉCNICA</h2>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px;">
            <span><strong>Data:</strong> ${hoje}</span>
            <span><strong>OS Nº:</strong> ${atendimento.id?.slice(-8).toUpperCase()}</span>
          </div>

          <div class="info-section">
            <h3>DADOS DO VEÍCULO</h3>
            <div class="info-grid">
              <div class="info-item">
                <strong>Placa:</strong>
                ${atendimento.placa}
              </div>
              <div class="info-item">
                <strong>Modelo:</strong>
                ${atendimento.modelo}
              </div>
              <div class="info-item">
                <strong>Marca:</strong>
                ${atendimento.marca || '-'}
              </div>
              <div class="info-item">
                <strong>Ano:</strong>
                ${atendimento.ano || '-'}
              </div>
            </div>
          </div>

          <div class="info-section">
            <h3>DADOS DO CLIENTE</h3>
            <div class="info-grid">
              <div class="info-item">
                <strong>Nome:</strong>
                ${atendimento.cliente_nome || '-'}
              </div>
              <div class="info-item">
                <strong>Telefone:</strong>
                ${atendimento.cliente_telefone || '-'}
              </div>
            </div>
          </div>

          <div class="servicos-section">
            <h3 style="font-size: 16px; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #f97316; padding-bottom: 8px;">
              SERVIÇOS APROVADOS PELO CLIENTE
            </h3>

            ${itensAprovados.length === 0 ? `
              <div style="text-align: center; padding: 30px; color: #94a3b8;">
                <p>Nenhum serviço foi aprovado pelo cliente ainda.</p>
              </div>
            ` : itensAprovados.map((item, idx) => `
              <div class="servico-item">
                <div class="servico-header">
                  <div class="servico-nome">${idx + 1}. ${item.nome}</div>
                  <div class="servico-badge">✓ APROVADO</div>
                </div>
                
                <div class="servico-detalhes">
                  <div class="detalhe-item">
                    <strong>Quantidade</strong>
                    <span>${item.quantidade} ${item.quantidade > 1 ? 'unidades' : 'unidade'}</span>
                  </div>
                  <div class="detalhe-item">
                    <strong>Código</strong>
                    <span>${item.codigo_produto || 'N/A'}</span>
                  </div>
                  <div class="detalhe-item">
                    <strong>Categoria</strong>
                    <span>${item.categoria || 'Geral'}</span>
                  </div>
                </div>

                ${item.observacao_item ? `
                  <div class="observacao-tecnica">
                    <strong>📋 OBSERVAÇÕES TÉCNICAS:</strong>
                    <p>${item.observacao_item}</p>
                  </div>
                ` : ''}

                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e2e8f0;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                      <strong style="font-size: 11px; color: #64748b; display: block; margin-bottom: 5px;">LOCALIZAÇÃO/PORTA:</strong>
                      <div style="border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; min-height: 40px; background: #f8fafc;">
                        _______________________________
                      </div>
                    </div>
                    <div>
                      <strong style="font-size: 11px; color: #64748b; display: block; margin-bottom: 5px;">STATUS DA EXECUÇÃO:</strong>
                      <div style="display: flex; gap: 10px; margin-top: 5px;">
                        <label style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                          <span class="checkbox"></span> Pendente
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                          <span class="checkbox"></span> Em Andamento
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                          <span class="checkbox"></span> Concluído
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div style="margin-top: 10px;">
                  <strong style="font-size: 11px; color: #64748b; display: block; margin-bottom: 5px;">ANOTAÇÕES DO TÉCNICO:</strong>
                  <div style="border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; min-height: 50px; background: #f8fafc;">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="espacos-trabalho">
            <h3 style="font-size: 14px; color: #1e293b; margin-bottom: 10px;">CHECKLIST DE VERIFICAÇÃO FINAL</h3>
            <div class="checkbox-list">
              <div class="checkbox-item">
                <span class="checkbox"></span>
                <span>Teste de funcionamento</span>
              </div>
              <div class="checkbox-item">
                <span class="checkbox"></span>
                <span>Limpeza da área</span>
              </div>
              <div class="checkbox-item">
                <span class="checkbox"></span>
                <span>Ferramentas recolhidas</span>
              </div>
              <div class="checkbox-item">
                <span class="checkbox"></span>
                <span>Veículo conferido</span>
              </div>
              <div class="checkbox-item">
                <span class="checkbox"></span>
                <span>Sem danos aparentes</span>
              </div>
              <div class="checkbox-item">
                <span class="checkbox"></span>
                <span>Cliente notificado</span>
              </div>
            </div>
          </div>

          <div class="assinaturas">
            <div class="assinatura">
              <div class="assinatura-line">
                <p>Técnico Responsável</p>
                <small>${atendimento.tecnico || 'Fraga Auto Portas'}</small>
              </div>
            </div>
            <div class="assinatura">
              <div class="assinatura-line">
                <p>Supervisor</p>
                <small>Data: ___/___/______</small>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px;">
            Ordem de Serviço gerada em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} • Fraga Auto Portas
          </div>
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
          {/* Info do Veículo */}
          <Card className="p-4 bg-slate-50">
            <h3 className="font-semibold text-sm mb-3">Dados do Veículo</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Placa:</span>
                <span className="ml-2 font-medium">{atendimento.placa}</span>
              </div>
              <div>
                <span className="text-slate-500">Modelo:</span>
                <span className="ml-2 font-medium">{atendimento.modelo}</span>
              </div>
            </div>
          </Card>

          {/* Serviços Aprovados */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>Serviços Aprovados ({itensAprovados.length})</span>
              <Badge className="bg-green-600">Área Técnica</Badge>
            </h3>

            {itensAprovados.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                Nenhum serviço aprovado ainda
              </Card>
            ) : (
              <div className="space-y-3">
                {itensAprovados.map((item, idx) => (
                  <Card key={idx} className="p-4 border-l-4 border-l-green-500">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{item.nome}</p>
                        <p className="text-sm text-slate-500">
                          Quantidade: {item.quantidade} {item.quantidade > 1 ? 'unidades' : 'unidade'}
                        </p>
                      </div>
                      <Badge className="bg-green-600">Aprovado</Badge>
                    </div>
                    
                    {item.observacao_item && (
                      <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-500 rounded">
                        <p className="text-xs font-semibold text-amber-800 mb-1">
                          📋 Observações Técnicas:
                        </p>
                        <p className="text-sm text-amber-700">{item.observacao_item}</p>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t text-xs text-slate-500 space-y-1">
                      <p>✓ Localização/Porta: _______________</p>
                      <p>✓ Status: Pendente / Em Andamento / Concluído</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Botão Imprimir */}
          <Button
            onClick={handleImprimir}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Ordem de Serviço Técnica
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}