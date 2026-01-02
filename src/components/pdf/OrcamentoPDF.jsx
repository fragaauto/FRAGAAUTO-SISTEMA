import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function OrcamentoPDF({ atendimento }) {
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  const defeitosEncontrados = atendimento.checklist?.filter(item => item.status === 'com_defeito') || [];

  return (
    <div id="orcamento-pdf" className="bg-white p-8 max-w-[800px] mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-orange-500 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">FRAGA AUTO PORTAS</h1>
          <p className="text-slate-600 mt-1">Especialista em Manutenção de Portas e Acessórios Automotivos</p>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p>📍 Endereço da oficina</p>
          <p>📞 (XX) XXXXX-XXXX</p>
          <p>📧 contato@fragaauto.com.br</p>
        </div>
      </div>

      {/* Title */}
      <div className="bg-slate-800 text-white text-center py-3 rounded-lg mb-6">
        <h2 className="text-xl font-bold">PRÉ-ORÇAMENTO</h2>
      </div>

      {/* Date and Number */}
      <div className="flex justify-between text-sm mb-6">
        <span><strong>Data:</strong> {hoje}</span>
        <span><strong>Nº:</strong> {atendimento.id?.slice(-8).toUpperCase()}</span>
      </div>

      {/* Client Info */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">DADOS DO CLIENTE</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><strong>Nome:</strong> {atendimento.cliente_nome || '-'}</p>
          <p><strong>Telefone:</strong> {atendimento.cliente_telefone || '-'}</p>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">DADOS DO VEÍCULO</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><strong>Placa:</strong> {atendimento.placa}</p>
          <p><strong>Modelo:</strong> {atendimento.modelo}</p>
          <p><strong>Marca:</strong> {atendimento.marca || '-'}</p>
          <p><strong>Ano:</strong> {atendimento.ano || '-'}</p>
          <p><strong>KM Atual:</strong> {atendimento.km_atual || '-'}</p>
          <p><strong>Data Entrada:</strong> {atendimento.data_entrada ? format(new Date(atendimento.data_entrada), 'dd/MM/yyyy') : '-'}</p>
        </div>
      </div>

      {/* Defects Found */}
      {defeitosEncontrados.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-slate-800 mb-3 border-b-2 border-orange-500 pb-2">ITENS COM DEFEITO IDENTIFICADOS</h3>
          <div className="space-y-2">
            {defeitosEncontrados.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm bg-red-50 p-2 rounded">
                <span className="text-red-500 font-bold">✗</span>
                <div>
                  <span className="font-medium">{item.item}</span>
                  {item.comentario && <span className="text-slate-600 ml-2">- {item.comentario}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-diagnosis */}
      {atendimento.pre_diagnostico && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <h3 className="font-bold text-slate-800 mb-2">PRÉ-DIAGNÓSTICO</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{atendimento.pre_diagnostico}</p>
        </div>
      )}

      {/* Budget Items */}
      {atendimento.itens_orcamento?.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-slate-800 mb-3 border-b-2 border-orange-500 pb-2">SERVIÇOS E PRODUTOS</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-2 border">Item</th>
                <th className="text-center p-2 border w-16">Qtd</th>
                <th className="text-right p-2 border w-28">Valor Unit.</th>
                <th className="text-right p-2 border w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {atendimento.itens_orcamento.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="p-2 border">{item.nome}</td>
                  <td className="p-2 border text-center">{item.quantidade}</td>
                  <td className="p-2 border text-right">R$ {item.valor_unitario?.toFixed(2)}</td>
                  <td className="p-2 border text-right font-medium">R$ {item.valor_total?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="bg-slate-800 text-white rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center text-sm mb-2">
          <span>Subtotal:</span>
          <span>R$ {atendimento.subtotal?.toFixed(2) || '0.00'}</span>
        </div>
        {atendimento.desconto > 0 && (
          <div className="flex justify-between items-center text-sm mb-2 text-green-300">
            <span>Desconto:</span>
            <span>- R$ {atendimento.desconto?.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-xl font-bold border-t border-slate-600 pt-2 mt-2">
          <span>VALOR TOTAL:</span>
          <span className="text-orange-400">R$ {atendimento.valor_final?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      {/* Observations */}
      {atendimento.observacoes && (
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-slate-800 mb-2">OBSERVAÇÕES</h3>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{atendimento.observacoes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 pt-4 mt-8">
        <p className="text-center text-sm text-slate-600 mb-4">
          Este é um pré-orçamento e os valores podem sofrer alterações após diagnóstico completo.
        </p>
        
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-sm font-medium">Técnico Responsável</p>
              <p className="text-xs text-slate-500">{atendimento.tecnico || 'Fraga Auto Portas'}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2">
              <p className="text-sm font-medium">Cliente</p>
              <p className="text-xs text-slate-500">{atendimento.cliente_nome || ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Validity */}
      <div className="text-center text-xs text-slate-500 mt-6">
        <p>Orçamento válido por 7 dias • Fraga Auto Portas © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}