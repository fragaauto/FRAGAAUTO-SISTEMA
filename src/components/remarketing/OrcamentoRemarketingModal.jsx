import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageCircle, Percent } from 'lucide-react';
import { toast } from "sonner";

export default function OrcamentoRemarketingModal({ 
  open, 
  onOpenChange, 
  atendimento, 
  mensagemPersonalizada,
  nomeEmpresa,
  descontoVistaInicial = '',
  descontoParceladoInicial = ''
}) {
  const [descontoVista, setDescontoVista] = useState(descontoVistaInicial);
  const [descontoParcelado, setDescontoParcelado] = useState(descontoParceladoInicial);

  React.useEffect(() => {
    setDescontoVista(descontoVistaInicial);
    setDescontoParcelado(descontoParceladoInicial);
  }, [descontoVistaInicial, descontoParceladoInicial, open]);

  const calcularValorComDesconto = (valorOriginal, desconto) => {
    if (!desconto || isNaN(desconto)) return valorOriginal;
    return valorOriginal - (valorOriginal * (parseFloat(desconto) / 100));
  };

  const valorOriginal = atendimento?.valor_total_reprovado || 0;
  const valorVista = calcularValorComDesconto(valorOriginal, descontoVista);
  const valorParcelado = calcularValorComDesconto(valorOriginal, descontoParcelado);

  const gerarMensagem = () => {
    let mensagem = mensagemPersonalizada || `Olá! Tudo bem? Aqui é da ${nomeEmpresa || 'nossa oficina'}! 😊\n\nVimos que você consultou alguns serviços para seu ${atendimento.modelo} e preparamos uma oferta especial!\n\n`;
    
    mensagem += `🚗 *Veículo:* ${atendimento.placa} - ${atendimento.modelo}\n`;
    mensagem += `📋 *Serviços da Oferta:*\n\n`;

    atendimento.itens_reprovados?.forEach((item, idx) => {
      mensagem += `${idx + 1}. ${item.nome}\n`;
      mensagem += `   Quantidade: ${item.quantidade}x\n`;
      mensagem += `   Valor: R$ ${item.valor_total?.toFixed(2)}\n`;
      if (item.vantagens) {
        mensagem += `   ✅ ${item.vantagens}\n`;
      }
      mensagem += `\n`;
    });

    mensagem += `💰 *Valores:*\n`;
    mensagem += `Valor Original: R$ ${valorOriginal.toFixed(2)}\n\n`;

    if (descontoVista && parseFloat(descontoVista) > 0) {
      mensagem += `🎯 *À VISTA* (${descontoVista}% OFF): R$ ${valorVista.toFixed(2)}\n`;
    }
    
    if (descontoParcelado && parseFloat(descontoParcelado) > 0) {
      mensagem += `💳 *Parcelado no Cartão* (${descontoParcelado}% OFF): R$ ${valorParcelado.toFixed(2)}\n`;
    }

    if (!descontoVista && !descontoParcelado) {
      mensagem += `💵 Valor à vista: R$ ${valorOriginal.toFixed(2)}\n`;
      mensagem += `💳 Parcelado: R$ ${valorOriginal.toFixed(2)}\n`;
    }

    mensagem += `\n⏰ Esta é uma oferta especial por tempo limitado!\n`;
    mensagem += `\nO que acha? Podemos agendar? 😊`;

    return mensagem;
  };

  const copiarMensagem = () => {
    const mensagem = gerarMensagem();
    navigator.clipboard.writeText(mensagem);
    toast.success('Mensagem copiada!');
  };

  const enviarWhatsApp = () => {
    const mensagem = gerarMensagem();
    const telefone = atendimento.cliente_telefone?.replace(/\D/g, '');
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Orçamento de Remarketing</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campos de Desconto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="desconto-vista">
                <Percent className="w-4 h-4 inline mr-1" />
                Desconto À Vista (%)
              </Label>
              <Input
                id="desconto-vista"
                type="number"
                min="0"
                max="100"
                value={descontoVista}
                onChange={(e) => setDescontoVista(e.target.value)}
                placeholder="Ex: 10"
              />
              {descontoVista && (
                <p className="text-sm text-green-600 mt-1">
                  Valor à vista: R$ {valorVista.toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="desconto-parcelado">
                <Percent className="w-4 h-4 inline mr-1" />
                Desconto Parcelado (%)
              </Label>
              <Input
                id="desconto-parcelado"
                type="number"
                min="0"
                max="100"
                value={descontoParcelado}
                onChange={(e) => setDescontoParcelado(e.target.value)}
                placeholder="Ex: 5"
              />
              {descontoParcelado && (
                <p className="text-sm text-blue-600 mt-1">
                  Valor parcelado: R$ {valorParcelado.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Preview da Mensagem */}
          <div>
            <Label>Preview da Mensagem</Label>
            <Textarea
              value={gerarMensagem()}
              readOnly
              className="min-h-[400px] font-mono text-sm"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <Button
              onClick={copiarMensagem}
              variant="outline"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Mensagem
            </Button>
            <Button
              onClick={enviarWhatsApp}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}