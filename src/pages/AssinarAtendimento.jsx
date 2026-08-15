import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Car,
  User,
  PenTool,
  Send,
  Image as ImageIcon,
  Calendar,
  Clock,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import AssinaturaDigital from '../components/assinatura/AssinaturaDigital';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AssinarAtendimento() {
  // ROTA PÚBLICA
  React.useEffect(() => {
    window.__IS_PUBLIC_ROUTE__ = true;
    return () => { window.__IS_PUBLIC_ROUTE__ = false; };
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [showAssinatura, setShowAssinatura] = useState(false);
  const [assinaturaData, setAssinaturaData] = useState(null);
  const [concluido, setConcluido] = useState(false);

  const { data: atendimento, isLoading, isError } = useQuery({
    queryKey: ['atendimento-assinatura', id],
    queryFn: async () => {
      if (!id) throw new Error('ID não fornecido');
      const result = await base44.entities.Atendimento.get(id);
      if (!result) throw new Error('Atendimento não encontrado');
      return result;
    },
    enabled: !!id,
    retry: 1,
    staleTime: 0,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes-publica'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 10 * 60 * 1000,
  });
  const config = configs[0] || {};

  const salvarMutation = useMutation({
    mutationFn: (data) => base44.entities.Atendimento.update(id, data),
    onSuccess: () => {
      setConcluido(true);
      toast.success('Assinatura registrada com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao salvar assinatura: ' + (err.message || 'Tente novamente'));
      setAssinaturaData(null);
    },
  });

  const handleSalvarAssinatura = (dataUrl) => {
    setAssinaturaData(dataUrl);
    setShowAssinatura(false);
    salvarMutation.mutate({
      assinatura_cliente_atendimento: dataUrl,
      data_assinatura_atendimento: new Date().toISOString(),
    });
  };

  const fmtDataHora = (iso) => {
    if (!iso) return '-';
    try {
      return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const fmtData = (iso) => {
    if (!iso) return '-';
    try {
      return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Carregando atendimento...</p>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <XCircle className="w-12 h-12 text-amber-400" />
        <p className="text-slate-700 font-semibold">Link inválido</p>
        <p className="text-sm text-slate-500 text-center max-w-md">
          Este link não contém o identificador do atendimento. Acesse pelo link enviado pela oficina via WhatsApp.
        </p>
        <p className="text-xs text-slate-400 text-center max-w-md mt-2">
          Dica: para testar, acesse <code className="bg-slate-200 px-1 rounded">/AssinarAtendimento?id=&lt;ID&gt;</code>
        </p>
      </div>
    );
  }

  if (isError || !atendimento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <XCircle className="w-12 h-12 text-red-400" />
        <p className="text-slate-700 font-semibold">Atendimento não encontrado</p>
        <p className="text-sm text-slate-500">Verifique o link recebido ou entre em contato com a oficina.</p>
      </div>
    );
  }

  const fotos = atendimento.fotos || [];
  const jaAssinado = !!atendimento.assinatura_cliente_atendimento;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            {config.logo_url ? (
              <img src={config.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-contain" />
            ) : (
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-800">{config.nome_empresa || 'Fraga Auto Portas'}</h1>
              <p className="text-xs text-slate-500">Confirmação de Atendimento</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {concluido || jaAssinado ? (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-6 text-center space-y-3">
              <ShieldCheck className="w-14 h-14 text-green-600 mx-auto" />
              <h2 className="text-xl font-bold text-green-800">Atendimento Confirmado!</h2>
              <p className="text-green-700 text-sm">
                Sua assinatura foi registrada em {fmtDataHora(atendimento.data_assinatura_atendimento || new Date().toISOString())}.
              </p>
              {atendimento.assinatura_cliente_atendimento && (
                <div className="flex justify-center pt-2">
                  <img
                    src={atendimento.assinatura_cliente_atendimento}
                    alt="Sua assinatura"
                    className="border border-green-300 rounded-lg max-h-32 bg-white"
                  />
                </div>
              )}
              <p className="text-slate-500 text-xs pt-2">Obrigado! Você já pode fechar esta página.</p>
            </CardContent>
          </Card>
        ) : null}

        {/* OS / Veículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="w-5 h-5 text-orange-500" />
              Dados do Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {atendimento.numero_os && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded border">
                  OS #{String(atendimento.numero_os).padStart(6, '0')}
                </span>
                <span className="text-sm text-slate-500">
                  Entrada: {fmtData(atendimento.data_entrada)}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Placa</p>
                <p className="font-semibold uppercase">{atendimento.placa || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Modelo</p>
                <p className="font-semibold">{atendimento.modelo || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Marca</p>
                <p className="font-semibold">{atendimento.marca || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ano</p>
                <p className="font-semibold">{atendimento.ano || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">KM</p>
                <p className="font-semibold">{atendimento.km_atual || '-'}</p>
              </div>
            </div>
            {atendimento.observacoes_veiculo && (
              <div className="pt-3 border-t">
                <p className="text-xs text-slate-500 mb-1">Observações do Veículo</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{atendimento.observacoes_veiculo}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5 text-blue-500" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Nome</p>
                <p className="font-semibold">{atendimento.cliente_nome || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Telefone</p>
                <p className="font-semibold">{atendimento.cliente_telefone || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queixa Inicial */}
        {atendimento.queixa_inicial && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-blue-500" />
                Queixa Inicial do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                {atendimento.queixa_inicial}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Itens da Queixa */}
        {atendimento.itens_queixa?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens da Queixa Inicial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {atendimento.itens_queixa.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-slate-50">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{item.nome}</p>
                        <p className="text-xs text-slate-500">Qtd: {item.quantidade}</p>
                        {item.observacao_item && (
                          <p className="text-xs text-slate-600 mt-1 italic">{item.observacao_item}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">R$ {Number(item.valor_total || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-right pt-2 border-t">
                  <span className="text-sm font-semibold text-blue-700">
                    Subtotal Queixa: R$ {Number(atendimento.subtotal_queixa || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Itens do Checklist/Orçamento */}
        {atendimento.itens_orcamento?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens do Orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {atendimento.itens_orcamento.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-slate-50">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{item.nome}</p>
                        <p className="text-xs text-slate-500">Qtd: {item.quantidade}</p>
                        {item.observacao_item && (
                          <p className="text-xs text-slate-600 mt-1 italic">{item.observacao_item}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">R$ {Number(item.valor_total || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-right pt-2 border-t">
                  <span className="text-sm font-semibold text-orange-700">
                    Subtotal Checklist: R$ {Number(atendimento.subtotal_checklist || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Totais */}
        <Card className="bg-slate-800 text-white">
          <CardContent className="pt-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {Number(atendimento.subtotal || 0).toFixed(2)}</span>
            </div>
            {atendimento.desconto > 0 && (
              <div className="flex justify-between text-sm text-green-300">
                <span>Desconto:</span>
                <span>- R$ {Number(atendimento.desconto).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/20">
              <span>VALOR TOTAL:</span>
              <span className="text-orange-400">R$ {Number(atendimento.valor_final || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {atendimento.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{atendimento.observacoes}</p>
            </CardContent>
          </Card>
        )}

        {/* Fotos do Atendimento */}
        {fotos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                Fotos do Atendimento ({fotos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fotos.map((foto, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden bg-slate-50">
                    <img
                      src={foto.url}
                      alt={foto.descricao || `Foto ${idx + 1}`}
                      className="w-full h-32 object-cover cursor-pointer"
                      onClick={() => {
                        const w = window.open(foto.url, '_blank');
                        if (w) w.focus();
                      }}
                    />
                    <div className="p-2 space-y-1">
                      {foto.descricao && (
                        <p className="text-xs font-medium text-slate-700 truncate">{foto.descricao}</p>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {fmtData(foto.data_upload)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        {foto.data_upload ? format(new Date(foto.data_upload), 'HH:mm', { locale: ptBR }) : '-'}
                      </div>
                      {foto.usuario && (
                        <p className="text-[10px] text-slate-400 truncate">Por: {foto.usuario}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assinatura */}
        {!concluido && !jaAssinado && (
          <Card className="border-orange-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PenTool className="w-5 h-5 text-orange-500" />
                Assinatura Digital do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Após revisar todos os dados, fotos e observações acima, assine abaixo para confirmar o atendimento.
              </p>
              {assinaturaData && (
                <div className="border-2 border-green-300 rounded-lg p-3 bg-green-50">
                  <p className="text-xs font-semibold text-green-700 mb-2">Assinatura capturada:</p>
                  <img src={assinaturaData} alt="Assinatura" className="max-h-24 bg-white rounded" />
                </div>
              )}
              <Button
                onClick={() => setShowAssinatura(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 py-6 text-base"
                disabled={salvarMutation.isPending}
              >
                <PenTool className="w-5 h-5 mr-2" />
                {assinaturaData ? 'Assinar Novamente' : 'Assinar Agora'}
              </Button>
              {assinaturaData && (
                <Button
                  onClick={() => handleSalvarAssinatura(assinaturaData)}
                  disabled={salvarMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 py-6 text-base"
                >
                  {salvarMutation.isPending ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  Confirmar e Enviar Assinatura
                </Button>
              )}
              {salvarMutation.isError && (
                <p className="text-sm text-red-600 text-center">
                  Erro ao salvar. Tente novamente.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-slate-400 pt-4 pb-8">
          {config.nome_empresa || 'Fraga Auto Portas'} © {new Date().getFullYear()}
        </p>
      </div>

      {showAssinatura && (
        <AssinaturaDigital
          title="Assinar Atendimento"
          onSave={(dataUrl) => {
            setAssinaturaData(dataUrl);
            setShowAssinatura(false);
            toast.success('Assinatura capturada! Confirme abaixo para enviar.');
          }}
          onClose={() => setShowAssinatura(false)}
        />
      )}
    </div>
  );
}