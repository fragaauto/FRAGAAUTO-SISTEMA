import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText, Check, AlertTriangle, Loader2, Plus, RefreshCw, Package, DollarSign, X, Link, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Parse XML de NF-e no browser
function parseNFe(xmlStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');

  const get = (el, tag) => el?.getElementsByTagName(tag)?.[0]?.textContent?.trim() || '';

  const infNFe = doc.getElementsByTagName('infNFe')[0];
  const emit = infNFe?.getElementsByTagName('emit')[0];
  const ide = infNFe?.getElementsByTagName('ide')[0];

  const fornecedor = get(emit, 'xNome') || get(emit, 'xFant') || 'Fornecedor NF-e';
  const nNF = get(ide, 'nNF') || '';
  const dhEmi = get(ide, 'dhEmi') || get(ide, 'dEmi') || '';

  const detNodes = infNFe?.getElementsByTagName('det') || [];
  const itens = [];

  for (const det of detNodes) {
    const prod = det.getElementsByTagName('prod')[0];
    if (!prod) continue;
    const cProd = get(prod, 'cProd');
    const xProd = get(prod, 'xProd');
    const qCom = parseFloat(get(prod, 'qCom')) || 0;
    const vUnCom = parseFloat(get(prod, 'vUnCom')) || 0;
    const vProd = parseFloat(get(prod, 'vProd')) || qCom * vUnCom;
    itens.push({ codigo: cProd, nome: xProd, quantidade: qCom, custo_unitario: vUnCom, valor_total: vProd });
  }

  const vNF = parseFloat(doc.getElementsByTagName('vNF')[0]?.textContent) || itens.reduce((s, i) => s + i.valor_total, 0);

  return { fornecedor, numero_nf: nNF, data_emissao: dhEmi, itens, valor_total: vNF };
}

