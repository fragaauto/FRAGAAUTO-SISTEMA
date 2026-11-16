import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Megaphone, Tag } from 'lucide-react';
import SeletorProdutosPromocao from './SeletorProdutosPromocao';
import UploadsPromocao from './UploadsPromocao';
import FiltrosClientes from './FiltrosClientes';
import ConfigValeDesconto from './ConfigValeDesconto';
import { fotoProdutoCadastro } from '@/lib/promocao';
import { calcularPrecoLista } from '@/lib/listaPrecos';

const numeroOuNulo = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export default function FormularioPromocao({
  promocao,
  produtos,
  carregandoProdutos,
  listas = [],
  grupos = [],
  whatsappPadrao,
  unidadeId,
  onClose,
  onSaved,
}) {
  const editando = !!promocao;
  const [titulo, setTitulo] = useState(promocao?.titulo || '');
  const [texto, setTexto] = useState(promocao?.texto || '');
  const [bannerUrl, setBannerUrl] = useState(promocao?.banner_url || '');
  const [artes, setArtes] = useState(promocao?.artes || []);
  const [modo, setModo] = useState(promocao?.modo_selecao || 'especificos');
  const [categorias, setCategorias] = useState(promocao?.categorias || []);
  const [selecionados, setSelecionados] = useState((promocao?.produtos || []).map((p) => p.produto_id));
  const [precos, setPrecos] = useState(
    Object.fromEntries((promocao?.produtos || []).map((p) => [p.produto_id, p.valor_promocional]))
  );
  const [listaPrecoId, setListaPrecoId] = useState(promocao?.lista_preco_id || 'tabela');
  const [gruposIds, setGruposIds] = useState(promocao?.grupos_ids || []);
  const [todosClientes, setTodosClientes] = useState(promocao?.todos_clientes || false);
  const [filtros, setFiltros] = useState(promocao?.filtros_clientes || {});
  const [vale, setVale] = useState({
    vale_ativo: promocao?.vale_ativo || false,
    vale_tipo: promocao?.vale_tipo || 'percentual',
    vale_valor: promocao?.vale_valor ?? 0,
    vale_validade_dias: promocao?.vale_validade_dias ?? 30,
  });
  const [whatsapp, setWhatsapp] = useState(promocao?.whatsapp_retorno || whatsappPadrao || '');
  const [dataFim, setDataFim] = useState(promocao?.data_fim || '');
  const [ativa, setAtiva] = useState(promocao?.ativa !== false);
  const [popupAtivo, setPopupAtivo] = useState(promocao?.popup_ativo !== false);
  const [salvando, setSalvando] = useState(false);
  const primeiraRenderizacao = useRef(true);

  const ativos = useMemo(() => produtos.filter((p) => p.ativo !== false), [produtos]);

  const listaSelecionada = useMemo(
    () => listas.find((l) => l.id === listaPrecoId) || null,
    [listas, listaPrecoId]
  );

  const precoReferencia = (p) => {
    const daLista = listaSelecionada ? calcularPrecoLista(p, listaSelecionada) : null;
    return Number(daLista ?? p.valor ?? 0) || 0;
  };

  const candidatos = useMemo(() => {
    if (modo === 'todos') return ativos;
    if (modo === 'categorias') {
      if (!categorias.length) return [];
      return ativos.filter((p) => categorias.includes(p.categoria));
    }
    return ativos;
  }, [ativos, modo, categorias]);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    if (modo === 'especificos') return;
    setSelecionados(candidatos.map((p) => p.id));
  }, [modo, categorias, produtos.length]);

  const valorPromocional = (p) => Number(precos[p.id] ?? precoReferencia(p));

  const toggleProduto = (id) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const alternarTodos = () => {
    setSelecionados((prev) =>
      candidatos.every((p) => prev.includes(p.id)) ? [] : candidatos.map((p) => p.id)
    );
  };

  const trocarLista = (id) => {
    setListaPrecoId(id);
    // Recalcula os valores promocionais a partir da nova referência
    setPrecos({});
  };

  const salvar = async () => {
    if (!titulo.trim()) return toast.error('Informe o título da promoção');
    const selecionadosSet = new Set(selecionados);
    const escolhidos = ativos.filter((p) => selecionadosSet.has(p.id));
    if (escolhidos.length === 0) return toast.error('Selecione ao menos um produto');

    const dados = {
      unidade_id: promocao?.unidade_id || unidadeId || null,
      titulo: titulo.trim(),
      texto: texto.trim(),
      banner_url: bannerUrl,
      artes,
      produtos: escolhidos.map((p) => ({
        produto_id: p.id,
        codigo: p.codigo || '',
        nome: p.nome || '',
        categoria: p.categoria || '',
        descricao: p.descricao || '',
        foto_url: fotoProdutoCadastro(p),
        valor_original: precoReferencia(p),
        valor_promocional: valorPromocional(p),
      })),
      lista_preco_id: listaSelecionada?.id || '',
      lista_preco_nome: listaSelecionada?.nome || '',
      modo_selecao: modo,
      categorias,
      grupos_ids: gruposIds,
      todos_clientes: todosClientes,
      filtros_clientes: {
        codigo_de: numeroOuNulo(filtros.codigo_de),
        codigo_ate: numeroOuNulo(filtros.codigo_ate),
        nome_iniciais: filtros.nome_iniciais || '',
      },
      vale_ativo: !!vale.vale_ativo,
      vale_tipo: vale.vale_tipo,
      vale_valor: Number(vale.vale_valor) || 0,
      vale_validade_dias: Number(vale.vale_validade_dias) || 30,
      whatsapp_retorno: whatsapp,
      data_fim: dataFim || null,
      ativa,
      popup_ativo: popupAtivo,
    };

    setSalvando(true);
    try {
      if (editando) {
        await base44.entities.Promocao.update(promocao.id, dados);
        toast.success('Promoção atualizada');
      } else {
        await base44.entities.Promocao.create(dados);
        toast.success('Promoção criada');
      }
      onSaved();
    } catch (e) {
      toast.error('Não foi possível salvar: ' + e.message);
    }
    setSalvando(false);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            {editando ? 'Editar promoção' : 'Nova campanha promocional'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Título da promoção *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Semana das Portas Automáticas" />
            </div>
            <div className="sm:col-span-2">
              <Label>Texto da promoção</Label>
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreva a mensagem que o cliente vai receber. Use {nome} para o nome do cliente."
                className="min-h-[90px]"
              />
            </div>
            <div>
              <Label>Válida até</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div>
              <Label>WhatsApp para receber interesses</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ex: 54999998888" />
            </div>
          </div>

          <div>
            <Label className="mb-1 block flex items-center gap-1">
              <Tag className="w-4 h-4 text-slate-500" /> Preço de referência da promoção
            </Label>
            <Select value={listaPrecoId} onValueChange={trocarLista}>
              <SelectTrigger className="sm:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tabela">Preço de tabela (cadastro)</SelectItem>
                {listas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              {listaSelecionada
                ? `Os valores riscados na página usam a lista "${listaSelecionada.nome}".`
                : 'Usa o valor de venda do cadastro do produto. Escolha uma lista (ex: sem instalação) para usar outro preço.'}
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Produtos e serviços em promoção</Label>
            <SeletorProdutosPromocao
              produtos={ativos}
              modo={modo}
              onModoChange={setModo}
              categorias={categorias}
              onCategoriasChange={setCategorias}
              candidatos={candidatos}
              selecionados={selecionados}
              onToggle={toggleProduto}
              onTodos={alternarTodos}
              precos={precos}
              onPrecoChange={(id, valor) => setPrecos((prev) => ({ ...prev, [id]: valor }))}
              precoReferencia={precoReferencia}
              carregando={carregandoProdutos}
            />
          </div>

          <UploadsPromocao
            bannerUrl={bannerUrl}
            onBannerChange={setBannerUrl}
            artes={artes}
            onArtesChange={setArtes}
          />

          <div>
            <Label className="mb-2 block">Lista de clientes para disparo</Label>
            <FiltrosClientes
              grupos={grupos}
              gruposIds={gruposIds}
              onGruposChange={setGruposIds}
              todos={todosClientes}
              onTodosChange={setTodosClientes}
              filtros={filtros}
              onFiltrosChange={setFiltros}
            />
          </div>

          <ConfigValeDesconto valor={vale} onChange={setVale} />

          <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox checked={ativa} onCheckedChange={(v) => setAtiva(!!v)} />
              Promoção ativa (link público funcionando)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox checked={popupAtivo} onCheckedChange={(v) => setPopupAtivo(!!v)} />
              Mostrar pop-up de ofertas para os usuários do sistema
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando} className="bg-orange-500 hover:bg-orange-600">
            {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar promoção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}