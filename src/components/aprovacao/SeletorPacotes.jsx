import React from 'react';
import { CheckCircle2, ShieldAlert, Sparkles, Wrench, ArrowRight, Star } from 'lucide-react';

// Três quadros de orçamento exibidos ao cliente.
// nivel 0 = itens da queixa | 1 = urgência (recomendado) | 2 = serviço completo
const PACOTES = [
  {
    id: 'queixa',
    nivel: 0,
    titulo: 'O que Você Pediu Pra Fazer',
    descricao: 'Aqui são os itens que precisam ser executados para resolver sua queixa inicial.',
    icone: Wrench,
    card: 'border-slate-300 bg-white',
    faixa: 'bg-slate-700',
    botao: 'bg-slate-700 hover:bg-slate-800',
  },
  {
    id: 'urgencia',
    nivel: 1,
    titulo: 'Itens de Urgência (Recomendado)',
    descricao:
      'Nesse orçamento tem os itens que você pediu pra fazer e outros de caráter de urgência que recomendamos fazer agora, pois negligenciar esses itens podem causar outros danos e gerar outros prejuízos.',
    icone: ShieldAlert,
    card: 'border-amber-400 bg-amber-50/70',
    faixa: 'bg-amber-500',
    botao: 'bg-amber-500 hover:bg-amber-600',
    destaque: true,
  },
  {
    id: 'completo',
    nivel: 2,
    titulo: 'Serviço Completo',
    descricao:
      'Aqui são os itens que você pediu, os urgentes e os que nós recomendamos para melhorar sua experiência ao volante.',
    icone: Sparkles,
    card: 'border-emerald-400 bg-emerald-50/60',
    faixa: 'bg-emerald-600',
    botao: 'bg-emerald-600 hover:bg-emerald-700',
  },
];

const moeda = (v) => `R$ ${(Number(v) || 0).toFixed(2)}`;

const dataBr = (valor) =>
  valor ? new Date(`${String(valor).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '';

/** Total do item já com o desconto lançado (promoção ou desconto manual) */
const totalItem = (item) => {
  const qtd = Number(item?.quantidade) || 1;
  const unit = Number(item?.valor_unitario) || 0;
  const desc = Number(item?.desconto_item) || 0;
  if (desc > 0) return Math.max(0, qtd * unit - desc);
  const salvo = Number(item?.valor_total);
  return Number.isFinite(salvo) && salvo > 0 ? salvo : qtd * unit;
};

export default function SeletorPacotes({ itens = [], selecionado, onSelecionar, desabilitado = false }) {
  const totalCompleto = itens.reduce((acc, i) => acc + totalItem(i.item), 0);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-extrabold text-slate-900">Escolha o seu orçamento</h2>
        <p className="text-sm text-slate-600">
          Toque em um dos 3 quadros: todos os itens dele serão autorizados automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-3 items-stretch">
        {PACOTES.map((pacote) => {
          const doPacote = itens.filter((i) => i.nivel <= pacote.nivel);
          const total = doPacote.reduce((acc, i) => acc + totalItem(i.item), 0);
          const economia = totalCompleto - total;
          const ativo = selecionado === pacote.id;
          const Icone = pacote.icone;

          return (
            <div
              key={pacote.id}
              className={`relative rounded-2xl border-2 overflow-hidden flex flex-col transition-all ${pacote.card} ${
                ativo
                  ? 'ring-4 ring-emerald-500/50 shadow-xl md:-translate-y-1'
                  : pacote.destaque
                    ? 'shadow-lg md:-translate-y-2'
                    : 'shadow-sm'
              }`}
            >
              {pacote.destaque && (
                <div className="bg-amber-500 text-white text-[11px] font-extrabold uppercase tracking-wide py-1 text-center flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  Mais escolhido pelos clientes
                </div>
              )}

              <div className={`${pacote.faixa} px-3 py-2 flex items-center gap-2 text-white`}>
                <Icone className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-extrabold leading-tight flex-1">{pacote.titulo}</p>
                {ativo && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
              </div>

              <div className="p-3 flex flex-col flex-1 gap-3">
                <p className="text-xs text-slate-700 leading-relaxed">{pacote.descricao}</p>

                <div className="rounded-lg border border-slate-200 bg-white/90 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {doPacote.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400">Nenhum item neste quadro</p>
                  ) : (
                    doPacote.map(({ key, item, nivel }) => {
                      const qtd = Number(item.quantidade) || 1;
                      const unit = Number(item.valor_unitario) || 0;
                      const desc = Number(item.desconto_item) || 0;
                      const emPromocao = !!item.aplicar_promocao && desc > 0;
                      const unitFinal = qtd > 0 ? Math.max(0, unit - desc / qtd) : unit;
                      const unitOriginal =
                        Number(item.valor_promocao_original) > 0 ? Number(item.valor_promocao_original) : unit;

                      return (
                        <div key={key} className="p-2 text-xs flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-800 flex-1 leading-snug">{item.nome}</span>
                              <span className="font-bold text-slate-700 whitespace-nowrap">
                                {moeda(totalItem(item))}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {qtd}x{' '}
                              {emPromocao ? (
                                <>
                                  <span className="line-through">{moeda(unitOriginal)}</span>{' '}
                                  <span className="font-bold text-red-600">{moeda(unitFinal)}</span>
                                </>
                              ) : (
                                moeda(unit)
                              )}
                              {nivel === 0 && <span className="ml-1 text-slate-400">· o que você pediu</span>}
                              {nivel === 1 && <span className="ml-1 text-amber-600">· urgência</span>}
                              {nivel === 2 && <span className="ml-1 text-emerald-600">· recomendado</span>}
                            </div>
                            {emPromocao && (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <span className="inline-block rounded border-2 border-[#15333E] bg-[#EBC75C] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#0f0e0e]">
                                  🔥 Produto em promoção
                                </span>
                                {item.promocao_validade && (
                                  <span className="text-[10px] text-slate-500">
                                    até {dataBr(item.promocao_validade)}
                                  </span>
                                )}
                              </div>
                            )}
                            {(item.observacao_item || item.comentario_tecnico) && (
                              <p className="mt-1 text-[11px] text-slate-500 italic">
                                {item.observacao_item || item.comentario_tecnico}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {doPacote.length} {doPacote.length === 1 ? 'item' : 'itens'}
                    </span>
                    {economia > 0 && (
                      <span className="font-semibold text-emerald-700">
                        Economiza {moeda(economia)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between border-t border-slate-200 pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
                    <span className="text-xl font-extrabold text-slate-900">{moeda(total)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={desabilitado || doPacote.length === 0}
                    onClick={() => onSelecionar(pacote)}
                    className={`w-full rounded-lg px-3 py-3 text-sm font-extrabold text-white uppercase tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                      ativo ? 'bg-emerald-600 hover:bg-emerald-700' : pacote.botao
                    }`}
                  >
                    {ativo ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Quadro autorizado
                      </>
                    ) : (
                      <>
                        Autorizar este quadro
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}