function VincularProdutoModal({ itemNFe, produtos, onVincular, onClose }) {
  const [busca, setBusca] = useState('');
  const filtrados = busca.length > 1
    ? produtos.filter(p =>
        p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(busca.toLowerCase())
      ).slice(0, 10)
    : produtos.slice(0, 10);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-4 h-4 text-blue-500" />
            Vincular produto ao cadastro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="text-slate-500 text-xs mb-0.5">Produto na NF-e:</p>
            <p className="font-semibold">{itemNFe.nome}</p>
            <p className="text-slate-400 text-xs">Cód: {itemNFe.codigo} · Custo: R$ {itemNFe.custo_unitario.toFixed(2)}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto cadastrado..."
              className="w-full pl-9 h-9 border border-slate-200 rounded-md text-sm px-3 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtrados.map(p => (
              <button key={p.id} onClick={() => onVincular(p)}
                className="w-full text-left px-3 py-2.5 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-all text-sm flex justify-between items-center">
                <div>
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-xs text-slate-400">Cód: {p.codigo} · Estoque: {p.estoque_atual || 0} · Custo atual: R$ {(p.custo || 0).toFixed(2)}</p>
                </div>
                <Link className="w-4 h-4 text-blue-400 flex-shrink-0 ml-2" />
              </button>
            ))}
            {filtrados.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Nenhum produto encontrado</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ImportarXMLTab() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [nfeData, setNfeData] = useState(null); // dados parseados do XML
  const [itensConfig, setItensConfig] = useState([]); // configuração de cada item: vincular produto, margem, etc.
  const [processando, setProcessando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [vinculandoIdx, setVinculandoIdx] = useState(null); // índice do item sendo vinculado

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-estoque'],
    queryFn: () => base44.entities.Produto.list(),
    staleTime: 60 * 1000,
  });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.xml')) return toast.error('Selecione um arquivo XML de NF-e');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseNFe(ev.target.result);
        if (!parsed.itens.length) return toast.error('Nenhum produto encontrado no XML');
        setNfeData(parsed);
        // Para cada item, tentar vincular automaticamente pelo código
        const config = parsed.itens.map(item => {
          const match = produtos.find(p =>
            p.codigo?.toLowerCase() === item.codigo?.toLowerCase() ||
            p.nome?.toLowerCase() === item.nome?.toLowerCase()
          );
          return {
            ...item,
            produto_id: match?.id || null,
            produto_match: match || null,
            acao: match ? 'atualizar' : 'criar', // atualizar | criar | ignorar
            margem_percentual: 40, // margem padrão
            preco_venda: match
              ? parseFloat((item.custo_unitario * 1.4).toFixed(2))
              : parseFloat((item.custo_unitario * 1.4).toFixed(2)),
            categoria: match?.categoria || 'outros',
            criar_nome: item.nome,
            criar_codigo: item.codigo,
          };
        });
        setItensConfig(config);
        setConcluido(false);
        toast.success(`XML lido! ${parsed.itens.length} produtos encontrados.`);
      } catch (err) {
        toast.error('Erro ao ler XML. Verifique se é um XML de NF-e válido.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const vincularProduto = (idx, produtoCadastrado) => {
    setItensConfig(prev => {
      const arr = [...prev];
      arr[idx] = {
        ...arr[idx],
        produto_id: produtoCadastrado.id,
        produto_match: produtoCadastrado,
        acao: 'atualizar',
        preco_venda: parseFloat((arr[idx].custo_unitario * (1 + arr[idx].margem_percentual / 100)).toFixed(2)),
      };
      return arr;
    });
    setVinculandoIdx(null);
    toast.success(`Vinculado a "${produtoCadastrado.nome}"!`);
  };

  const desvincularProduto = (idx) => {
    setItensConfig(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], produto_id: null, produto_match: null, acao: 'criar' };
      return arr;
    });
  };

  const updateConfig = (idx, field, val) => {
    setItensConfig(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: val };
      // recalcular preço venda ao mudar margem ou custo
      if (field === 'margem_percentual') {
        const custo = arr[idx].custo_unitario;
        arr[idx].preco_venda = parseFloat((custo * (1 + parseFloat(val || 0) / 100)).toFixed(2));
      }
      return arr;
    });
  };

  const processar = async () => {
    setProcessando(true);
    let criados = 0, atualizados = 0;
    try {
      for (const item of itensConfig) {
        if (item.acao === 'ignorar') continue;

        if (item.acao === 'criar') {
          const novoProd = await base44.entities.Produto.create({
            codigo: item.criar_codigo,
            nome: item.criar_nome,
            categoria: item.categoria,
            valor: item.preco_venda,
            custo: item.custo_unitario,
            controla_estoque: true,
            estoque_atual: item.quantidade,
            estoque_minimo: 0,
            ativo: true,
          });
          // Movimento de entrada
          await base44.entities.MovimentoEstoque.create({
            produto_id: novoProd.id,
            produto_nome: item.criar_nome,
            tipo: 'entrada',
            quantidade: item.quantidade,
            custo_unitario: item.custo_unitario,
            data_movimento: new Date().toISOString(),
            observacoes: `Entrada via NF-e ${nfeData.numero_nf}`,
          });
          criados++;
        } else if (item.acao === 'atualizar' && item.produto_id) {
          const prod = produtos.find(p => p.id === item.produto_id);
          const estoqueAtual = prod?.estoque_atual || 0;
          const novoEstoque = estoqueAtual + item.quantidade;
          const custoMedio = prod?.custo
            ? ((prod.custo * estoqueAtual) + (item.custo_unitario * item.quantidade)) / novoEstoque
            : item.custo_unitario;

          // Atualiza fornecedores: adiciona/atualiza entrada do fornecedor da NF
          const fornecedoresAtuais = prod?.fornecedores || [];
          const fornecedorExistenteIdx = fornecedoresAtuais.findIndex(
            f => f.fornecedor_nome?.toLowerCase() === nfeData.fornecedor?.toLowerCase()
          );
          const novoFornecedor = {
            fornecedor_nome: nfeData.fornecedor,
            codigo_fornecedor: item.codigo,
            preco_compra: item.custo_unitario,
            principal: fornecedorExistenteIdx === -1 && fornecedoresAtuais.length === 0,
          };
          let fornecedoresAtualizados;
          if (fornecedorExistenteIdx >= 0) {
            fornecedoresAtualizados = fornecedoresAtuais.map((f, i) =>
              i === fornecedorExistenteIdx ? { ...f, ...novoFornecedor } : f
            );
          } else {
            fornecedoresAtualizados = [...fornecedoresAtuais, novoFornecedor];
          }

          await base44.entities.Produto.update(item.produto_id, {
            custo: parseFloat(custoMedio.toFixed(4)),
            valor: item.preco_venda,
            estoque_atual: novoEstoque,
            fornecedores: fornecedoresAtualizados,
          });
          await base44.entities.MovimentoEstoque.create({
            produto_id: item.produto_id,
            produto_nome: prod?.nome || item.nome,
            tipo: 'entrada',
            quantidade: item.quantidade,
            custo_unitario: item.custo_unitario,
            data_movimento: new Date().toISOString(),
            observacoes: `Entrada via NF-e ${nfeData.numero_nf}`,
          });
          atualizados++;
        }
      }

      // Criar registro de compra
      const itensCompra = itensConfig
        .filter(i => i.acao !== 'ignorar')
        .map(i => ({
          produto_id: i.produto_id || null,
          produto_nome: i.acao === 'criar' ? i.criar_nome : (produtos.find(p => p.id === i.produto_id)?.nome || i.nome),
          quantidade: i.quantidade,
          valor_unitario: i.custo_unitario,
          valor_total: i.custo_unitario * i.quantidade,
        }));

      const compra = await base44.entities.Compra.create({
        fornecedor: nfeData.fornecedor,
        numero_nf: nfeData.numero_nf,
        data_compra: nfeData.data_emissao ? new Date(nfeData.data_emissao).toISOString() : new Date().toISOString(),
        itens: itensCompra,
        valor_total: nfeData.valor_total,
        status: 'confirmada',
        xml_nfe: 'importado',
      });

      // Conta a pagar
      await base44.entities.ContaPagar.create({
        fornecedor: nfeData.fornecedor,
        descricao: `NF-e ${nfeData.numero_nf} - ${nfeData.fornecedor}`,
        valor: nfeData.valor_total,
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pendente',
        compra_id: compra.id,
        categoria: 'fornecedor_pecas',
      });

      toast.success(`✅ Processado! ${criados} criados, ${atualizados} atualizados. Conta a pagar gerada.`);
      setConcluido(true);
      qc.invalidateQueries(['produtos-estoque']);
      qc.invalidateQueries(['compras']);
    } catch (err) {
      toast.error('Erro ao processar: ' + err.message);
    }
    setProcessando(false);
  };

  const limpar = () => {
    setNfeData(null);
    setItensConfig([]);
    setConcluido(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Upload */}
      <Card className="border-2 border-dashed border-blue-200 bg-blue-50/40">
        <CardContent className="p-6 text-center">
          <Upload className="w-10 h-10 text-blue-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-700 mb-1">Importar XML de NF-e</p>
          <p className="text-sm text-slate-500 mb-4">Selecione o arquivo XML da Nota Fiscal de entrada para sincronizar produtos e atualizar estoque</p>
          <input ref={fileRef} type="file" accept=".xml" onChange={handleFile} className="hidden" id="xml-upload" />
          <div className="flex gap-2 justify-center">
            <Button onClick={() => fileRef.current?.click()} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" /> Selecionar XML
            </Button>
            {nfeData && (
              <Button variant="outline" onClick={limpar}>
                <X className="w-4 h-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados da NF-e */}
      {nfeData && (
        <>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div><span className="text-slate-500">Fornecedor:</span> <strong>{nfeData.fornecedor}</strong></div>
                {nfeData.numero_nf && <div><span className="text-slate-500">NF:</span> <strong>{nfeData.numero_nf}</strong></div>}
                {nfeData.data_emissao && <div><span className="text-slate-500">Emissão:</span> <strong>{new Date(nfeData.data_emissao).toLocaleDateString('pt-BR')}</strong></div>}
                <div><span className="text-slate-500">Total NF:</span> <strong className="text-green-700">R$ {nfeData.valor_total.toFixed(2)}</strong></div>
                <div><span className="text-slate-500">Produtos:</span> <strong>{nfeData.itens.length}</strong></div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de configuração */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-700">Configure cada produto:</p>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1"><Badge className="bg-green-100 text-green-700">Atualizar</Badge> produto existente</span>
                <span className="flex items-center gap-1"><Badge className="bg-blue-100 text-blue-700">Criar</Badge> novo produto</span>
                <span className="flex items-center gap-1"><Badge className="bg-slate-100 text-slate-600">Ignorar</Badge> pular item</span>
              </div>
            </div>

            {itensConfig.map((item, idx) => (
              <Card key={idx} className={`border ${item.acao === 'ignorar' ? 'opacity-50' : item.acao === 'criar' ? 'border-blue-200' : 'border-green-200'}`}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Info do XML */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-sm truncate">{item.nome}</span>
                        <span className="text-xs text-slate-400">{item.codigo}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>Qtd: <strong>{item.quantidade}</strong></span>
                        <span>Custo unit: <strong>R$ {item.custo_unitario.toFixed(2)}</strong></span>
                        <span>Total: <strong>R$ {item.valor_total.toFixed(2)}</strong></span>
                      </div>
                      {item.produto_match ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-green-600">✓ Vinculado: <strong>{item.produto_match.nome}</strong> (estoque: {item.produto_match.estoque_atual || 0})</p>
                          <button onClick={() => desvincularProduto(idx)} className="text-xs text-red-400 hover:text-red-600 underline">desvincular</button>
                        </div>
                      ) : (
                        <button onClick={() => setVinculandoIdx(idx)}
                          className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 border border-dashed border-blue-300 rounded px-2 py-0.5 w-fit hover:bg-blue-50 transition-all">
                          <Link className="w-3 h-3" /> Vincular a produto cadastrado
                        </button>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-1">
                      {['atualizar', 'criar', 'ignorar'].map(a => (
                        <button key={a} onClick={() => updateConfig(idx, 'acao', a)}
                          disabled={a === 'atualizar' && !item.produto_id}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${item.acao === a
                            ? a === 'atualizar' ? 'bg-green-500 text-white border-green-500'
                              : a === 'criar' ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-slate-500 text-white border-slate-500'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                          {a.charAt(0).toUpperCase() + a.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {item.acao !== 'ignorar' && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
                      {item.acao === 'criar' && (
                        <>
                          <div>
                            <Label className="text-xs">Nome do produto</Label>
                            <Input value={item.criar_nome} onChange={e => updateConfig(idx, 'criar_nome', e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Código</Label>
                            <Input value={item.criar_codigo} onChange={e => updateConfig(idx, 'criar_codigo', e.target.value)} className="h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs">Categoria</Label>
                            <select value={item.categoria} onChange={e => updateConfig(idx, 'categoria', e.target.value)}
                              className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white">
                              {['eletrica', 'portas', 'acessorios', 'estetica', 'seguranca', 'vidros', 'limpeza', 'outros'].map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                      <div>
                        <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> Margem (%)</Label>
                        <Input type="number" min={0} value={item.margem_percentual}
                          onChange={e => updateConfig(idx, 'margem_percentual', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Preço de Venda (R$)</Label>
                        <Input type="number" min={0} step="0.01" value={item.preco_venda}
                          onChange={e => updateConfig(idx, 'preco_venda', parseFloat(e.target.value) || 0)} className="h-8 text-sm font-semibold text-green-700" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Resumo e botão processar */}
          {!concluido ? (
            <Card className="bg-slate-800 text-white">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-4 text-sm">
                    <span>🟢 Atualizar: <strong>{itensConfig.filter(i => i.acao === 'atualizar').length}</strong></span>
                    <span>🔵 Criar: <strong>{itensConfig.filter(i => i.acao === 'criar').length}</strong></span>
                    <span>⚫ Ignorar: <strong>{itensConfig.filter(i => i.acao === 'ignorar').length}</strong></span>
                  </div>
                  <Button onClick={processar} disabled={processando || itensConfig.every(i => i.acao === 'ignorar')} className="bg-green-600 hover:bg-green-700">
                    {processando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Processar NF-e
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-green-50 border-2 border-green-300">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <Check className="w-6 h-6" />
                  <p className="font-semibold">NF-e processada com sucesso! Estoque e precificação atualizados.</p>
                </div>
                <Button variant="outline" onClick={limpar}>Nova Importação</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}