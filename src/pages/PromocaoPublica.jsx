import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, MessageCircle, Megaphone, Circle, Ticket } from 'lucide-react';
import {
  brl,
  normalizarTelefone,
  promocaoEncerrada,
  descreverVale,
  gerarCodigoVale,
  dataValidadeVale,
  dataBr,
} from '@/lib/promocao';

function CardProdutoPublico({ produto, marcado, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left bg-white rounded-2xl border-2 overflow-hidden transition-all ${
        marcado ? 'border-orange-500 shadow-lg' : 'border-slate-200 hover:border-orange-300'
      }`}
    >
      <div className="relative">
        {produto.foto_url ? (
          <img src={produto.foto_url} alt={produto.nome} className="w-full h-40 object-contain bg-white p-2" />
        ) : (
          <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
            <Megaphone className="w-10 h-10 text-slate-300" />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
          {marcado ? (
            <CheckCircle2 className="w-5 h-5 text-orange-500" />
          ) : (
            <Circle className="w-5 h-5 text-slate-300" />
          )}
        </div>
      </div>
      <div className="p-3">
        <p className="font-semibold text-slate-800 text-sm leading-snug">{produto.nome}</p>
        {produto.descricao && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{produto.descricao}</p>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          {Number(produto.valor_original) > 0 && (
            <span className="text-xs text-slate-400 line-through">{brl(produto.valor_original)}</span>
          )}
          <span className="text-lg font-bold text-orange-600">{brl(produto.valor_promocional)}</span>
        </div>
        <p className={`text-xs mt-1 font-medium ${marcado ? 'text-orange-600' : 'text-slate-400'}`}>
          {marcado ? '✓ Tenho interesse' : 'Toque para marcar interesse'}
        </p>
      </div>
    </button>
  );
}

export default function PromocaoPublica() {
  React.useEffect(() => {
    window.__IS_PUBLIC_ROUTE__ = true;
    return () => { window.__IS_PUBLIC_ROUTE__ = false; };
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  const [selecionados, setSelecionados] = useState([]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [valeEmitido, setValeEmitido] = useState(null);

  const { data: promocao, isLoading } = useQuery({
    queryKey: ['promocao-publica', id],
    queryFn: () => base44.entities.Promocao.get(id),
    enabled: !!id,
  });

  const encerrada = promocaoEncerrada(promocao);

  useEffect(() => {
    if (!isLoading && (!promocao || encerrada)) {
      const meta = document.createElement('meta');
      meta.name = 'prerender-status-code';
      meta.content = '404';
      document.head.appendChild(meta);
      return () => meta.remove();
    }
  }, [isLoading, promocao, encerrada]);

  const produtos = promocao?.produtos || [];
  const artes = promocao?.artes || [];

  const blocos = useMemo(() => {
    const lista = [];
    for (let i = 0; i < produtos.length; i += 4) lista.push(produtos.slice(i, i + 4));
    return lista;
  }, [produtos]);

  const selecionadosLista = produtos.filter((p) => selecionados.includes(p.produto_id));
  const total = selecionadosLista.reduce((acc, p) => acc + (Number(p.valor_promocional) || 0), 0);

  const toggle = (produto) => {
    setSelecionados((prev) =>
      prev.includes(produto.produto_id)
        ? prev.filter((i) => i !== produto.produto_id)
        : [...prev, produto.produto_id]
    );
  };

  const montarTextoWhats = () => {
    const itens = selecionadosLista
      .map((p) => `• ${p.nome} - ${brl(p.valor_promocional)}`)
      .join('\n');
    const linhaVale = valeEmitido
      ? `\nVale desconto: ${valeEmitido.codigo} (${descreverVale(promocao)}${valeEmitido.motivo ? ` - ${valeEmitido.motivo}` : ''}, válido até ${dataBr(valeEmitido.validade)})`
      : '';
    return `Olá! Vi a promoção "${promocao.titulo}" e tenho interesse em:\n${itens}\n\nMeu nome: ${nome}${telefone ? `\nTelefone: ${telefone}` : ''}${observacao ? `\nObs: ${observacao}` : ''}${linhaVale}`;
  };

  const numeroRetorno = normalizarTelefone(promocao?.whatsapp_retorno);
  const linkWhats = numeroRetorno
    ? `https://wa.me/${numeroRetorno}?text=${encodeURIComponent(montarTextoWhats())}`
    : '';

  const enviar = async () => {
    if (!nome.trim()) return toast.error('Informe seu nome');
    if (selecionadosLista.length === 0) return toast.error('Marque ao menos um produto de interesse');

    setEnviando(true);
    try {
      const interesse = await base44.entities.PromocaoInteresse.create({
        promocao_id: promocao.id,
        promocao_titulo: promocao.titulo,
        cliente_nome: nome.trim(),
        cliente_telefone: telefone,
        observacao,
        status: 'novo',
        produtos: selecionadosLista.map((p) => ({
          produto_id: p.produto_id,
          nome: p.nome,
          valor_promocional: p.valor_promocional,
        })),
      });

      if (promocao.vale_ativo && Number(promocao.vale_valor) > 0) {
        try {
          const vale = await base44.entities.PromocaoVale.create({
            promocao_id: promocao.id,
            promocao_titulo: promocao.titulo,
            interesse_id: interesse?.id || '',
            codigo: gerarCodigoVale(promocao),
            cliente_nome: nome.trim(),
            cliente_telefone: telefone,
            tipo: promocao.vale_tipo || 'percentual',
            valor: Number(promocao.vale_valor) || 0,
            motivo: promocao.vale_motivo || '',
            validade: dataValidadeVale(promocao.vale_validade_dias),
            status: 'disponivel',
          });
          setValeEmitido(vale);
        } catch (erroVale) {
          console.error('Falha ao gerar vale', erroVale);
        }
      }
      setConcluido(true);
    } catch (e) {
      toast.error('Não foi possível enviar seu interesse: ' + e.message);
    }
    setEnviando(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!promocao || encerrada) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <Megaphone className="w-14 h-14 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-slate-700">Promoção indisponível</h1>
        <p className="text-slate-500 mt-1">Esta campanha foi encerrada ou o link está incorreto.</p>
      </div>
    );
  }

  if (concluido) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800">Interesse registrado!</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Recebemos o seu interesse em {selecionadosLista.length} produto(s).{' '}
            {linkWhats ? 'Envie também a mensagem no WhatsApp para agilizar o atendimento.' : 'Nossa equipe entrará em contato.'}
          </p>

          {valeEmitido && (
            <div className="mt-4 border-2 border-dashed border-amber-400 bg-amber-50 rounded-xl p-4">
              <Ticket className="w-7 h-7 text-amber-600 mx-auto mb-1" />
              <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Seu vale desconto</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-slate-800 my-1">
                {valeEmitido.codigo}
              </p>
              <p className="text-sm text-slate-700">
                {descreverVale(promocao)} • válido até {dataBr(valeEmitido.validade)}
              </p>
              {valeEmitido.motivo && (
                <p className="text-xs font-semibold text-amber-800 mt-1">{valeEmitido.motivo}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Apresente este código no atendimento.</p>
            </div>
          )}
          {linkWhats && (
            <Button asChild className="w-full mt-5 bg-green-600 hover:bg-green-700">
              <a href={linkWhats} target="_blank" rel="noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" /> Enviar no WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Banner */}
      <div className="relative w-full">
        {promocao.banner_url ? (
          <img src={promocao.banner_url} alt={promocao.titulo} className="w-full aspect-[8/3] object-cover" />
        ) : (
          <div className="w-full aspect-[8/3] bg-gradient-to-r from-orange-500 to-orange-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <p className="text-orange-200 text-xs font-semibold tracking-widest uppercase mb-1">Ofertas especiais</p>
          <h1 className="text-white text-2xl sm:text-4xl font-bold leading-tight">{promocao.titulo}</h1>
          {promocao.texto && (
            <p className="text-white/90 text-sm sm:text-base mt-2 max-w-2xl whitespace-pre-wrap line-clamp-3">
              {promocao.texto}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {promocao.texto && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{promocao.texto}</p>
            {promocao.data_fim && (
              <p className="text-orange-600 font-semibold text-sm mt-3">
                Promoção válida até {promocao.data_fim.split('-').reverse().join('/')}
              </p>
            )}
          </div>
        )}

        {promocao.vale_ativo && Number(promocao.vale_valor) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <Ticket className="w-7 h-7 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-800">
                Ganhe {descreverVale(promocao)} reservando pela página
              </p>
              <p className="text-xs text-slate-600">
                Ao enviar seu interesse você recebe na hora um código de vale para usar no atendimento.
              </p>
              {promocao.vale_motivo && (
                <p className="text-xs font-semibold text-amber-800 mt-1">{promocao.vale_motivo}</p>
              )}
            </div>
          </div>
        )}

        {artes[0] && (
          <img src={artes[0].url} alt={artes[0].descricao || 'Arte promocional'} className="w-full rounded-2xl shadow-sm" />
        )}

        {produtos.length === 0 ? (
          <p className="text-center text-slate-500">Nenhum produto nesta promoção.</p>
        ) : (
          blocos.map((bloco, idx) => (
            <React.Fragment key={idx}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bloco.map((produto) => (
                  <CardProdutoPublico
                    key={produto.produto_id}
                    produto={produto}
                    marcado={selecionados.includes(produto.produto_id)}
                    onToggle={() => toggle(produto)}
                  />
                ))}
              </div>
              {idx + 1 < blocos.length && artes[idx + 1] && (
                <img
                  src={artes[idx + 1].url}
                  alt={artes[idx + 1].descricao || 'Arte promocional'}
                  className="w-full rounded-2xl shadow-sm"
                />
              )}
            </React.Fragment>
          ))
        )}

        {artes.slice(blocos.length).map((arte, idx) => (
          <img key={idx} src={arte.url} alt={arte.descricao || 'Arte'} className="w-full rounded-2xl shadow-sm" />
        ))}

        {/* Formulário de interesse */}
        <div id="form-interesse" className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-800">Quero estes produtos</h2>
          <p className="text-sm text-slate-500">
            {selecionadosLista.length === 0
              ? 'Marque os produtos de seu interesse acima.'
              : `${selecionadosLista.length} produto(s) marcados • Total ${brl(total)}`}
          </p>
          <div>
            <Label>Seu nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <Label>Telefone / WhatsApp</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Alguma informação extra?"
              className="min-h-[70px]"
            />
          </div>
          <Button
            onClick={enviar}
            disabled={enviando}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
            Clique aqui e reserve sua oferta já!
          </Button>
          {promocao.vale_ativo && Number(promocao.vale_valor) > 0 && (
            <p className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Ticket className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Reservando sua oferta por esta página você ganha um cupom de desconto de{' '}
                {descreverVale(promocao)}. O código é gerado na hora e aparece para você após o envio.
              </span>
            </p>
          )}
        </div>
      </div>

      {selecionadosLista.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">{selecionadosLista.length} produto(s) marcados</p>
              <p className="font-bold text-orange-600">{brl(total)}</p>
            </div>
            <Button
              onClick={() => document.getElementById('form-interesse')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Continuar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}