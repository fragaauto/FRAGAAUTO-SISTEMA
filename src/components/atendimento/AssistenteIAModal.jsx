import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Loader2, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AssistenteIAModal({ open, onClose, atendimento, produtos, checklistItems, user, onUpdate }) {
  const [textoTecnico, setTextoTecnico] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);
  const [progressoIA, setProgressoIA] = useState(0);

  const processarTextoIA = async () => {
    if (!textoTecnico.trim()) {
      toast.error('Digite as informações do técnico');
      return;
    }

    setProcessandoIA(true);
    setProgressoIA(0);
    
    setProgressoIA(10);
    
    const listaProdutos = produtos.map(p => ({
      id: p.id, codigo: p.codigo, nome: p.nome,
      valor: p.valor, categoria: p.categoria,
      vantagens: p.vantagens, desvantagens: p.desvantagens
    }));

    setProgressoIA(20);

    const prompt = `Você é um assistente especializado em oficinas automotivas. Analise o texto do técnico e organize as informações em uma estrutura adequada.

TEXTO DO TÉCNICO:
${textoTecnico}

PRODUTOS DISPONÍVEIS NO CATÁLOGO:
${JSON.stringify(listaProdutos, null, 2)}

ITENS DO CHECKLIST:
${JSON.stringify(checklistItems.map(i => ({ id: i.id, item: i.item, categoria: i.categoria })), null, 2)}

INSTRUÇÕES:
1. Identifique a queixa inicial do cliente mencionada pelo técnico
2. Para cada problema/defeito mencionado, encontre o item correspondente no checklist
3. Para serviços como "Reparo", "Mão de obra", "Reforma", use SEMPRE o produto "Mão de obra" do catálogo e adicione os detalhes nas observações
4. Para peças específicas mencionadas, procure produtos correspondentes no catálogo
5. Se um produto não existe no catálogo, indique no campo "produtos_nao_encontrados"

IMPORTANTE:
- Serviços gerais = produto "Mão de obra" + detalhes nas observações
- Peças específicas = produto correspondente do catálogo`;

    const schema = {
      type: "object",
      properties: {
        queixa_inicial: { type: "string" },
        checklist: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_id: { type: "string" },
              item: { type: "string" },
              categoria: { type: "string" },
              status: { type: "string", enum: ["ok", "com_defeito", "nao_possui", "nao_verificado"] },
              comentario: { type: "string" },
              incluir_orcamento: { type: "boolean" },
              produtos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    produto_id: { type: "string" },
                    quantidade: { type: "number" },
                    observacao: { type: "string" }
                  }
                }
              }
            }
          }
        },
        itens_queixa: {
          type: "array",
          items: {
            type: "object",
            properties: {
              produto_id: { type: "string" },
              quantidade: { type: "number" },
              observacao_item: { type: "string" }
            }
          }
        },
        produtos_nao_encontrados: { type: "array", items: { type: "string" } }
      }
    };

    setProgressoIA(30);
    
    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    setProgressoIA(60);

    const checklistAtualizado = resultado.checklist.map(item => {
      const produtos_processados = item.produtos?.map(p => {
        const produto = produtos.find(prod => prod.id === p.produto_id);
        return {
          id: p.produto_id,
          quantidade: p.quantidade || 1,
          valor_customizado: produto?.valor || 0,
          observacao: p.observacao || ''
        };
      }) || [];
      return { ...item, produtos: produtos_processados };
    });

    const itensQueixaProcessados = resultado.itens_queixa.map(item => {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (!produto) return null;
      return {
        produto_id: produto.id,
        codigo_produto: produto.codigo || '',
        nome: produto.nome,
        quantidade: item.quantidade || 1,
        valor_unitario: produto.valor || 0,
        valor_total: (item.quantidade || 1) * (produto.valor || 0),
        vantagens: produto.vantagens || '',
        desvantagens: produto.desvantagens || '',
        status_aprovacao: 'pendente',
        status_servico: 'aguardando_autorizacao',
        observacao_item: item.observacao_item || ''
      };
    }).filter(Boolean);

    setProgressoIA(80);
    
    const subtotal_queixa = itensQueixaProcessados.reduce((acc, item) => acc + item.valor_total, 0);

    setProgressoIA(90);
    
    onUpdate({
      queixa_inicial: resultado.queixa_inicial,
      itens_queixa: itensQueixaProcessados,
      subtotal_queixa,
      checklist: checklistAtualizado,
      status: 'em_diagnostico',
      historico_edicoes: [
        ...(atendimento.historico_edicoes || []),
        {
          data: new Date().toISOString(),
          usuario: user?.email || 'Sistema',
          campo_editado: 'assistente_ia',
          descricao: 'Atendimento processado pelo Assistente de IA'
        }
      ]
    });

    setProgressoIA(100);
    
    if (resultado.produtos_nao_encontrados?.length > 0) {
      toast.warning(
        `Alguns itens não foram encontrados no catálogo: ${resultado.produtos_nao_encontrados.join(', ')}`,
        { duration: 5000 }
      );
    }

    setTimeout(() => {
      onClose();
      setTextoTecnico('');
      setProgressoIA(0);
      setProcessandoIA(false);
      toast.success('Atendimento processado com sucesso! Confira os dados.');
    }, 500);
  };

  const handleClose = () => {
    if (!processandoIA) {
      onClose();
      setTextoTecnico('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Assistente de IA - Processar Informações do Técnico
          </DialogTitle>
          <DialogDescription>
            Cole o texto do técnico com as informações sobre defeitos, peças e serviços. A IA irá organizar automaticamente o checklist e a queixa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Informações do Técnico</Label>
            <Textarea
              placeholder="Exemplo: Cliente relata barulho na porta traseira direita. Verificado vidro elétrico com defeito, precisa trocar motor do vidro. Porta também precisa de lubrificação e ajuste na fechadura."
              value={textoTecnico}
              onChange={(e) => setTextoTecnico(e.target.value)}
              className="min-h-[200px]"
              disabled={processandoIA}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-800 mb-1">ℹ️ Como funciona:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• A IA identifica defeitos e preenche o checklist</li>
              <li>• Produtos do catálogo são lançados automaticamente</li>
              <li>• A queixa inicial é organizada</li>
            </ul>
          </div>

          {processandoIA && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-700 font-medium">Processando...</span>
                <span className="text-slate-600">{progressoIA}%</span>
              </div>
              <Progress value={progressoIA} className="h-2" />
              <p className="text-xs text-slate-500">
                {progressoIA < 30 && "Preparando dados..."}
                {progressoIA >= 30 && progressoIA < 60 && "Analisando com IA..."}
                {progressoIA >= 60 && progressoIA < 90 && "Organizando informações..."}
                {progressoIA >= 90 && "Finalizando..."}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={processandoIA}>
              Cancelar
            </Button>
            <Button
              onClick={processarTextoIA}
              disabled={processandoIA || !textoTecnico.trim()}
              className="bg-purple-600 hover:bg-purple-700 flex-1"
            >
              {processandoIA ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Processar com IA</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}