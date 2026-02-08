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
  // ROTA PÚBLICA - Marcar como tal para evitar verificações de autenticação
  React.useEffect(() => {
    console.log('🔐 [APROVACAO] Marcando rota como pública');
    window.__IS_PUBLIC_ROUTE__ = true;
    return () => {
      window.__IS_PUBLIC_ROUTE__ = false;
    };
  }, []);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  
  console.log('🚀 [APROVACAO] Componente montado:', {
    id,
    url: window.location.href,
    hasId: !!id
  });

  const [decisoes, setDecisoes] = useState({});
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [tipoAssinatura, setTipoAssinatura] = useState('digital'); // 'digital' ou 'manual'
  const [nomeAssinatura, setNomeAssinatura] = useState('');
  const [cpfAssinatura, setCpfAssinatura] = useState('');
  const [assinaturaData, setAssinaturaData] = useState(null);
  const [aprovacaoEnviada, setAprovacaoEnviada] = useState(false);

  const { data: atendimento, isLoading, isError, error } = useQuery({
    queryKey: ['atendimento-aprovacao', id],
    queryFn: async () => {
      console.log('🔍 [APROVACAO] Iniciando busca. ID:', id);
      console.log('🔍 [APROVACAO] URL completa:', window.location.href);
      console.log('🔍 [APROVACAO] Tipo do SDK:', typeof base44);
      console.log('🔍 [APROVACAO] Método get existe?', typeof base44?.entities?.Atendimento?.get);
      
      if (!id) {
        console.error('❌ [APROVACAO] ID inválido ou ausente');
        throw new Error('ID do orçamento não fornecido');
      }
      
      try {
        console.log('📡 [APROVACAO] Chamando base44.entities.Atendimento.get(' + id + ')...');
        
        const result = await base44.entities.Atendimento.get(id);
        
        console.log('📦 [APROVACAO] Raw result:', result);
        console.log('📦 [APROVACAO] Result type:', typeof result);
        console.log('📦 [APROVACAO] Result keys:', result ? Object.keys(result) : 'null');
        
        if (!result) {
          console.error('❌ [APROVACAO] Query retornou null/undefined');
          throw new Error('Orçamento não encontrado. Verifique o link ou entre em contato.');
        }
        
        console.log('✅ [APROVACAO] Dados carregados:', {
          id: result.id,
          placa: result.placa,
          cliente: result.cliente_nome,
          status: result.status,
          itens_queixa: result.itens_queixa?.length || 0,
          itens_orcamento: result.itens_orcamento?.length || 0
        });
        
        return result;
      } catch (err) {
        console.error('❌ [APROVACAO] ERRO DETALHADO:', {
          errorType: err?.constructor?.name,
          message: err?.message,
          name: err?.name,
          code: err?.code,
          status: err?.status,
          response: err?.response,
          stack: err?.stack?.split('\n').slice(0, 3)
        });
        
        // Re-throw com mensagem mais clara
        const errorMsg = err?.message || 'Erro ao carregar orçamento';
        throw new Error(errorMsg);
      }
    },
    enabled: !!id,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000
  });

  const whatsappAtendimento = configs[0]?.whatsapp_atendimento || '';

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

  const aprovarTodos = () => {
    const novasDecisoes = {};
    Object.entries(decisoes).forEach(([key, value]) => {
      novasDecisoes[key] = { ...value, decisao: 'aprovado' };
    });
    setDecisoes(novasDecisoes);
    toast.success('Todos os itens foram aprovados!');
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
      console.log('🚀 Iniciando salvamento da aprovação...');
      
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
      
      console.log('📦 Dados a salvar:', {
        itens_queixa: itensQueixaAtualizados?.length,
        itens_orcamento: itensOrcamentoAtualizados?.length,
        assinatura: dadosAprovacao.assinatura
      });
      
      // Salvar dados da aprovação
      const resultado = await base44.entities.Atendimento.update(id, {
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
      
      console.log('✅ Aprovação salva com sucesso!', resultado);
      return resultado;
    },
    onSuccess: () => {
      console.log('✅ onSuccess executado');
      queryClient.invalidateQueries(['atendimento-aprovacao', id]);
      setAprovacaoEnviada(true);
      toast.success('Aprovação registrada com sucesso!');
    },
    onError: (error) => {
      console.error('❌ Erro ao salvar aprovação:', error);
      toast.error(`Erro ao salvar aprovação: ${error.message || 'Tente novamente'}`);
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
    console.log('💾 Salvando aprovação manual...');
    salvarMutation.mutate({ assinatura: assinaturaTexto });
  };

  const handleIniciarFinalizacao = () => {
    // Validar se há itens pendentes
    const todosDecididos = Object.values(decisoes).every(
      d => d.decisao === 'aprovado' || d.decisao === 'reprovado'
    );
    
    if (!todosDecididos) {
      toast.error('Por favor, aprove ou recuse todos os itens antes de finalizar');
      return;
    }

    if (tipoAssinatura === 'digital') {
      setShowAssinatura(true);
    } else {
      handleFinalizarManual();
    }
  };

  const enviarWhatsApp = () => {
    if (!whatsappAtendimento) {
      toast.error('WhatsApp não configurado. Entre em contato com a empresa.');
      return;
    }
    const mensagem = gerarMensagemWhatsApp();
    window.open(`https://wa.me/${whatsappAtendimento}?text=${mensagem}`, '_blank');
  };

  console.log('🎨 [APROVACAO] Renderizando. Estado:', { 
    isLoading, 
    isError,
    errorMessage: error?.message,
    hasAtendimento: !!atendimento,
    atendimentoId: atendimento?.id,
    aprovacaoEnviada,
    urlId: id,
    decisoesCount: Object.keys(decisoes).length
  });

  // Validação extra: se não tem ID, mostrar erro imediatamente
  if (!id) {
    console.error('❌ [APROVACAO] Renderização abortada: sem ID na URL');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Link Inválido</h2>
            <p className="text-slate-600">
              O link de aprovação está incompleto. Entre em contato com a Fraga Auto para receber um novo link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    console.log('⏳ [APROVACAO] Mostrando loading...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 p-4">
        <div className="max-w-4xl mx-auto pt-8 space-y-4">
          {/* Skeleton loading */}
          <div className="bg-white rounded-lg p-6 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          </div>
          <div className="bg-white rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            </div>
          </div>
          <div className="text-center text-slate-500 text-sm mt-6">
            Carregando orçamento...
          </div>
        </div>
      </div>
    );
  }

  if (isError || !atendimento) {
    const telefoneEmpresa = whatsappAtendimento || '5511999999999';
    
    // Mostrar erro detalhado no console
    console.error('❌ [APROVACAO PUBLICA] Exibindo tela de erro:', {
      isError,
      hasAtendimento: !!atendimento,
      errorMessage: error?.message,
      errorDetails: error,
      id,
      currentUrl: window.location.href
    });
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 to-orange-50/30 p-4">
        <XCircle className="w-20 h-20 text-red-400" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Não foi possível carregar o orçamento</h2>
          <p className="text-slate-600 max-w-md">
            {error?.message || 'O link pode estar incorreto ou expirado.'}
          </p>
          {/* Debug info - remover em produção */}
          <details className="mt-4 text-left bg-red-50 p-3 rounded text-xs max-w-md">
            <summary className="cursor-pointer text-red-700 font-semibold mb-2">
              Detalhes técnicos (debug)
            </summary>
            <pre className="text-slate-700 overflow-auto">
              {JSON.stringify({ 
                id, 
                error: error?.message,
                timestamp: new Date().toISOString()
              }, null, 2)}
            </pre>
          </details>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-md">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="text-lg px-8 py-6"
          >
            🔄 Tentar Novamente
          </Button>
          <Button
            onClick={() => {
              const mensagem = `Olá! Não consegui acessar meu orçamento.\n\nID do orçamento: ${id}\n\nPode me ajudar?`;
              window.open(`https://wa.me/${telefoneEmpresa}?text=${encodeURIComponent(mensagem)}`, '_blank');
            }}
            className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Solicitar Novo Link pelo WhatsApp
          </Button>
        </div>
      </div>
    );
  }

  const { totalAprovado, totalReprovado } = calcularTotais();
  const itensQueixa = Object.entries(decisoes).filter(([k]) => k.startsWith('queixa_'));
  const itensChecklist = Object.entries(decisoes).filter(([k]) => k.startsWith('checklist_'));

  console.log('✅ [APROVACAO PUBLICA] Renderizando página principal:', {
    totalItens: Object.keys(decisoes).length,
    itensQueixa: itensQueixa.length,
    itensChecklist: itensChecklist.length,
    aprovacaoEnviada
  });

  if (aprovacaoEnviada) {
    console.log('✅ [APROVACAO PUBLICA] Exibindo tela de aprovação enviada');
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
              
              <p className="text-sm text-slate-500 mb-4">
                Clique no botão acima para enviar sua decisão para a Fraga Auto
              </p>
              
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Itens aprovados:</span>
                  <span className="font-semibold text-green-600">
                    {Object.values(decisoes).filter(d => d.decisao === 'aprovado').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Itens recusados:</span>
                  <span className="font-semibold text-red-600">
                    {Object.values(decisoes).filter(d => d.decisao === 'reprovado').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  console.log('🎨 [APROVACAO PUBLICA] Renderizando formulário de aprovação');
  
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

        {/* Botão Aprovar Todos */}
        {(itensQueixa.length > 0 || itensChecklist.length > 0) && (
          <Card className="bg-green-50 border-green-300">
            <CardContent className="pt-6">
              <Button
                onClick={aprovarTodos}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                ✓ Aprovar Todos os Itens
              </Button>
              <p className="text-center text-sm text-slate-600 mt-3">
                Clique para aprovar todos os serviços de uma vez
              </p>
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
                <div key={key} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{item.nome}</p>
                      <p className="text-sm text-slate-600">
                        {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)} = R$ {item.valor_total?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {item.observacao_item && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-semibold text-blue-800 mb-1">📝 Observações:</p>
                      <p className="text-sm text-blue-700">{item.observacao_item}</p>
                    </div>
                  )}

                  {item.vantagens && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-green-800 mb-1">✓ Benefícios de realizar:</p>
                      <p className="text-sm text-green-700">{item.vantagens}</p>
                    </div>
                  )}

                  {item.desvantagens && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Riscos de não realizar:</p>
                      <p className="text-sm text-amber-700">{item.desvantagens}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleDecisao(key, 'aprovado')}
                      variant={decisao === 'aprovado' ? 'default' : 'outline'}
                      className={`flex-1 ${decisao === 'aprovado' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => toggleDecisao(key, 'reprovado')}
                      variant={decisao === 'reprovado' ? 'default' : 'outline'}
                      className={`flex-1 ${decisao === 'reprovado' ? 'bg-red-600 hover:bg-red-700' : ''}`}
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
                <div key={key} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{item.nome}</p>
                      <p className="text-sm text-slate-600">
                        {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)} = R$ {item.valor_total?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {item.observacao_item && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-semibold text-blue-800 mb-1">📝 Observações:</p>
                      <p className="text-sm text-blue-700">{item.observacao_item}</p>
                    </div>
                  )}

                  {item.vantagens && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-green-800 mb-1">✓ Benefícios de realizar:</p>
                      <p className="text-sm text-green-700">{item.vantagens}</p>
                    </div>
                  )}

                  {item.desvantagens && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Riscos de não realizar:</p>
                      <p className="text-sm text-amber-700">{item.desvantagens}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => toggleDecisao(key, 'aprovado')}
                      variant={decisao === 'aprovado' ? 'default' : 'outline'}
                      className={`flex-1 ${decisao === 'aprovado' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => toggleDecisao(key, 'reprovado')}
                      variant={decisao === 'reprovado' ? 'default' : 'outline'}
                      className={`flex-1 ${decisao === 'reprovado' ? 'bg-red-600 hover:bg-red-700' : ''}`}
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

        {/* Totais - Fixo no topo quando scrollar */}
        <div className="sticky top-0 z-30">
          <Card className="bg-slate-800 text-white shadow-lg">
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
        </div>

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
          onClick={handleIniciarFinalizacao}
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
        
        {salvarMutation.isError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ❌ Erro ao salvar: {salvarMutation.error?.message || 'Tente novamente'}
            </p>
          </div>
        )}
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