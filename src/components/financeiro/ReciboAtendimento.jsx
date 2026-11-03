import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useUnidade } from '@/lib/UnidadeContext';
import { toast } from 'sonner';
import {
  fmtMoeda,
  montarDadosComprovante,
  gerarTextoComprovanteWhatsApp,
  gerarHtmlComprovante,
} from '@/lib/comprovanteServico';

function Divisor() {
  return <div className="border-t border-slate-300 my-3" />;
}

function SecaoTitulo({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">
      {children}
    </p>
  );
}

function Linha({ label, valor, negrito }) {
  return (
    <div className="flex justify-between gap-3 text-[13px] text-black">
      <span className="text-slate-700">{label}</span>
      <span className={negrito ? 'font-bold' : 'font-medium'}>{valor}</span>
    </div>
  );
}

export default function ReciboAtendimento({ atendimento, config }) {
  const { unidadeAtual } = useUnidade();
  const [enviando, setEnviando] = useState(false);

  const idsProdutos = useMemo(() => {
    const itens = [
      ...(atendimento.itens_queixa || []).filter(i => i.status_aprovacao === 'aprovado'),
      ...(atendimento.itens_orcamento || []).filter(i => i.status_aprovacao === 'aprovado'),
    ];
    return [...new Set(itens.map(i => i.produto_id).filter(Boolean))];
  }, [atendimento.itens_queixa, atendimento.itens_orcamento]);

  const { data: descricoesProdutos = {} } = useQuery({
    queryKey: ['descricoes-produtos-comprovante', idsProdutos.join(',')],
    queryFn: async () => {
      const { items } = await base44.entities.Produto.filter(
        { id: { $in: idsProdutos } },
        { fields: ['nome', 'descricao'] }
      );
      return items.reduce((acc, p) => {
        if (p.descricao) acc[p.id] = p.descricao;
        return acc;
      }, {});
    },
    enabled: idsProdutos.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const dados = useMemo(
    () => montarDadosComprovante(atendimento, config, descricoesProdutos),
    [atendimento, config, descricoesProdutos]
  );

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=860,height=900');
    if (!win) {
      toast.error('Permita pop-ups no navegador para imprimir');
      return;
    }
    win.document.write(gerarHtmlComprovante(dados));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const gerarMensagemPersonalizada = () => {
    const tpl = config?.mensagem_comprovante || '';
    if (!tpl) return '';
    return tpl
      .replace(/\{nome\}/g, atendimento.cliente_nome || '')
      .replace(/\{veiculo\}/g, dados.veiculo)
      .replace(/\{numero\}/g, atendimento.numero_os ? String(atendimento.numero_os) : '')
      .replace(/\{valor\}/g, fmtMoeda(dados.valorFinal))
      .replace(/\{nome_empresa\}/g, dados.nomeEmpresa);
  };

  const handleWhatsApp = async () => {
    const tel = atendimento.cliente_telefone?.replace(/\D/g, '') || '';
    if (!tel) { toast.error('Cliente sem telefone cadastrado'); return; }

    const personalizada = gerarMensagemPersonalizada();
    const comprovante = gerarTextoComprovanteWhatsApp(dados);
    const mensagemFinal = personalizada ? `${personalizada}\n\n${comprovante}` : comprovante;

    const evolutionConfigurado = config?.evolution_api_url && config?.evolution_api_key && config?.evolution_instance;
    if (!evolutionConfigurado) {
      const prefixo = tel.startsWith('55') ? tel : `55${tel}`;
      window.open(`https://wa.me/${prefixo}?text=${encodeURIComponent(mensagemFinal)}`, '_blank');
      return;
    }

    setEnviando(true);
    try {
      const res = await base44.functions.invoke('enviarMensagemWhatsApp', {
        telefone: tel,
        mensagem: mensagemFinal,
        unidade_id: unidadeAtual?.id || null,
      });
      if (res.data?.ok) {
        toast.success('Comprovante enviado por WhatsApp!');
      } else {
        const errMsg = res.data?.error || 'Erro ao enviar mensagem.';
        const semWhatsapp = errMsg.includes('exists":false') || errMsg.toLowerCase().includes('not registered');
        toast.error(semWhatsapp ? 'Este número não possui WhatsApp ativo.' : errMsg);
      }
    } catch (e) {
      toast.error('Erro ao enviar: ' + e.message);
    }
    setEnviando(false);
  };

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Comprovante de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border border-slate-200 rounded-md p-4 sm:p-5 bg-white text-black">
          {/* Empresa */}
          <div className="text-center">
            {dados.logoUrl && (
              <img src={dados.logoUrl} alt="Logo" className="h-14 object-contain mx-auto mb-2" />
            )}
            <p className="font-bold uppercase tracking-wide text-[15px] text-black">{dados.nomeEmpresa}</p>
            {dados.cnpj && <p className="text-[11.5px] text-slate-700">CNPJ: {dados.cnpj}</p>}
            {dados.endereco && <p className="text-[11.5px] text-slate-700">{dados.endereco}</p>}
            {dados.telefone && <p className="text-[11.5px] text-slate-700">Tel: {dados.telefone}</p>}
          </div>

          <Divisor />

          <div className="space-y-0.5">
            {dados.osNum && <Linha label="Nº OS:" valor={dados.osNum} negrito />}
            <Linha label="Data:" valor={dados.data} />
          </div>

          <Divisor />

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <SecaoTitulo>Cliente</SecaoTitulo>
              <Linha label="Nome:" valor={dados.clienteNome} negrito />
              {dados.clienteTelefone && <Linha label="Telefone:" valor={dados.clienteTelefone} />}
              {dados.clienteCpf && <Linha label="CPF/CNPJ:" valor={dados.clienteCpf} />}
            </div>
            <div>
              <SecaoTitulo>Veículo</SecaoTitulo>
              <Linha label="Placa:" valor={dados.placa} negrito />
              <Linha label="Modelo:" valor={dados.veiculo} />
              {dados.km && <Linha label="KM:" valor={dados.km} />}
            </div>
          </div>

          {/* Itens com descrição */}
          {dados.itens.length > 0 && (
            <>
              <Divisor />
              <SecaoTitulo>Serviços realizados</SecaoTitulo>
              <div className="space-y-3">
                {dados.itens.map((item, idx) => (
                  <div key={idx} className="border-b border-dashed border-slate-200 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex justify-between gap-3 items-start">
                      <div className="text-[13px] font-bold text-black">
                        {item.nome}{item.variacao ? ` — ${item.variacao}` : ''}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] font-bold text-black">{fmtMoeda(item.valorTotal)}</div>
                        <div className="text-[10.5px] text-slate-500">
                          {item.quantidade}x {fmtMoeda(item.valorUnitario)}
                        </div>
                      </div>
                    </div>
                    {item.descricao && (
                      <p className="text-[12px] text-slate-700 mt-1 leading-snug">{item.descricao}</p>
                    )}
                    {item.observacao && (
                      <p className="text-[11.5px] text-slate-600 mt-0.5 italic">Obs.: {item.observacao}</p>
                    )}
                    {item.obsCliente && (
                      <p className="text-[11.5px] text-slate-600 mt-0.5">Obs. cliente: {item.obsCliente}</p>
                    )}
                    {item.tecnicos && (
                      <p className="text-[11px] text-slate-500 mt-0.5">Técnico: {item.tecnicos}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <Divisor />

          {/* Totais */}
          {dados.desconto > 0 && (
            <>
              <Linha label="Subtotal" valor={fmtMoeda(dados.brutoItens)} />
              <div className="flex justify-between text-[13px] text-green-700">
                <span>Desconto</span>
                <span>- {fmtMoeda(dados.desconto)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center border-t-2 border-black mt-2 pt-2">
            <span className="text-[13px] font-bold uppercase tracking-wide text-black">Total</span>
            <span className="text-lg font-bold text-black">{fmtMoeda(dados.valorFinal)}</span>
          </div>

          {dados.formas.length > 0 && (
            <div className="mt-2">
              <SecaoTitulo>Forma de pagamento</SecaoTitulo>
              {dados.formas.map((f, idx) => (
                <div key={idx} className="flex justify-between text-[12.5px] text-black">
                  <span>{f.label}</span>
                  <span>{fmtMoeda(f.valor)}</span>
                </div>
              ))}
            </div>
          )}
          {dados.formas.length === 0 && dados.formaUnica && (
            <div className="mt-2">
              <SecaoTitulo>Forma de pagamento</SecaoTitulo>
              <div className="flex justify-between text-[12.5px] text-black">
                <span>{dados.formaUnica}</span>
                <span>{fmtMoeda(dados.valorFinal)}</span>
              </div>
            </div>
          )}

          {dados.tecnicos.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-200">
              <SecaoTitulo>Técnico(s) responsável(is)</SecaoTitulo>
              <p className="text-[12.5px] text-black">{dados.tecnicos.join(', ')}</p>
            </div>
          )}

          {(dados.obsCliente || dados.obsInterna) && (
            <div className="mt-3 pt-2 border-t border-slate-200 space-y-1.5">
              {dados.obsCliente && (
                <div>
                  <SecaoTitulo>Observações / Garantia</SecaoTitulo>
                  <p className="text-[12.5px] text-black">{dados.obsCliente}</p>
                </div>
              )}
              {dados.obsInterna && (
                <div>
                  <SecaoTitulo>Observação técnica</SecaoTitulo>
                  <p className="text-[12.5px] text-black">{dados.obsInterna}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="flex-1 border-slate-300">
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir
          </Button>
          <Button
            size="sm"
            onClick={handleWhatsApp}
            disabled={enviando}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {enviando ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5 mr-1.5" />}
            {enviando ? 'Enviando...' : 'WhatsApp'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}