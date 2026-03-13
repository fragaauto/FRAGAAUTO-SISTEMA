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
  Download,
  CreditCard
} from 'lucide-react';
import AssinaturaDigital from '../components/assinatura/AssinaturaDigital';
import CondicoesEspeciais from '../components/orcamento/CondicoesEspeciais';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AprovarOrcamento() {
  // ROTA PÚBLICA - Marcar como tal para evitar verificações de autenticação
  React.useEffect(() => {
    window.__IS_PUBLIC_ROUTE__ = true;
    return () => {
      window.__IS_PUBLIC_ROUTE__ = false;
    };
  }, []);

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
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState('');
  const [totaisAtualizados, setTotaisAtualizados] = useState({ totalAprovado: 0, totalReprovado: 0 });
  const [tudoPreenchido, setTudoPreenchido] = useState(false);

  // Atualizar totais automaticamente quando decisões mudarem
  useEffect(() => {
    let totalAprovado = 0;
    let totalReprovado = 0;
    
    Object.values(decisoes).forEach(({ item, decisao }) => {
      if (decisao === 'aprovado') {
        totalAprovado += item.valor_total || 0;
      } else if (decisao === 'reprovado') {
        totalReprovado += item.valor_total || 0;
      }
    });
    
    setTotaisAtualizados({ totalAprovado, totalReprovado });
  }, [decisoes]);

  const { data: atendimento, isLoading, isError, error } = useQuery({
    queryKey: ['atendimento-aprovacao', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('ID do orçamento não fornecido');
      }
      
      const result = await base44.entities.Atendimento.get(id);
      
      if (!result) {
        throw new Error('Orçamento não encontrado. Verifique o link ou entre em contato.');
      }
      
      return result;
    },
    enabled: !!id,
    retry: 1,
    staleTime: 0,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000
  });

  const config = configs[0] || {};
  const whatsappAtendimento = config.whatsapp_atendimento || '';
  const formasPagamento = config.formas_pagamento?.filter(f => f.ativa) || [];
  const condicoesEspeciais = config.condicoes_especiais || [];

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list(),
    staleTime: 5 * 60 * 1000
  });

  // Verificar se tudo está preenchido
  useEffect(() => {
    if (!atendimento) return;

    const itensPendentes = Object.values(decisoes).filter(d => d.decisao === 'pendente');
    const todosDecididos = itensPendentes.length === 0 && Object.keys(decisoes).length > 0;
    
    const formaPagamentoOk = formasPagamento.length === 0 || formaPagamentoSelecionada;
    
    const assinaturaOk = tipoAssinatura === 'digital' || (nomeAssinatura && cpfAssinatura);
    
    setTudoPreenchido(todosDecididos && formaPagamentoOk && assinaturaOk);
  }, [decisoes, formaPagamentoSelecionada, tipoAssinatura, nomeAssinatura, cpfAssinatura, formasPagamento, atendimento]);

  // Inicializar decisões com status atual
  useEffect(() => {
    if (atendimento) {
      const todasDecisoes = {};
      
      // Itens da queixa - usar índice para permitir repetição
      atendimento.itens_queixa?.forEach((item, idx) => {
        todasDecisoes[`queixa_${idx}_${item.produto_id}`] = {
          tipo: 'queixa',
          item: item,
          decisao: item.status_aprovacao || 'pendente'
        };
      });
      
      // Itens do checklist - usar índice para permitir repetição (inclui mão de obra duplicada)
      atendimento.itens_orcamento?.forEach((item, idx) => {
        todasDecisoes[`checklist_${idx}_${item.produto_id}`] = {
          tipo: 'checklist',
          item: item,
          decisao: item.status_aprovacao || 'pendente'
        };
      });
      
      setDecisoes(todasDecisoes);
    }
  }, [atendimento]);

  const toggleDecisao = (key, novaDecisao) => {
    setDecisoes(prev => {
      const decisaoAtual = prev[key]?.decisao;
      // Se clicar na mesma decisão, voltar para pendente
      const decisaoFinal = decisaoAtual === novaDecisao ? 'pendente' : novaDecisao;
      
      const novasDecisoes = {
        ...prev,
        [key]: { ...prev[key], decisao: decisaoFinal }
      };
      return novasDecisoes;
    });
  };

  const handleAdicionarProdutoSugerido = (produto) => {
    // Verificar se o produto já existe nas decisões
    const keyQueixa = `queixa_${produto.id}`;
    const keyChecklist = `checklist_${produto.id}`;
    
    if (decisoes[keyQueixa] || decisoes[keyChecklist]) {
      toast.error('Este produto já está no seu orçamento!');
      return;
    }

    // Adicionar como novo item no checklist
    const novoItem = {
      produto_id: produto.id,
      codigo_produto: produto.codigo || '',
      nome: produto.nome,
      quantidade: 1,
      valor_unitario: produto.valor,
      valor_total: produto.valor,
      vantagens: produto.vantagens || '',
      desvantagens: produto.desvantagens || '',
      status_aprovacao: 'pendente'
    };

    setDecisoes(prev => ({
      ...prev,
      [keyChecklist]: {
        tipo: 'checklist',
        item: novoItem,
        decisao: 'pendente'
      }
    }));

    toast.success(`✅ ${produto.nome} foi adicionado ao seu orçamento! Não esqueça de aprovar ou recusar este item antes de finalizar.`);
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
      const itensQueixaAtualizados = atendimento.itens_queixa?.map((item, idx) => {
        const key = `queixa_${idx}_${item.produto_id}`;
        return {
          ...item,
          status_aprovacao: decisoes[key]?.decisao || item.status_aprovacao
        };
      });
      
      const itensOrcamentoAtualizados = atendimento.itens_orcamento?.map((item, idx) => {
        const key = `checklist_${idx}_${item.produto_id}`;
        return {
          ...item,
          status_aprovacao: decisoes[key]?.decisao || item.status_aprovacao
        };
      });
      
      const resultado = await base44.entities.Atendimento.update(id, {
        itens_queixa: itensQueixaAtualizados,
        itens_orcamento: itensOrcamentoAtualizados,
        assinatura_cliente_checklist: dadosAprovacao.assinatura,
        data_aprovacao_checklist: new Date().toISOString(),
        forma_pagamento_selecionada: formaPagamentoSelecionada,
        dados_assinatura: {
          tipo: tipoAssinatura,
          nome: nomeAssinatura || null,
          cpf: cpfAssinatura || null,
          data: new Date().toISOString()
        },
        status: 'checklist_aprovado'
      });
      
      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['atendimento-aprovacao', id]);
      setAprovacaoEnviada(true);
      toast.success('Aprovação registrada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar aprovação: ${error.message || 'Tente novamente'}`);
    }
  });

  const abrirWhatsAppAprovacao = () => {
    if (!whatsappAtendimento) return;
    const mensagem = gerarMensagemWhatsApp();
    window.open(`https://wa.me/${whatsappAtendimento}?text=${mensagem}`, '_blank');
  };

  const handleFinalizarAssinatura = (assinaturaDataUrl) => {
    setAssinaturaData(assinaturaDataUrl);
    salvarMutation.mutate({ assinatura: assinaturaDataUrl }, {
      onSuccess: () => {
        setShowAssinatura(false);
        if (whatsappAtendimento) {
          setTimeout(() => abrirWhatsAppAprovacao(), 500);
        }
      }
    });
    setShowAssinatura(false);
  };

  const handleFinalizarManual = () => {
    if (!nomeAssinatura || !cpfAssinatura) {
      toast.error('Preencha nome e CPF');
      return;
    }
    
    const assinaturaTexto = `Assinado por: ${nomeAssinatura} - CPF: ${cpfAssinatura}`;
    salvarMutation.mutate({ assinatura: assinaturaTexto }, {
      onSuccess: () => {
        if (whatsappAtendimento) {
          setTimeout(() => abrirWhatsAppAprovacao(), 500);
        }
      }
    });
  };

  const handleIniciarFinalizacao = () => {
    // Array para acumular problemas
    const problemas = [];
    
    // Validar se há itens pendentes
    const itensPendentes = Object.values(decisoes).filter(d => d.decisao === 'pendente');
    if (itensPendentes.length > 0) {
      problemas.push(`❌ Faltam ${itensPendentes.length} ${itensPendentes.length === 1 ? 'item' : 'itens'} para decidir (Aprovar ou Recusar)`);
    }
    
    if (Object.keys(decisoes).length === 0) {
      problemas.push('❌ Não há itens no orçamento');
    }

    // Validar forma de pagamento
    if (formasPagamento.length > 0 && !formaPagamentoSelecionada) {
      problemas.push('❌ Forma de pagamento não selecionada');
    }

    // Validar assinatura manual
    if (tipoAssinatura === 'manual') {
      if (!nomeAssinatura) {
        problemas.push('❌ Nome completo não preenchido');
      }
      if (!cpfAssinatura) {
        problemas.push('❌ CPF não preenchido');
      }
    }

    // Se houver problemas, mostrar todos de uma vez
    if (problemas.length > 0) {
      toast.error(
        `⚠️ ATENÇÃO - Preencha os campos obrigatórios:\n\n${problemas.join('\n')}\n\n` +
        `📝 Complete as informações acima para finalizar seu orçamento.`,
        { duration: 8000 }
      );
      return;
    }

    // Tudo OK, prosseguir
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

  if (!id) {
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
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 to-orange-50/30 p-4">
        <XCircle className="w-20 h-20 text-red-400" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Não foi possível carregar o orçamento</h2>
          <p className="text-slate-600 max-w-md">
            {error?.message || 'O link pode estar incorreto ou expirado.'}
          </p>
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

  const { totalAprovado, totalReprovado } = totaisAtualizados;
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
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{item.nome}</p>
                      <p className="text-sm text-slate-600">
                        {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)} = R$ {item.valor_total?.toFixed(2)}
                      </p>
                      
                      {item.observacao_item && (
                        <div className="mt-3 p-3 bg-blue-100 border-l-4 border-blue-500 rounded">
                          <p className="text-xs font-bold text-blue-900 mb-1 uppercase">
                            📝 Observação do Técnico:
                          </p>
                          <p className="text-sm text-blue-800 font-medium leading-relaxed">
                            {item.observacao_item}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

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
                      Aprovado
                    </Button>
                    <Button
                      onClick={() => toggleDecisao(key, 'reprovado')}
                      variant={decisao === 'reprovado' ? 'default' : 'outline'}
                      className={`flex-1 ${decisao === 'reprovado' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Recusado
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
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{item.nome}</p>
                      <p className="text-sm text-slate-600">
                        {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)} = R$ {item.valor_total?.toFixed(2)}
                      </p>
                      
                      {item.comentario_tecnico && (
                        <div className="mt-3 p-3 bg-amber-100 border-l-4 border-amber-500 rounded">
                          <p className="text-xs font-bold text-amber-900 mb-1 uppercase">
                            🔧 Comentário do Técnico:
                          </p>
                          <p className="text-sm text-amber-800 font-medium leading-relaxed">
                            {item.comentario_tecnico}
                          </p>
                        </div>
                      )}
                      
                      {item.observacao_item && (
                        <div className="mt-3 p-3 bg-blue-100 border-l-4 border-blue-500 rounded">
                          <p className="text-xs font-bold text-blue-900 mb-1 uppercase">
                            📝 Observação do Item:
                          </p>
                          <p className="text-sm text-blue-800 font-medium leading-relaxed">
                            {item.observacao_item}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

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
                      Aprovado
                    </Button>
                    <Button
                      onClick={() => toggleDecisao(key, 'reprovado')}
                      variant={decisao === 'reprovado' ? 'default' : 'outline'}
                      className={`flex-1 ${decisao === 'reprovado' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Recusado
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

        {/* Condições Especiais */}
        <CondicoesEspeciais 
          valorTotal={totalAprovado} 
          condicoesEspeciais={condicoesEspeciais}
          produtos={produtos}
          modeloVeiculo={atendimento?.modelo || ''}
          onAdicionarProduto={handleAdicionarProdutoSugerido}
        />

        {/* Formas de Pagamento */}
        {formasPagamento.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-500" />
                Selecione a Forma de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formasPagamento.map((forma, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFormaPagamentoSelecionada(forma.nome)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      formaPagamentoSelecionada === forma.nome
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 bg-white hover:border-orange-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formaPagamentoSelecionada === forma.nome
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-slate-300'
                    }`}>
                      {formaPagamentoSelecionada === forma.nome && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className={`font-medium ${
                      formaPagamentoSelecionada === forma.nome
                        ? 'text-orange-700'
                        : 'text-slate-700'
                    }`}>
                      {forma.nome}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Checklist de pendências */}
        {(() => {
          const pendencias = [];
          const itensPendentes = Object.values(decisoes).filter(d => d.decisao === 'pendente');
          if (itensPendentes.length > 0) {
            pendencias.push(`Aprovar ou Recusar todos os itens do orçamento (${itensPendentes.length} item${itensPendentes.length > 1 ? 'ns' : ''} pendente${itensPendentes.length > 1 ? 's' : ''})`);
          }
          if (formasPagamento.length > 0 && !formaPagamentoSelecionada) {
            pendencias.push('Selecionar a forma de pagamento');
          }
          if (tipoAssinatura === 'manual' && !nomeAssinatura) {
            pendencias.push('Preencher o Nome Completo');
          }
          if (tipoAssinatura === 'manual' && !cpfAssinatura) {
            pendencias.push('Preencher o CPF');
          }

          if (pendencias.length === 0) return null;

          return (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-2">
              <p className="font-bold text-amber-800 text-base flex items-center gap-2">
                ⚠️ Para finalizar, você ainda precisa:
              </p>
              <ul className="space-y-1">
                {pendencias.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-amber-700 text-sm font-medium">
                    <span className="mt-0.5 text-amber-500">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Botão Finalizar */}
        <div className={`transition-all duration-500 ${tudoPreenchido ? 'animate-pulse' : ''}`}>
          <Button
            onClick={handleIniciarFinalizacao}
            disabled={salvarMutation.isPending}
            className={`w-full text-lg py-6 transition-all duration-500 ${
              tudoPreenchido 
                ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/50 scale-105' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {salvarMutation.isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            {tudoPreenchido ? '✅ Finalizar e Enviar Minha Decisão' : 'Finalizar e Enviar Minha Decisão'}
          </Button>
          {tudoPreenchido && (
            <p className="text-center text-green-600 font-semibold text-sm mt-2 animate-pulse">
              🎉 Tudo pronto! Clique para finalizar
            </p>
          )}
        </div>
        
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