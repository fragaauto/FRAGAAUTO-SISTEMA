import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ArrowLeft,
  Car,
  User,
  ClipboardCheck,
  FileText,
  Download,
  Share2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  Edit,
  Trash2,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OrcamentoPDF from '../components/pdf/OrcamentoPDF';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_CONFIG = {
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-800' },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
  reprovado: { label: 'Reprovado', color: 'bg-red-100 text-red-800' },
  concluido: { label: 'Concluído', color: 'bg-purple-100 text-purple-800' }
};

const STATUS_ICON = {
  ok: { icon: CheckCircle2, color: 'text-green-500' },
  com_defeito: { icon: XCircle, color: 'text-red-500' },
  nao_possui: { icon: MinusCircle, color: 'text-gray-400' },
  nao_verificado: { icon: MinusCircle, color: 'text-yellow-500' }
};

export default function VerAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pdfRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const { data: atendimento, isLoading } = useQuery({
    queryKey: ['atendimento', id],
    queryFn: () => base44.entities.Atendimento.list().then(list => list.find(a => a.id === id)),
    enabled: !!id
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Atendimento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['atendimento', id]);
      toast.success('Status atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Atendimento.delete(id),
    onSuccess: () => {
      toast.success('Atendimento excluído');
      navigate(createPageUrl('Atendimentos'));
    }
  });

  const generatePDF = () => {
    setIsGeneratingPDF(true);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita pop-ups para gerar o PDF');
      setIsGeneratingPDF(false);
      return;
    }

    const content = pdfRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orçamento - ${atendimento.placa}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            * { box-sizing: border-box; }
            .bg-slate-800 { background-color: #1e293b; color: white; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .bg-red-50 { background-color: #fef2f2; }
            .bg-yellow-50 { background-color: #fefce8; }
            .text-slate-800 { color: #1e293b; }
            .text-slate-600 { color: #475569; }
            .text-slate-500 { color: #64748b; }
            .text-red-500 { color: #ef4444; }
            .text-orange-400 { color: #fb923c; }
            .text-green-600 { color: #16a34a; }
            .border-orange-500 { border-color: #f97316; }
            .border-yellow-500 { border-color: #eab308; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border: 1px solid #e2e8f0; }
            th { background-color: #f1f5f9; }
            .rounded-lg { border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setIsGeneratingPDF(false);
    toast.success('PDF pronto para impressão!');
  };

  const shareWhatsApp = () => {
    const text = `*Orçamento Fraga Auto Portas*\n\nVeículo: ${atendimento.placa} - ${atendimento.modelo}\nValor: R$ ${atendimento.valor_final?.toFixed(2)}\n\nEntre em contato para mais detalhes.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!atendimento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Atendimento não encontrado</p>
        <Button onClick={() => navigate(createPageUrl('Atendimentos'))}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  const defeitosCount = atendimento.checklist?.filter(i => i.status === 'com_defeito').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl('Atendimentos'))}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800">{atendimento.placa}</h1>
                  <Badge className={STATUS_CONFIG[atendimento.status]?.color}>
                    {STATUS_CONFIG[atendimento.status]?.label}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">{atendimento.modelo}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={shareWhatsApp}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="resumo">
          <TabsList className="mb-6">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-6">
            {/* Vehicle Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-orange-500" />
                  Veículo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Placa</p>
                    <p className="font-semibold">{atendimento.placa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Modelo</p>
                    <p className="font-semibold">{atendimento.modelo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Marca</p>
                    <p className="font-semibold">{atendimento.marca || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Ano</p>
                    <p className="font-semibold">{atendimento.ano || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">KM</p>
                    <p className="font-semibold">{atendimento.km_atual || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Entrada</p>
                    <p className="font-semibold">
                      {atendimento.data_entrada 
                        ? format(new Date(atendimento.data_entrada), "dd/MM/yyyy", { locale: ptBR })
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Nome</p>
                    <p className="font-semibold">{atendimento.cliente_nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Telefone</p>
                    <p className="font-semibold">{atendimento.cliente_telefone || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-slate-800 text-white">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-400">Itens verificados</p>
                    <p className="text-2xl font-bold">{atendimento.checklist?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Defeitos</p>
                    <p className="text-2xl font-bold text-red-400">{defeitosCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Valor Total</p>
                    <p className="text-2xl font-bold text-orange-400">
                      R$ {atendimento.valor_final?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle>Atualizar Status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Select
                  value={atendimento.status}
                  onValueChange={(value) => updateMutation.mutate({ status: value })}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="sm:ml-auto">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir atendimento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O atendimento será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4">
            {atendimento.checklist?.length === 0 ? (
              <Card className="py-8">
                <CardContent className="text-center text-slate-500">
                  Nenhum item verificado no checklist
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Defects first */}
                {defeitosCount > 0 && (
                  <Card className="border-red-200 bg-red-50/50">
                    <CardHeader>
                      <CardTitle className="text-red-700 flex items-center gap-2">
                        <XCircle className="w-5 h-5" />
                        Defeitos Encontrados ({defeitosCount})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {atendimento.checklist
                        .filter(item => item.status === 'com_defeito')
                        .map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
                            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-slate-800">{item.item}</p>
                              {item.comentario && (
                                <p className="text-sm text-slate-600 mt-1">{item.comentario}</p>
                              )}
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                )}

                {/* All items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Todos os Itens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {atendimento.checklist?.map((item, idx) => {
                      const StatusIcon = STATUS_ICON[item.status]?.icon || MinusCircle;
                      const statusColor = STATUS_ICON[item.status]?.color || 'text-gray-400';
                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <StatusIcon className={`w-5 h-5 ${statusColor} mt-0.5 flex-shrink-0`} />
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{item.item}</p>
                            {item.comentario && (
                              <p className="text-sm text-slate-600 mt-1">{item.comentario}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {item.status?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Pre-diagnosis */}
                {atendimento.pre_diagnostico && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Pré-Diagnóstico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 whitespace-pre-wrap">{atendimento.pre_diagnostico}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="orcamento" className="space-y-4">
            {atendimento.itens_orcamento?.length === 0 ? (
              <Card className="py-8">
                <CardContent className="text-center text-slate-500">
                  Nenhum item no orçamento
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Itens do Orçamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {atendimento.itens_orcamento?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">{item.nome}</p>
                            <p className="text-sm text-slate-500">
                              {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-bold text-green-600">
                            R$ {item.valor_total?.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 text-white">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>R$ {atendimento.subtotal?.toFixed(2)}</span>
                    </div>
                    {atendimento.desconto > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Desconto:</span>
                        <span>- R$ {atendimento.desconto?.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-3 flex justify-between text-xl font-bold">
                      <span>TOTAL:</span>
                      <span className="text-orange-400">R$ {atendimento.valor_final?.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {atendimento.observacoes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 whitespace-pre-wrap">{atendimento.observacoes}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden PDF Component */}
      <div className="absolute left-[-9999px]">
        <div ref={pdfRef}>
          <OrcamentoPDF atendimento={atendimento} />
        </div>
      </div>
    </div>
  );
}