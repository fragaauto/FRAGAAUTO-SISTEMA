import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  MessageCircle,
  PenTool,
  RotateCcw,
  AlertTriangle,
  Save
} from 'lucide-react';
import ItemAprovacao from '../components/aprovacao/ItemAprovacao';
import AssinaturaDigital from '../components/assinatura/AssinaturaDigital';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  queixa_pendente: { label: 'Queixa Pendente', color: 'bg-yellow-100 text-yellow-800' },
  queixa_aprovada: { label: 'Queixa Aprovada', color: 'bg-blue-100 text-blue-800' },
  queixa_reprovada: { label: 'Queixa Reprovada', color: 'bg-red-100 text-red-800' },
  em_diagnostico: { label: 'Em Diagnóstico', color: 'bg-orange-100 text-orange-800' },
  aguardando_aprovacao_checklist: { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-800' },
  checklist_aprovado: { label: 'Checklist Aprovado', color: 'bg-green-100 text-green-800' },
  checklist_reprovado: { label: 'Checklist Reprovado', color: 'bg-red-100 text-red-800' },
  em_execucao: { label: 'Em Execução', color: 'bg-purple-100 text-purple-800' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelado: { label: 'Cancelado', color: 'bg-slate-100 text-slate-800' }
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
  const [showAssinaturaQueixa, setShowAssinaturaQueixa] = useState(false);
  const [showAssinaturaChecklist, setShowAssinaturaChecklist] = useState(false);
  const [modoEdicaoQueixa, setModoEdicaoQueixa] = useState(false);
  const [modoEdicaoOrcamento, setModoEdicaoOrcamento] = useState(false);
  const [user, setUser] = useState(null);
  const [itensQueixaEdit, setItensQueixaEdit] = useState([]);
  const [itensOrcamentoEdit, setItensOrcamentoEdit] = useState([]);

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  // Carregar usuário atual
  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: atendimento, isLoading, error } = useQuery({
    queryKey: ['atendimento', id],
    queryFn: async () => {
      if (!id) return null;
      const list = await base44.entities.Atendimento.list();
      const found = list.find(a => a.id === id);
      return found || null;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Atendimento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['atendimento', id]);
      toast.success('Atualizado com sucesso!');
    }
  });

  const handleSaveAssinatura = (tipo, assinaturaDataUrl) => {
    const data = tipo === 'queixa' 
      ? { assinatura_cliente_queixa: assinaturaDataUrl, data_aprovacao_queixa: new Date().toISOString() }
      : { assinatura_cliente_checklist: assinaturaDataUrl, data_aprovacao_checklist: new Date().toISOString() };
    
    updateMutation.mutate(data);
    if (tipo === 'queixa') setShowAssinaturaQueixa(false);
    else setShowAssinaturaChecklist(false);
  };

  const handleUpdateItemQueixa = (index, updatedItem) => {
    const novosItens = [...(atendimento.itens_queixa || [])];
    novosItens[index] = updatedItem;
    updateMutation.mutate({ itens_queixa: novosItens });
  };

  const iniciarEdicaoQueixa = () => {
    setItensQueixaEdit([...atendimento.itens_queixa || []]);
    setModoEdicaoQueixa(true);
  };

  const salvarEdicaoQueixa = () => {
    const subtotal_queixa = itensQueixaEdit.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const subtotal = subtotal_queixa + (atendimento.subtotal_checklist || 0);
    const valor_final = subtotal - (atendimento.desconto || 0);

    const historicoItem = {
      data: new Date().toISOString(),
      usuario: user?.email || 'Sistema',
      campo_editado: 'queixa',
      descricao: 'Orçamento da queixa editado'
    };

    updateMutation.mutate({
      itens_queixa: itensQueixaEdit,
      subtotal_queixa,
      subtotal,
      valor_final,
      assinatura_cliente_queixa: null,
      data_aprovacao_queixa: null,
      status: 'queixa_pendente',
      historico_edicoes: [...(atendimento.historico_edicoes || []), historicoItem]
    });
    
    setModoEdicaoQueixa(false);
  };

  const atualizarItemQueixaEdit = (index, field, value) => {
    const novosItens = [...itensQueixaEdit];
    if (field === 'quantidade') {
      const qtd = value === '' ? '' : Math.max(1, parseInt(value) || 1);
      novosItens[index] = { ...novosItens[index], [field]: qtd };
    } else {
      novosItens[index] = { ...novosItens[index], [field]: value };
    }
    if (field === 'quantidade' || field === 'valor_unitario') {
      const quantidade = novosItens[index].quantidade === '' ? 0 : novosItens[index].quantidade;
      novosItens[index].valor_total = quantidade * (novosItens[index].valor_unitario || 0);
    }
    setItensQueixaEdit(novosItens);
  };

  const removerItemQueixaEdit = (index) => {
    setItensQueixaEdit(prev => prev.filter((_, i) => i !== index));
  };

  const iniciarEdicaoOrcamento = () => {
    setItensOrcamentoEdit([...atendimento.itens_orcamento || []]);
    setModoEdicaoOrcamento(true);
  };

  const salvarEdicaoOrcamento = () => {
    const subtotal = itensOrcamentoEdit.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const valor_final = subtotal - (atendimento.desconto || 0);

    const historicoItem = {
      data: new Date().toISOString(),
      usuario: user?.email || 'Sistema',
      campo_editado: 'orcamento',
      descricao: 'Orçamento editado'
    };

    updateMutation.mutate({
      itens_orcamento: itensOrcamentoEdit,
      subtotal,
      valor_final,
      assinatura_cliente_checklist: null,
      data_aprovacao_checklist: null,
      status: 'em_diagnostico',
      historico_edicoes: [...(atendimento.historico_edicoes || []), historicoItem]
    });
    
    setModoEdicaoOrcamento(false);
  };

  const atualizarItemOrcamentoEdit = (index, field, value) => {
    const novosItens = [...itensOrcamentoEdit];
    if (field === 'quantidade') {
      const qtd = value === '' ? '' : Math.max(1, parseInt(value) || 1);
      novosItens[index] = { ...novosItens[index], [field]: qtd };
    } else {
      novosItens[index] = { ...novosItens[index], [field]: value };
    }
    if (field === 'quantidade' || field === 'valor_unitario') {
      const quantidade = novosItens[index].quantidade === '' ? 0 : novosItens[index].quantidade;
      novosItens[index].valor_total = quantidade * (novosItens[index].valor_unitario || 0);
    }
    setItensOrcamentoEdit(novosItens);
  };

  const removerItemOrcamentoEdit = (index) => {
    setItensOrcamentoEdit(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemChecklist = (index, updatedItem) => {
    const novosItens = [...(atendimento.itens_orcamento || [])];
    novosItens[index] = updatedItem;
    
    // Recalcular totais
    const subtotal = novosItens.reduce((acc, item) => acc + (item.valor_total || 0), 0);
    const valor_final = subtotal - (atendimento.desconto || 0);
    
    const historicoItem = {
      data: new Date().toISOString(),
      usuario: user?.email || 'Sistema',
      campo_editado: 'itens_orcamento',
      descricao: `Item "${updatedItem.nome}" editado - status: ${updatedItem.status_aprovacao}`
    };
    
    updateMutation.mutate({ 
      itens_orcamento: novosItens,
      subtotal,
      valor_final,
      historico_edicoes: [...(atendimento.historico_edicoes || []), historicoItem]
    });
  };

  const reabrirQueixa = () => {
    const historicoItem = {
      data: new Date().toISOString(),
      usuario: user?.email || 'Sistema',
      campo_editado: 'queixa',
      descricao: 'Queixa reaberta para edição'
    };
    
    updateMutation.mutate({
      assinatura_cliente_queixa: null,
      data_aprovacao_queixa: null,
      status: 'queixa_pendente',
      historico_edicoes: [...(atendimento.historico_edicoes || []), historicoItem]
    });
    
    toast.warning('Queixa reaberta - assinatura anterior invalidada');
  };

  const reabrirChecklist = () => {
    const historicoItem = {
      data: new Date().toISOString(),
      usuario: user?.email || 'Sistema',
      campo_editado: 'checklist',
      descricao: 'Checklist/Orçamento reaberto para edição'
    };
    
    updateMutation.mutate({
      assinatura_cliente_checklist: null,
      data_aprovacao_checklist: null,
      status: 'em_diagnostico',
      historico_edicoes: [...(atendimento.historico_edicoes || []), historicoItem]
    });
    
    toast.warning('Checklist reaberto - assinatura anterior invalidada');
  };

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Atendimento.delete(id),
    onSuccess: () => {
      toast.success('Atendimento excluído');
      navigate(createPageUrl('Atendimentos'));
    }
  });

  const generatePDF = () => {
    setIsGeneratingPDF(true);
    
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Permita pop-ups para gerar o PDF');
        setIsGeneratingPDF(false);
        return;
      }

      const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      const defeitosEncontrados = atendimento.checklist?.filter(item => item.status === 'com_defeito') || [];

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Orçamento - ${atendimento.placa}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: Arial, sans-serif; 
                padding: 30px;
                max-width: 800px;
                margin: 0 auto;
                background: white;
              }
              .header {
                border-bottom: 4px solid #f97316;
                padding-bottom: 20px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: start;
              }
              .header-left h1 {
                font-size: 28px;
                color: #1e293b;
                margin-bottom: 5px;
              }
              .header-left p {
                color: #64748b;
                font-size: 14px;
              }
              .header-right {
                text-align: right;
                font-size: 12px;
                color: #64748b;
              }
              .title-box {
                background: #1e293b;
                color: white;
                text-align: center;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .title-box h2 {
                font-size: 20px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 14px;
              }
              .section {
                background: #f8fafc;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
              }
              .section h3 {
                font-size: 16px;
                color: #1e293b;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #e2e8f0;
              }
              .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                font-size: 14px;
              }
              .grid-item strong {
                color: #1e293b;
                display: block;
                margin-bottom: 3px;
              }
              .defect-list {
                margin-top: 10px;
              }
              .defect-item {
                background: #fef2f2;
                padding: 10px;
                margin-bottom: 8px;
                border-radius: 6px;
                border-left: 3px solid #ef4444;
                font-size: 14px;
              }
              .defect-item strong {
                color: #1e293b;
                display: block;
                margin-bottom: 3px;
              }
              .defect-item span {
                color: #64748b;
              }
              .diagnostico {
                background: #fefce8;
                border-left: 4px solid #eab308;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 4px;
              }
              .diagnostico h3 {
                color: #1e293b;
                margin-bottom: 10px;
                font-size: 16px;
              }
              .diagnostico p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                white-space: pre-wrap;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                font-size: 14px;
              }
              th, td {
                padding: 12px;
                text-align: left;
                border: 1px solid #e2e8f0;
              }
              th {
                background: #f1f5f9;
                font-weight: 600;
                color: #1e293b;
              }
              tbody tr:nth-child(even) {
                background: #f8fafc;
              }
              .totals {
                background: #1e293b;
                color: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                font-size: 14px;
              }
              .total-final {
                border-top: 2px solid rgba(255,255,255,0.2);
                padding-top: 15px;
                margin-top: 15px;
                display: flex;
                justify-content: space-between;
                font-size: 20px;
                font-weight: bold;
              }
              .total-final .value {
                color: #fb923c;
              }
              .observacoes {
                background: #f8fafc;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
              }
              .observacoes h3 {
                color: #1e293b;
                margin-bottom: 10px;
                font-size: 16px;
              }
              .observacoes p {
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                white-space: pre-wrap;
              }
              .footer {
                border-top: 2px solid #e2e8f0;
                padding-top: 20px;
                margin-top: 30px;
              }
              .footer-note {
                text-align: center;
                color: #64748b;
                font-size: 12px;
                margin-bottom: 30px;
              }
              .signatures {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-top: 40px;
              }
              .signature {
                text-align: center;
              }
              .signature-line {
                border-top: 1px solid #94a3b8;
                padding-top: 10px;
                margin-top: 50px;
              }
              .signature p {
                font-size: 14px;
                font-weight: 600;
                color: #1e293b;
              }
              .signature small {
                font-size: 12px;
                color: #64748b;
              }
              .validity {
                text-align: center;
                color: #94a3b8;
                font-size: 11px;
                margin-top: 20px;
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
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
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
            <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
            
            <div class="header">
              <div class="header-left">
                <h1>FRAGA AUTO PORTAS</h1>
                <p>Especialista em Manutenção de Portas e Acessórios Automotivos</p>
              </div>
              <div class="header-right">
                <p>📍 Endereço da oficina</p>
                <p>📞 (XX) XXXXX-XXXX</p>
                <p>📧 contato@fragaauto.com.br</p>
              </div>
            </div>

            <div class="title-box">
              <h2>PRÉ-ORÇAMENTO</h2>
            </div>

            <div class="info-row">
              <span><strong>Data:</strong> ${hoje}</span>
              <span><strong>Nº:</strong> ${atendimento.id?.slice(-8).toUpperCase()}</span>
            </div>

            <div class="section">
              <h3>DADOS DO CLIENTE</h3>
              <div class="grid">
                <div class="grid-item">
                  <strong>Nome:</strong>
                  ${atendimento.cliente_nome || '-'}
                </div>
                <div class="grid-item">
                  <strong>Telefone:</strong>
                  ${atendimento.cliente_telefone || '-'}
                </div>
              </div>
            </div>

            <div class="section">
              <h3>DADOS DO VEÍCULO</h3>
              <div class="grid">
                <div class="grid-item">
                  <strong>Placa:</strong>
                  ${atendimento.placa}
                </div>
                <div class="grid-item">
                  <strong>Modelo:</strong>
                  ${atendimento.modelo}
                </div>
                <div class="grid-item">
                  <strong>Marca:</strong>
                  ${atendimento.marca || '-'}
                </div>
                <div class="grid-item">
                  <strong>Ano:</strong>
                  ${atendimento.ano || '-'}
                </div>
                <div class="grid-item">
                  <strong>KM Atual:</strong>
                  ${atendimento.km_atual || '-'}
                </div>
                <div class="grid-item">
                  <strong>Data Entrada:</strong>
                  ${atendimento.data_entrada ? format(new Date(atendimento.data_entrada), 'dd/MM/yyyy') : '-'}
                </div>
              </div>
            </div>

            ${defeitosEncontrados.length > 0 ? `
              <div style="margin-bottom: 20px;">
                <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f97316;">
                  ITENS COM DEFEITO IDENTIFICADOS
                </h3>
                <div class="defect-list">
                  ${defeitosEncontrados.map(item => `
                    <div class="defect-item">
                      <strong>✗ ${item.item}</strong>
                      ${item.comentario ? `<span>${item.comentario}</span>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${atendimento.pre_diagnostico ? `
              <div class="diagnostico">
                <h3>PRÉ-DIAGNÓSTICO</h3>
                <p>${atendimento.pre_diagnostico}</p>
              </div>
            ` : ''}

            ${atendimento.itens_orcamento?.length > 0 ? `
              <div style="margin-bottom: 20px;">
                <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f97316;">
                  SERVIÇOS E PRODUTOS
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style="text-align: center; width: 80px;">Qtd</th>
                      <th style="text-align: right; width: 120px;">Valor Unit.</th>
                      <th style="text-align: right; width: 120px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${atendimento.itens_orcamento.map(item => `
                      <tr>
                        <td>
                          ${item.nome}
                          ${item.vantagens ? `
                            <div style="margin-top: 6px; padding: 8px; background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 4px;">
                              <strong style="font-size: 11px; color: #166534;">✓ Benefícios de realizar:</strong>
                              <p style="font-size: 11px; color: #15803d; margin: 4px 0 0 0;">${item.vantagens}</p>
                            </div>
                          ` : ''}
                          ${item.desvantagens ? `
                            <div style="margin-top: 6px; padding: 8px; background: #fef2f2; border-left: 3px solid #f59e0b; border-radius: 4px;">
                              <strong style="font-size: 11px; color: #92400e;">⚠️ Riscos de não realizar:</strong>
                              <p style="font-size: 11px; color: #78350f; margin: 4px 0 0 0;">${item.desvantagens}</p>
                            </div>
                          ` : ''}
                        </td>
                        <td style="text-align: center;">${item.quantidade}</td>
                        <td style="text-align: right;">R$ ${item.valor_unitario?.toFixed(2)}</td>
                        <td style="text-align: right; font-weight: 600;">R$ ${item.valor_total?.toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>R$ ${atendimento.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              ${atendimento.desconto > 0 ? `
                <div class="total-row" style="color: #86efac;">
                  <span>Desconto:</span>
                  <span>- R$ ${atendimento.desconto?.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-final">
                <span>VALOR TOTAL:</span>
                <span class="value">R$ ${atendimento.valor_final?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            ${atendimento.observacoes ? `
              <div class="observacoes">
                <h3>OBSERVAÇÕES</h3>
                <p>${atendimento.observacoes}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p class="footer-note">
                Este é um pré-orçamento e os valores podem sofrer alterações após diagnóstico completo.
              </p>
              
              <div class="signatures">
                <div class="signature">
                  <div class="signature-line">
                    <p>Técnico Responsável</p>
                    <small>${atendimento.tecnico || 'Fraga Auto Portas'}</small>
                  </div>
                </div>
                <div class="signature">
                  <div class="signature-line">
                    <p>Cliente</p>
                    <small>${atendimento.cliente_nome || ''}</small>
                  </div>
                </div>
              </div>

              <p class="validity">
                Orçamento válido por 7 dias • Fraga Auto Portas © ${new Date().getFullYear()}
              </p>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      setTimeout(() => {
        setIsGeneratingPDF(false);
        toast.success('PDF aberto! Clique no botão para imprimir');
      }, 500);
    } catch (error) {
      toast.error('Erro ao gerar PDF');
      console.error(error);
      setIsGeneratingPDF(false);
    }
  };

  const shareWhatsApp = () => {
    const text = `*Orçamento Fraga Auto Portas*\n\nVeículo: ${atendimento.placa} - ${atendimento.modelo}\nValor: R$ ${atendimento.valor_final?.toFixed(2)}\n\nEntre em contato para mais detalhes.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!id) {
    navigate(createPageUrl('Atendimentos'));
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Carregando atendimento...</p>
        </div>
      </div>
    );
  }

  if (error || !atendimento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 to-orange-50/30">
        <XCircle className="w-12 h-12 text-red-400" />
        <p className="text-slate-700 font-semibold">Atendimento não encontrado</p>
        <p className="text-sm text-slate-500">ID: {id}</p>
        <Button onClick={() => navigate(createPageUrl('Atendimentos'))} className="bg-orange-500 hover:bg-orange-600">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para lista
        </Button>
      </div>
    );
  }

  const defeitosCount = atendimento.checklist?.filter(i => i.status === 'com_defeito').length || 0;
  const isAdmin = user?.role === 'admin';
  const queixaAssinada = !!atendimento.assinatura_cliente_queixa;
  const checklistAssinado = !!atendimento.assinatura_cliente_checklist;

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
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(createPageUrl(`EditarAtendimento?id=${id}`))}
                  className="hidden sm:flex"
                >
                  <Edit className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Editar Checklist</span>
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(createPageUrl(`EditarAtendimento?id=${id}`))}
                  className="sm:hidden"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
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
            <TabsTrigger value="queixa">Queixa</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
            <TabsTrigger value="aprovacao">Aprovação</TabsTrigger>
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
                
                {isAdmin && (
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
                )}
              </CardContent>
            </Card>

            {/* Histórico de Edições */}
            {atendimento.historico_edicoes?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Alterações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {atendimento.historico_edicoes.slice(-5).reverse().map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{item.descricao}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {format(new Date(item.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.usuario?.split('@')[0]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="queixa" className="space-y-4">
            {atendimento.queixa_inicial && (
              <Card>
                <CardHeader>
                  <CardTitle>Queixa Inicial do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap">{atendimento.queixa_inicial}</p>
                </CardContent>
              </Card>
            )}

            {atendimento.itens_queixa?.length > 0 && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Orçamento da Queixa</CardTitle>
                    {isAdmin && !modoEdicaoQueixa && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={iniciarEdicaoQueixa}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {modoEdicaoQueixa ? (
                      <div className="space-y-4">
                        {itensQueixaEdit.map((item, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-start justify-between mb-3">
                              <p className="font-medium">{item.nome}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerItemQueixaEdit(idx)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Quantidade</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min="1"
                                  value={item.quantidade}
                                  onChange={(e) => atualizarItemQueixaEdit(idx, 'quantidade', e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={(e) => {
                                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                      atualizarItemQueixaEdit(idx, 'quantidade', 1);
                                    }
                                  }}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Valor Unitário</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.valor_unitario}
                                  onChange={(e) => atualizarItemQueixaEdit(idx, 'valor_unitario', parseFloat(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <div className="mt-2 text-right">
                              <span className="text-sm font-bold text-green-600">
                                Total: R$ {item.valor_total?.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setModoEdicaoQueixa(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={salvarEdicaoQueixa}
                            disabled={updateMutation.isPending}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Salvar Alterações
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {atendimento.itens_queixa.map((item, idx) => (
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
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center text-lg font-bold text-blue-600">
                      <span>Subtotal da Queixa:</span>
                      <span>R$ {atendimento.subtotal_queixa?.toFixed(2) || '0.00'}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {atendimento.assinatura_cliente_queixa && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-green-500" />
                    Assinatura do Cliente
                  </CardTitle>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-amber-600 border-amber-300">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reabrir Queixa
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Reabrir Queixa Assinada?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá invalidar a assinatura atual e permitir nova edição.
                            O cliente precisará assinar novamente após as alterações.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={reabrirQueixa} className="bg-amber-500 hover:bg-amber-600">
                            Confirmar Reabertura
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardHeader>
                <CardContent>
                  <img src={atendimento.assinatura_cliente_queixa} alt="Assinatura" className="border rounded-lg max-w-xs" />
                  {atendimento.data_aprovacao_queixa && (
                    <p className="text-sm text-slate-500 mt-2">
                      Aprovado em: {format(new Date(atendimento.data_aprovacao_queixa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
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
            {checklistAssinado && isAdmin && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 mb-1">Orçamento Assinado</p>
                      <p className="text-sm text-amber-700 mb-3">
                        Este orçamento foi aprovado e assinado. Para editar, é necessário reabrir e invalidar a assinatura.
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reabrir Orçamento
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-amber-500" />
                              Reabrir Orçamento Assinado?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá invalidar a assinatura atual e permitir edição do orçamento.
                              O cliente precisará revisar e assinar novamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={reabrirChecklist} className="bg-amber-500 hover:bg-amber-600">
                              Confirmar Reabertura
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {atendimento.itens_orcamento?.length === 0 ? (
              <Card className="py-8">
                <CardContent className="text-center text-slate-500">
                  Nenhum item no orçamento
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Itens do Orçamento</CardTitle>
                    {isAdmin && !modoEdicaoOrcamento && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={iniciarEdicaoOrcamento}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {modoEdicaoOrcamento ? (
                      <div className="space-y-4">
                        {itensOrcamentoEdit.map((item, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-medium">{item.nome}</p>
                                {item.origem === 'checklist' && (
                                  <p className="text-xs text-blue-600">Do checklist: {item.item_checklist}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerItemOrcamentoEdit(idx)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Quantidade</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min="1"
                                  value={item.quantidade}
                                  onChange={(e) => atualizarItemOrcamentoEdit(idx, 'quantidade', e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={(e) => {
                                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                      atualizarItemOrcamentoEdit(idx, 'quantidade', 1);
                                    }
                                  }}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Valor Unitário</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.valor_unitario}
                                  onChange={(e) => atualizarItemOrcamentoEdit(idx, 'valor_unitario', parseFloat(e.target.value) || 0)}
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <div className="mt-2 text-right">
                              <span className="text-sm font-bold text-green-600">
                                Total: R$ {item.valor_total?.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setModoEdicaoOrcamento(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={salvarEdicaoOrcamento}
                            disabled={updateMutation.isPending}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Salvar Alterações
                          </Button>
                        </div>
                      </div>
                    ) : (
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
                    )}
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

          <TabsContent value="aprovacao" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Aprovação da Queixa</CardTitle>
                {queixaAssinada && isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-amber-600 border-amber-300">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reabrir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          Reabrir Queixa Assinada?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso invalidará a assinatura e permitirá nova edição.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={reabrirQueixa} className="bg-amber-500 hover:bg-amber-600">
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {queixaAssinada && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Queixa aprovada e assinada
                    </p>
                  </div>
                )}
                
                {atendimento.itens_queixa?.length > 0 ? (
                  atendimento.itens_queixa.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <ItemAprovacao
                        item={item}
                        onUpdate={(updated) => handleUpdateItemQueixa(idx, updated)}
                        readOnly={queixaAssinada && !isAdmin}
                      />
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
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-4">Nenhum item na queixa</p>
                )}

                {atendimento.itens_queixa?.length > 0 && !atendimento.assinatura_cliente_queixa && (
                  <Button
                    onClick={() => setShowAssinaturaQueixa(true)}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    Assinar Aprovação da Queixa
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Aprovação do Checklist</CardTitle>
                {checklistAssinado && isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-amber-600 border-amber-300">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reabrir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          Reabrir Checklist Assinado?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso invalidará a assinatura e permitirá nova edição.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={reabrirChecklist} className="bg-amber-500 hover:bg-amber-600">
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {checklistAssinado && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Checklist aprovado e assinado
                    </p>
                  </div>
                )}
                
                {atendimento.itens_orcamento?.length > 0 ? (
                  atendimento.itens_orcamento.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <ItemAprovacao
                        item={item}
                        onUpdate={(updated) => handleUpdateItemChecklist(idx, updated)}
                        readOnly={checklistAssinado && !isAdmin}
                      />
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
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-4">Nenhum item no checklist</p>
                )}

                {atendimento.itens_orcamento?.length > 0 && !atendimento.assinatura_cliente_checklist && (
                  <Button
                    onClick={() => setShowAssinaturaChecklist(true)}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    Assinar Aprovação do Checklist
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showAssinaturaQueixa && (
        <AssinaturaDigital
          title="Assinar Aprovação da Queixa"
          onSave={(dataUrl) => handleSaveAssinatura('queixa', dataUrl)}
          onClose={() => setShowAssinaturaQueixa(false)}
        />
      )}

      {showAssinaturaChecklist && (
        <AssinaturaDigital
          title="Assinar Aprovação do Checklist"
          onSave={(dataUrl) => handleSaveAssinatura('checklist', dataUrl)}
          onClose={() => setShowAssinaturaChecklist(false)}
        />
      )}
    </div>
  );
}