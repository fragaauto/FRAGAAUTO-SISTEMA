import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  CheckCircle2,
  XCircle,
  Loader2,
  Car,
  FileText,
  MessageCircle,
  PenTool,
  Send,
  Download
} from 'lucide-react';
import AssinaturaDigital from '../components/assinatura/AssinaturaDigital';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AprovarOrcamento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [decisoes, setDecisoes] = useState({});
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [tipoAssinatura, setTipoAssinatura] = useState('digital'); // 'digital' ou 'manual'
  const [nomeAssinatura, setNomeAssinatura] = useState('');
  const [cpfAssinatura, setCpfAssinatura] = useState('');
  const [assinaturaData, setAssinaturaData] = useState(null);
  const [aprovacaoEnviada, setAprovacaoEnviada] = useState(false);

  const { data: atendimento, isLoading } = useQuery({
    queryKey: ['atendimento-aprovacao', id],
    queryFn: async () => {
      if (!id) return null;
      const list = await base44.entities.Atendimento.list();
      return list.find(a => a.id === id) || null;
    },
    enabled: !!id,
  });

  // Inicializar decisões com status atual
  useEffect(() => {
    if (atendimento) {
      const todasDecisoes = {};
      
      // Itens da queixa
      atendimento.itens_queixa?.forEach(item => {
        todasDecisoes[`queixa_${item.produto_id}`] = {
          tipo: 'queixa',
          item: item,
          decisao: item.status_aprovacao || 'pendente'
        };
      });
      
      // Itens do checklist (excluindo duplicados da queixa)
      const produtosNaQueixa = new Set(
        atendimento.itens_queixa?.map(item => item.produto_id) || []
      );
      atendimento.itens_orcamento?.filter(
        item => !produtosNaQueixa.has(item.produto_id)
      ).forEach(item => {
        todasDecisoes[`checklist_${item.produto_id}`] = {
          tipo: 'checklist',
          item: item,
          decisao: item.status_aprovacao || 'pendente'
        };
      });
      
      setDecisoes(todasDecisoes);
    }
  }, [atendimento]);

  const toggleDecisao = (key, novaDecisao) => {
    setDecisoes(prev => ({
      ...prev,
      [key]: { ...prev[key], decisao: novaDecisao }
    }));
  };

  const calcularTotais = () => {
    let totalAprovado = 0;
    let totalReprovado = 0;
    
    Object.values(decisoes).forEach(({ item, decisao }) => {
      if (decisao === 'aprovado') {
        totalAprovado += item.valor_total || 0;
      } else if (decisao === 'reprovado') {
        totalReprovado += item.valor_total || 0;
      }
    });
    
    return { totalAprovado, totalReprovado };
  };

  const gerarMensagemWhatsApp = () => {
    const aprovados = Object.values(decisoes).filter(d => d.decisao === 'aprovado');
    const reprovados = Object.values(decisoes).filter(d => d.decisao === 'reprovado');
    const { totalAprovado } = calcularTotais();
    
    let mensagem = `*📋 APROVAÇÃO DE ORÇAMENTO*\n\n`;
    mensagem += `*Cliente:* ${atendimento.cliente_nome}\n`;
    mensagem += `*Veículo:* ${atendimento.placa} - ${atendimento.modelo}\n`;
    mensagem += `*Atendimento:* #${atendimento.id?.slice(-8).toUpperCase()}\n\n`;
    
    if (aprovados.length > 0) {
      mensagem += `✅ *ITENS APROVADOS:*\n`;
      aprovados.forEach(({ item }) => {
        mensagem += `• ${item.nome} - R$ ${item.valor_total?.toFixed(2)}\n`;
      });
      mensagem += `\n`;
    }
    
    if (reprovados.length > 0) {
      mensagem += `❌ *ITENS NÃO AUTORIZADOS:*\n`;
      reprovados.forEach(({ item }) => {
        mensagem += `• ${item.nome}\n`;
      });
      mensagem += `\n`;
    }
    
    mensagem += `*💰 Total Aprovado:* R$ ${totalAprovado.toFixed(2)}\n\n`;
    
    if (tipoAssinatura === 'manual') {
      mensagem += `*Assinado por:* ${nomeAssinatura}\n`;
      mensagem += `*CPF:* ${cpfAssinatura}\n`;
    } else {
      mensagem += `*Assinatura:* Digital\n`;
    }
    
    mensagem += `*Data:* ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    
    return encodeURIComponent(mensagem);
  };

  const salvarMutation = useMutation({
    mutationFn: async (dadosAprovacao) => {
      // Atualizar itens da queixa
      const itensQueixaAtualizados = atendimento.itens_queixa?.map(item => {
        const key = `queixa_${item.produto_id}`;
        return {
          ...item,
          status_aprovacao: decisoes[key]?.decisao || item.status_aprovacao
        };
      });
      
      // Atualizar itens do orçamento
      const itensOrcamentoAtualizados = atendimento.itens_orcamento?.map(item => {
        const key = `checklist_${item.produto_id}`;
        return {
          ...item,
          status_aprovacao: decisoes[key]?.decisao || item.status_aprovacao
        };
      });
      
      // Salvar dados da aprovação
      return base44.entities.Atendimento.update(id, {
        itens_queixa: itensQueixaAtualizados,
        itens_orcamento: itensOrcamentoAtualizados,
        assinatura_cliente_checklist: dadosAprovacao.assinatura,
        data_aprovacao_checklist: new Date().toISOString(),
        dados_assinatura: {
          tipo: tipoAssinatura,
          nome: nomeAssinatura || null,
          cpf: cpfAssinatura || null,
          data: new Date().toISOString()
        },
        status: 'checklist_aprovado'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['atendimento-aprovacao', id]);
      setAprovacaoEnviada(true);
      toast.success('Aprovação registrada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar aprovação');
    }
  });

  const handleFinalizarAssinatura = (assinaturaDataUrl) => {
    setAssinaturaData(assinaturaDataUrl);
    salvarMutation.mutate({ assinatura: assinaturaDataUrl });
    setShowAssinatura(false);
  };

  const handleFinalizarManual = () => {
    if (!nomeAssinatura || !cpfAssinatura) {
      toast.error('Preencha nome e CPF');
      return;
    }
    
    const assinaturaTexto = `Assinado por: ${nomeAssinatura} - CPF: ${cpfAssinatura}`;
    salvarMutation.mutate({ assinatura: assinaturaTexto });
  };

  const enviarWhatsApp = () => {
    const mensagem = gerarMensagemWhatsApp();
    // Número da empresa - ajustar conforme necessário
    const numeroEmpresa = '5511999999999'; // Substituir pelo número real
    window.open(`https://wa.me/${numeroEmpresa}?text=${mensagem}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!atendimento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 to-orange-50/30 p-4">
        <XCircle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-bold text-slate-800">Orçamento não encontrado</h2>
        <p className="text-slate-500">Verifique o link e tente novamente</p>
      </div>
    );
  }

  const { totalAprovado, totalReprovado } = calcularTotais();
  const itensQueixa = Object.entries(decisoes).filter(([k]) => k.startsWith('queixa_'));
  const itensChecklist = Object.entries(decisoes).filter(([k]) => k.startsWith('checklist_'));

  if (aprovacaoEnviada) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-green-900">Aprovação Registrada!</h2>
              <p className="text-green-700">Sua decisão foi salva com sucesso.</p>
              
              <div className="bg-white rounded-lg p-4 space-y-2">
                <p className="font-semibold text-slate-800">Total Aprovado:</p>
                <p className="text-3xl font-bold text-green-600">R$ {totalAprovado.toFixed(2)}</p>
              </div>
              
              <Button
                onClick={enviarWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Enviar Decisão pelo WhatsApp
              </Button>
              
              <p className="text-sm text-slate-500">
                Clique no botão acima para enviar sua decisão para a Fraga Auto
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800">Aprovação de Orçamento</h1>
            <p className="text-sm text-slate-500 mt-1">
              {atendimento.cliente_nome} • {atendimento.placa}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info do veículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-orange-500" />
              Informações do Veículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Placa</p>
                <p className="font-semibold">{atendimento.placa}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Modelo</p>
                <p className="font-semibold">{atendimento.modelo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queixa inicial */}
        {atendimento.queixa_inicial && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-blue-700">Queixa Inicial</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">{atendimento.queixa_inicial}</p>
            </CardContent>
          </Card>
        )}

        {/* Itens da Queixa */}
        {itensQueixa.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">Itens da Queixa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {itensQueixa.map(([key, { item, decisao }]) => (
                <div key={key} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{item.nome}</p>
                      <p className="text-sm text-slate-600">
                        {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)} = R$ {item.valor_total?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleDecisao(key, 'aprovado')}
                      variant={decisao === 'aprovado' ? 'default' : 'outline'}
                      className={decisao === 'aprovado' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => toggleDecisao(key, 'reprovado')}
                      variant={decisao === 'reprovado' ? 'default' : 'outline'}
                      className={decisao === 'reprovado' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Itens do Checklist */}
        {itensChecklist.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-700">Itens do Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {itensChecklist.map(([key, { item, decisao }]) => (
                <div key={key} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{item.nome}</p>
                      <p className="text-sm text-slate-600">
                        {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)} = R$ {item.valor_total?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleDecisao(key, 'aprovado')}
                      variant={decisao === 'aprovado' ? 'default' : 'outline'}
                      className={decisao === 'aprovado' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => toggleDecisao(key, 'reprovado')}
                      variant={decisao === 'reprovado' ? 'default' : 'outline'}
                      className={decisao === 'reprovado' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Totais */}
        <Card className="bg-slate-800 text-white">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between text-lg">
              <span>Itens Aprovados:</span>
              <span className="text-green-400 font-bold">R$ {totalAprovado.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Itens Recusados:</span>
              <span className="text-red-400 font-bold">R$ {totalReprovado.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/20 pt-3 flex justify-between text-2xl font-bold">
              <span>TOTAL APROVADO:</span>
              <span className="text-orange-400">R$ {totalAprovado.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tipo de Assinatura */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={() => setTipoAssinatura('digital')}
                variant={tipoAssinatura === 'digital' ? 'default' : 'outline'}
                className="flex-1"
              >
                <PenTool className="w-4 h-4 mr-2" />
                Assinatura Digital
              </Button>
              <Button
                onClick={() => setTipoAssinatura('manual')}
                variant={tipoAssinatura === 'manual' ? 'default' : 'outline'}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Nome + CPF
              </Button>
            </div>

            {tipoAssinatura === 'manual' && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <Label>Nome Completo</Label>
                  <Input
                    value={nomeAssinatura}
                    onChange={(e) => setNomeAssinatura(e.target.value)}
                    placeholder="Digite seu nome completo"
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={cpfAssinatura}
                    onChange={(e) => setCpfAssinatura(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão Finalizar */}
        <Button
          onClick={() => {
            if (tipoAssinatura === 'digital') {
              setShowAssinatura(true);
            } else {
              handleFinalizarManual();
            }
          }}
          disabled={salvarMutation.isPending}
          className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
        >
          {salvarMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Send className="w-5 h-5 mr-2" />
          )}
          Finalizar e Enviar Minha Decisão
        </Button>
      </div>

      {showAssinatura && (
        <AssinaturaDigital
          title="Assinar Aprovação"
          onSave={handleFinalizarAssinatura}
          onClose={() => setShowAssinatura(false)}
        />
      )}
    </div>
  );
}