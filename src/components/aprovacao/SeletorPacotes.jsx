import React from 'react';
import { CheckCircle2, ShieldAlert, Sparkles, Wrench, ArrowRight } from 'lucide-react';

// Três pacotes de orçamento exibidos ao cliente.
// nivel 0 = itens da queixa | 1 = urgência (recomendado) | 2 = serviço completo
const PACOTES = [
  {
    id: 'queixa',
    nivel: 0,
    titulo: 'O que você pediu pra fazer',
    descricao: 'Aqui estão os itens que precisam ser executados para resolver a sua queixa inicial.',
    icone: Wrench,
    card: 'border-slate-300 bg-white',
    faixa: 'bg-slate-700',
    botao: 'bg-slate-700 hover:bg-slate-800',
  },
  {
    id: 'urgencia',
    nivel: 1,
    titulo: 'Itens de urgência (recomendado)',
    descricao:
      'Neste orçamento está o que você pediu pra fazer e também os itens de urgência que recomendamos fazer agora: negligenciar esses itens pode causar outros danos e gerar outros prejuízos.',
    icone: ShieldAlert,
    card: 'border-amber-400 bg-amber-50/60',
    faixa: 'bg-amber-500',
    botao: 'bg-amber-500 hover:bg-amber-600',
  },
  {
    id: 'completo',
    nivel: 2,
    titulo: 'Serviço completo',
    descricao:
      'Aqui estão os itens que você pediu, os urgentes e os que nós recomendamos para melhorar a sua experiência ao volante.',
    icone: Sparkles,
    card: 'border-emerald-400 bg-emerald-50/60',
    faixa: 'bg-emerald-600',
    botao: 'bg-emerald-600 hover:bg-emerald-700',
  },
];

const moeda = (v) => `R$ ${(Number(v) || 0).toFixed(2)}`;

export default function SeletorPacotes({ itens = [], selecionado, onSelecionar, desabilitado = false }) {
  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-slate-800">Escolha o que deseja autorizar</h2>
        <p className="text-sm text-slate-600">
          Selecione um dos três quadros abaixo: todos os itens do quadro escolhido serão aprovados automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {PACOTES.map((pacote) => {
          const doPacote = itens.filter((i) => i.nivel <= pacote.nivel);
          const total = doPacote.reduce((acc, i) => acc + (Number(i.item?.valor_total) || 0), 0);
          const ativo = selecionado === pacote.id;
          const Icone = pacote.icone;

          return (
            <div
              key={pacote.id}
              className={`rounded-xl border-2 overflow-hidden flex flex-col transition-all ${pacote.card} ${
                ativo ? 'ring-4 ring-emerald-400/60 shadow-lg' : 'shadow-sm'
              }`}
            >
              <div className={`${pacote.faixa} px-3 py-2 flex items-center gap-2 text-white`}>
                <Icone className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm font-bold leading-tight flex-1">{pacote.titulo}</p>
                {ativo && <CheckCircle2 className="w-5 h-5" />}
              </div>

              <div className="p-3 flex flex-col flex-1 gap-3">
                <p className="text-xs text-slate-600 leading-relaxed">{pacote.descricao}</p>

                <div className="rounded-lg border border-slate-200 bg-white/80 divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {doPacote.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400">Nenhum item neste quadro</p>
                  ) : (
                    doPacote.map(({ key, item, nivel }) => (
                      <div key={key} className="p-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-800 flex-1">{item.nome}</span>
                          <span className="font-bold text-slate-700 whitespace-nowrap">
                            {moeda(item.valor_total)}
                          </span>
                        </div>
                        <div className="text-slate-500">
                          {Number(item.quantidade) || 1}x {moeda(item.valor_unitario)}
                          {nivel === 0 && <span className="ml-1 text-slate-400">· queixa</span>}
                          {nivel === 1 && <span className="ml-1 text-amber-600">· urgência</span>}
                          {nivel === 2 && <span className="ml-1 text-emerald-600">· recomendado</span>}
                        </div>
                        {(item.observacao_item || item.comentario_tecnico) && (
                          <p className="mt-1 text-[11px] text-slate-500 italic">
                            {item.observacao_item || item.comentario_tecnico}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-auto space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Total</span>
                    <span className="text-lg font-extrabold text-slate-900">{moeda(total)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={desabilitado || doPacote.length === 0}
                    onClick={() => onSelecionar(pacote)}
                    className={`w-full rounded-lg px-3 py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 ${
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