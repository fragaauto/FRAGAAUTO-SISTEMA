import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Check, FileText, Loader2, Package, Upload, X } from 'lucide-react';
import ItemNotaPDF from './ItemNotaPDF';
import {
  encontrarProdutoPorItem,
  encontrarFornecedorPorNome,
  mesclarFornecedorProduto,
} from '@/lib/produtoSearch';

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const SCHEMA = {
  type: 'object',
  properties: {
    fornecedor: { type: 'string' },
    numero_nota: { type: 'string' },
    data_nota: { type: 'string' },
    itens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          codigo: { type: 'string' },
          descricao: { type: 'string' },
          quantidade: { type: 'number' },
          valor_unitario: { type: 'number' },
          valor_total: { type: 'number' },
        },
        required: ['descricao'],
      },
    },
  },
  required: ['itens'],
};

export default function ImportarPDFTab() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nota, setNota] = useState(null);
  const [itens, setItens] = useState([]);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [concluido, setConcluido] = useState(false);

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-estoque'],
    queryFn: () => base44.entities.Produto.list(),
    staleTime: 60 * 1000,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => base44.entities.Fornecedor.list(),
    staleTime: 5 * 60 * 1000,
  });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Selecione o PDF da nota de compra');
      return;
    }
    setLendo(true);
    setConcluido(false);
    setNota(null);
    setItens([]);
    setNomeArquivo(file.name);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 900 });
      const dados = await base44.integrations.Core.InvokeLLM({
        prompt:
          'Este PDF é uma nota/pedido de compra de peças de uma loja de autopeças (pode ser um documento não fiscal, orçamento ou romaneio de fornecedor). ' +
          'Leia o documento e extraia TODOS os itens de produto comprados, com o código do produto exatamente como aparece no documento, ' +
          'a descrição completa, a quantidade, o valor unitário e o valor total de cada linha. ' +
          'Extraia também o nome do fornecedor, o número do documento e a data. ' +
          'Ignore linhas de frete, impostos, descontos, totais e observações — apenas produtos. ' +
          'Quando algum valor numérico não existir no documento, use 0.',
        file_urls: [signed_url],
        response_json_schema: SCHEMA,
      });

      const lista = Array.isArray(dados?.itens) ? dados.itens : [];
      if (lista.length === 0) {
        toast.error('Não encontrei produtos nesta nota. Tente outro arquivo.');
        setLendo(false);
        return;
      }

      setNota({
        fornecedor: dados.fornecedor || 'Fornecedor não identificado',
        numero_nota: dados.numero_nota || '',
        data_nota: dados.data_nota || '',
      });

      const nomeFornecedor = dados.fornecedor || '';
      setItens(
        lista.map((item, i) => {
          const match = encontrarProdutoPorItem(produtos, { ...item, fornecedor: nomeFornecedor });
          return {
            key: `item-${i}`,
            codigo: item.codigo || '',
            descricao: item.descricao || item.nome || 'Produto sem descrição',
            quantidade: item.quantidade || 1,
            custo_unitario: item.valor_unitario || (item.valor_total ? num(item.valor_total) / (item.quantidade || 1) : 0),
            produto_id: match?.id || null,
            preco_venda: match ? match.valor ?? '' : '',
            ignorar: false,
          };
        })
      );
      toast.success(`Nota lida: ${lista.length} item(ns) encontrados.`);
    } catch (err) {
      toast.error('Não foi possível ler o PDF: ' + err.message);
      setNota(null);
      setItens([]);
    }
    setLendo(false);
  };

  const atualizarItem = (idx, campo, valor) => {
    setItens((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [campo]: valor };
      return arr;
    });
  };

  const vincular = (idx, produto) => {
    setItens((prev) => {
      const arr = [...prev];
      arr[idx] = {
        ...arr[idx],
        produto_id: produto.id,
        preco_venda: produto.valor ?? '',
        ignorar: false,
      };
      return arr;
    });
  };

  const desvincular = (idx) => {
    setItens((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], produto_id: null, preco_venda: '' };
      return arr;
    });
  };

  const selecionados = itens.filter((i) => !i.ignorar && i.produto_id && num(i.quantidade) > 0);
  const comCustoAlterado = selecionados.filter((i) => {
    const prod = produtos.find((p) => p.id === i.produto_id);
    return prod && num(prod.custo) > 0 && Math.abs(num(i.custo_unitario) - num(prod.custo)) >= 0.01;
  });
  const totalEntrada = selecionados.reduce((s, i) => s + num(i.quantidade) * num(i.custo_unitario), 0);

  const darEntrada = async () => {
    if (selecionados.length === 0) {
      toast.error('Relacione ao menos um item a um produto cadastrado');
      return;
    }
    setSalvando(true);
    try {
      const fornecedorCadastro = encontrarFornecedorPorNome(fornecedores, nota?.fornecedor);
      const fornecedorNome = fornecedorCadastro?.nome || nota?.fornecedor || '';

      for (const item of selecionados) {
        const prod = produtos.find((p) => p.id === item.produto_id);
        const qtd = num(item.quantidade);
        const custo = num(item.custo_unitario);
        const precoVenda = item.preco_venda === '' ? num(prod?.valor) : num(item.preco_venda);

        const atualizacao = {
          estoque_atual: (Number(prod.estoque_atual) || 0) + qtd,
          custo,
          valor: precoVenda,
        };

        // Grava o fornecedor da nota e o código usado por ele no cadastro do produto
        if (fornecedorNome) {
          atualizacao.fornecedores = mesclarFornecedorProduto(prod.fornecedores, {
            fornecedor_id: fornecedorCadastro?.id,
            fornecedor_nome: fornecedorNome,
            codigo_fornecedor: item.codigo,
            preco_compra: custo,
          });
        }

        await base44.entities.Produto.update(prod.id, atualizacao);

        await base44.entities.MovimentoEstoque.create({
          produto_id: prod.id,
          produto_nome: prod.nome,
          tipo: 'entrada',
          quantidade: qtd,
          custo_unitario: custo,
          data_movimento: new Date().toISOString(),
          observacoes: `Entrada por nota de compra${nota?.numero_nota ? ` ${nota.numero_nota}` : ''}${nota?.fornecedor ? ` - ${nota.fornecedor}` : ''}`,
        });
      }

      await base44.entities.Compra.create({
        fornecedor: nota?.fornecedor || 'Fornecedor não identificado',
        numero_nf: nota?.numero_nota || '',
        data_compra: nota?.data_nota && !isNaN(new Date(nota.data_nota)) ? new Date(nota.data_nota).toISOString() : new Date().toISOString(),
        itens: selecionados.map((i) => {
          const prod = produtos.find((p) => p.id === i.produto_id);
          return {
            produto_id: prod.id,
            produto_nome: prod.nome,
            quantidade: num(i.quantidade),
            valor_unitario: num(i.custo_unitario),
            valor_total: num(i.quantidade) * num(i.custo_unitario),
          };
        }),
        valor_total: parseFloat(totalEntrada.toFixed(2)),
        status: 'confirmada',
        observacoes: 'Entrada gerada a partir de PDF de nota de compra',
      });

      toast.success(`Entrada registrada em ${selecionados.length} produto(s).`);
      setConcluido(true);
      setItens([]);
      setNota(null);
      setNomeArquivo('');
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['produtos-estoque'] });
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['fornecedores'] });
      qc.invalidateQueries({ queryKey: ['compras'] });
      qc.invalidateQueries({ queryKey: ['movimentos-estoque'] });
    } catch (err) {
      toast.error('Erro ao dar entrada: ' + err.message);
    }
    setSalvando(false);
  };

  const limpar = () => {
    setNota(null);
    setItens([]);
    setConcluido(false);
    setNomeArquivo('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Upload do PDF */}
      <Card className="border-2 border-dashed border-blue-200 bg-blue-50/40">
        <CardContent className="p-6 text-center">
          {lendo ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-2 animate-spin" />
              <p className="font-semibold text-slate-700">Lendo a nota...</p>
              <p className="text-sm text-slate-500">Identificando descrições, códigos, quantidades e custos</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-blue-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 mb-1">Importar nota de compra (PDF)</p>
              <p className="text-sm text-slate-500 mb-4">
                Envie o PDF da nota do fornecedor. O sistema lê os produtos, relaciona com o cadastro e dá entrada no estoque.
              </p>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={handleFile} className="hidden" id="pdf-compra-upload" />
              <div className="flex gap-2 justify-center flex-wrap">
                <Button onClick={() => fileRef.current?.click()} className="bg-blue-600 hover:bg-blue-700">
                  <FileText className="w-4 h-4 mr-2" /> Selecionar PDF
                </Button>
                {(nota || nomeArquivo) && (
                  <Button variant="outline" onClick={limpar}>
                    <X className="w-4 h-4 mr-1" /> Limpar
                  </Button>
                )}
              </div>
              {nomeArquivo && <p className="text-xs text-slate-400 mt-3">{nomeArquivo}</p>}
            </>
          )}
        </CardContent>
      </Card>

      {concluido && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-2 text-green-700 text-sm font-medium">
            <Check className="w-4 h-4" /> Entrada no estoque concluída. Envie outra nota quando precisar.
          </CardContent>
        </Card>
      )}

      {nota && (
        <>
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div><span className="text-slate-500">Fornecedor:</span> <strong>{nota.fornecedor}</strong></div>
              {nota.numero_nota && <div><span className="text-slate-500">Nota:</span> <strong>{nota.numero_nota}</strong></div>}
              {nota.data_nota && <div><span className="text-slate-500">Data:</span> <strong>{nota.data_nota}</strong></div>}
              <div><span className="text-slate-500">Itens lidos:</span> <strong>{itens.length}</strong></div>
            </CardContent>
          </Card>

          {comCustoAlterado.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                <strong>{comCustoAlterado.length} produto(s)</strong> com preço de custo diferente do cadastro.
                Ao dar entrada, o novo custo será gravado no cadastro e o preço de venda será o que estiver no campo Venda.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {itens.map((item, idx) => (
              <ItemNotaPDF
                key={item.key}
                item={item}
                produtos={produtos}
                fornecedor={nota.fornecedor}
                onChange={(campo, valor) => atualizarItem(idx, campo, valor)}
                onVincular={(produto) => vincular(idx, produto)}
                onDesvincular={() => desvincular(idx)}
                onIgnorar={() => atualizarItem(idx, 'ignorar', !item.ignorar)}
              />
            ))}
          </div>

          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 text-sm text-slate-600">
                <p><strong>{selecionados.length}</strong> de {itens.length} item(ns) serão lançados</p>
                <p className="text-slate-400 text-xs">Só itens relacionados a um produto cadastrado dão entrada no estoque</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <Label className="text-[10px] uppercase text-slate-400">Total da entrada</Label>
                  <p className="font-bold text-lg text-slate-800">R$ {totalEntrada.toFixed(2)}</p>
                </div>
                <Button onClick={darEntrada} disabled={salvando || selecionados.length === 0} className="bg-green-600 hover:bg-green-700">
                  {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
                  Dar entrada no estoque
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}