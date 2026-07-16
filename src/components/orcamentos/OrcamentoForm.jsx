import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Search, UserPlus, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";
import { filtrarProdutos } from '@/lib/produtoSearch';

export default function OrcamentoForm({ orcamento, unidadeAtual, config, onClose, onSaved }) {
  const isEdit = !!orcamento;

  const [form, setForm] = useState({
    cliente_nome: orcamento?.cliente_nome || '',
    cliente_telefone: orcamento?.cliente_telefone || '',
    cliente_cpf: orcamento?.cliente_cpf || '',
    veiculo_placa: orcamento?.veiculo_placa || '',
    veiculo_modelo: orcamento?.veiculo_modelo || '',
    veiculo_ano: orcamento?.veiculo_ano || '',
    veiculo_km: orcamento?.veiculo_km || '',
    observacoes: orcamento?.observacoes || '',
    validade_dias: orcamento?.validade_dias ?? 7,
    desconto: orcamento?.desconto || 0,
  });

  const [itens, setItens] = useState(orcamento?.itens || []);
  const [busca, setBusca] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_list'],
    queryFn: () => base44.entities.Cliente.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos_list'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
    staleTime: 5 * 60 * 1000,
  });

  // Busca de clientes
  const clientesFiltrados = buscaCliente.length >= 2
    ? clientes.filter(c => {
        const s = buscaCliente.toLowerCase();
        return c.nome?.toLowerCase().includes(s) ||
          c.telefone?.toLowerCase().includes(s) ||
          c.cpf_cnpj?.toLowerCase().includes(s);
      }).slice(0, 8)
    : [];

  const selecionarCliente = (c) => {
    setClienteSelecionado(c);
    setForm(p => ({
      ...p,
      cliente_nome: c.nome || '',
      cliente_telefone: c.telefone || '',
      cliente_cpf: c.cpf_cnpj || '',
    }));
    setBuscaCliente('');
    setMostrarCadastro(false);
  };

  const limparCliente = () => {
    setClienteSelecionado(null);
    setBuscaCliente('');
    setForm(p => ({ ...p, cliente_nome: '', cliente_telefone: '', cliente_cpf: '' }));
  };

  // Busca de produtos
  const produtosFiltrados = busca.trim().length >= 2
    ? filtrarProdutos(produtos, busca).slice(0, 8)
    : [];

  const adicionarProduto = (p) => {
    if (itens.some(i => i._produto_id === p.id)) { toast.error('Produto já adicionado'); return; }
    setItens(prev => [...prev, {
      _produto_id: p.id,
      nome: p.nome,
      quantidade: 1,
      valor_unitario: Number(p.valor) || 0,
      valor_total: Number(p.valor) || 0,
      observacao: '',
    }]);
    setBusca('');
  };

  const adicionarItemLivre = () => {
    setItens(prev => [...prev, { nome: '', quantidade: 1, valor_unitario: 0, valor_total: 0, observacao: '' }]);
  };

  const atualizarItem = (idx, field, val) => {
    setItens(prev => {
      const novo = [...prev];
      if (field === 'quantidade') val = Math.max(1, parseInt(val) || 1);
      if (field === 'valor_unitario') val = parseFloat(val) || 0;
      novo[idx] = { ...novo[idx], [field]: val };
      if (field === 'quantidade' || field === 'valor_unitario') {
        novo[idx].valor_total = (novo[idx].quantidade || 1) * (novo[idx].valor_unitario || 0);
      }
      return novo;
    });
  };

  const removerItem = (idx) => setItens(prev => prev.filter((_, i) => i !== idx));

  const subtotal = itens.reduce((s, i) => s + (i.valor_total || 0), 0);
  const desconto = parseFloat(form.desconto) || 0;
  const total = Math.max(0, subtotal - desconto);

  const cadastrarNovoCliente = async () => {
    if (!form.cliente_nome.trim()) return toast.error('Informe o nome do cliente');
    try {
      const novoCliente = await base44.entities.Cliente.create({
        nome: form.cliente_nome,
        telefone: form.cliente_telefone,
        cpf_cnpj: form.cliente_cpf,
      });
      setClienteSelecionado(novoCliente);
      setMostrarCadastro(false);
      toast.success('Cliente cadastrado!');
    } catch {
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const handleSave = async () => {
    if (!form.cliente_nome.trim()) return toast.error('Informe o nome do cliente');
    if (itens.length === 0) return toast.error('Adicione pelo menos um item');
    for (const i of itens) {
      if (!i.nome?.trim()) return toast.error('Informe o nome de todos os itens');
    }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      const payload = {
        ...form,
        desconto,
        subtotal,
        total,
        itens: itens.map(({ _produto_id, ...rest }) => rest),
        unidade_id: unidadeAtual?.id || null,
        usuario_nome: user?.full_name || '',
        status: orcamento?.status || 'pendente',
      };

      if (isEdit) {
        await base44.entities.OrcamentoAvulso.update(orcamento.id, payload);
        toast.success('Orçamento atualizado!');
      } else {
        const todos = await base44.entities.OrcamentoAvulso.list('-numero', 1);
        payload.numero = (todos[0]?.numero || 0) + 1;
        await base44.entities.OrcamentoAvulso.create(payload);
        toast.success('Orçamento criado!');
      }
      onSaved();
    } catch (e) {
      toast.error('Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca de cliente */}
          <div>
            <Label>Cliente *</Label>
            {clienteSelecionado ? (
              <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg mt-1">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{clienteSelecionado.nome}</p>
                  {clienteSelecionado.telefone && <p className="text-xs text-slate-500">{clienteSelecionado.telefone}</p>}
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400" onClick={limparCliente}>Trocar</Button>
              </div>
            ) : (
              <div className="mt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar cliente por nome, telefone ou CPF..."
                    value={buscaCliente}
                    onChange={e => { setBuscaCliente(e.target.value); setMostrarCadastro(false); }}
                  />
                </div>

                {/* Resultados da busca */}
                {clientesFiltrados.length > 0 && (
                  <div className="mt-1 border rounded-lg bg-white shadow-sm max-h-40 overflow-y-auto z-10">
                    {clientesFiltrados.map(c => (
                      <button key={c.id} onClick={() => selecionarCliente(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex justify-between items-center border-b last:border-0">
                        <span className="font-medium">{c.nome}</span>
                        <span className="text-slate-400 text-xs">{c.telefone}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Não encontrou - opção de cadastrar */}
                {buscaCliente.length >= 2 && clientesFiltrados.length === 0 && (
                  <div className="mt-1 border rounded-lg bg-slate-50 p-3">
                    <p className="text-sm text-slate-500 mb-2">Nenhum cliente encontrado.</p>
                    {!mostrarCadastro ? (
                      <Button size="sm" variant="outline" className="gap-1 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={() => { setMostrarCadastro(true); set('cliente_nome', buscaCliente); }}>
                        <UserPlus className="w-3 h-3" /> Cadastrar "{buscaCliente}"
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Input placeholder="Nome completo" value={form.cliente_nome} onChange={e => set('cliente_nome', e.target.value)} className="h-8 text-sm" />
                        <Input placeholder="Telefone" value={form.cliente_telefone} onChange={e => set('cliente_telefone', e.target.value)} className="h-8 text-sm" />
                        <Input placeholder="CPF / CNPJ (opcional)" value={form.cliente_cpf} onChange={e => set('cliente_cpf', e.target.value)} className="h-8 text-sm" />
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-xs gap-1" onClick={cadastrarNovoCliente}>
                            <UserPlus className="w-3 h-3" /> Cadastrar e Usar
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => setMostrarCadastro(false)}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Usar sem cadastro */}
                {buscaCliente.length >= 1 && !mostrarCadastro && (
                  <Button size="sm" variant="ghost" className="mt-1 text-xs text-slate-400 w-full"
                    onClick={() => { set('cliente_nome', buscaCliente); setClienteSelecionado({ nome: buscaCliente, id: '_manual' }); }}>
                    Usar "{buscaCliente}" sem cadastrar
                  </Button>
                )}
              </div>
            )}

            {/* Campos extras do cliente quando selecionado manualmente (sem id real) */}
            {clienteSelecionado?.id !== '_manual' && clienteSelecionado && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input placeholder="Telefone" value={form.cliente_telefone} onChange={e => set('cliente_telefone', e.target.value)} className="h-8 text-sm" />
                <Input placeholder="CPF / CNPJ" value={form.cliente_cpf} onChange={e => set('cliente_cpf', e.target.value)} className="h-8 text-sm" />
              </div>
            )}
          </div>

          {/* Veículo */}
          <div className="border-t pt-3">
            <p className="text-sm font-semibold text-slate-700 mb-2">Veículo (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Placa</Label>
                <Input value={form.veiculo_placa} onChange={e => set('veiculo_placa', e.target.value.toUpperCase())} placeholder="ABC-1234" />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={form.veiculo_modelo} onChange={e => set('veiculo_modelo', e.target.value)} placeholder="Ex: Gol, Civic..." />
              </div>
              <div>
                <Label>Ano</Label>
                <Input value={form.veiculo_ano} onChange={e => set('veiculo_ano', e.target.value)} placeholder="2020" />
              </div>
              <div>
                <Label>KM</Label>
                <Input value={form.veiculo_km} onChange={e => set('veiculo_km', e.target.value)} placeholder="50.000" />
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="border-t pt-3">
            <p className="text-sm font-semibold text-slate-700 mb-2">Itens do Orçamento *</p>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9 text-sm"
                placeholder="Buscar produto cadastrado..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            {produtosFiltrados.length > 0 && (
              <div className="mb-3 border rounded-lg bg-white shadow-sm max-h-40 overflow-y-auto">
                {produtosFiltrados.map(p => (
                  <button key={p.id} onClick={() => adicionarProduto(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex justify-between border-b last:border-0">
                    <span>{p.codigo && <span className="text-slate-400 mr-1">{p.codigo} -</span>}{p.nome}</span>
                    <span className="text-green-700 font-semibold whitespace-nowrap ml-2">R$ {Number(p.valor).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}

            <Button size="sm" variant="outline" onClick={adicionarItemLivre} className="w-full text-xs border-dashed mb-3">
              <Plus className="w-3 h-3 mr-1" /> Adicionar item livre
            </Button>

            {itens.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 mb-2">
                <div className="flex gap-2">
                  <Input
                    className="text-sm h-8 flex-1"
                    placeholder="Nome do serviço / produto"
                    value={item.nome}
                    onChange={e => atualizarItem(idx, 'nome', e.target.value)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => removerItem(idx)} className="h-8 w-8 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Qtd</Label>
                    <Input type="number" min="1" value={item.quantidade} onChange={e => atualizarItem(idx, 'quantidade', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Valor Unit. (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={item.valor_unitario} onChange={e => atualizarItem(idx, 'valor_unitario', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Total</Label>
                    <p className="h-8 flex items-center text-sm font-bold text-green-700">R$ {(item.valor_total || 0).toFixed(2)}</p>
                  </div>
                </div>
                <Input className="text-xs h-7" placeholder="Observação do item..." value={item.observacao || ''} onChange={e => atualizarItem(idx, 'observacao', e.target.value)} />
              </div>
            ))}
          </div>

          {/* Totais e condições */}
          <div className="border-t pt-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Desconto (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.desconto} onChange={e => set('desconto', e.target.value)} className="h-9" />
            </div>
            <div>
              <Label>Validade (dias)</Label>
              <Input type="number" min="1" value={form.validade_dias} onChange={e => set('validade_dias', parseInt(e.target.value) || 7)} className="h-9" />
            </div>
            <div className="col-span-2">
              <Label>Observações / Condições</Label>
              <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Ex: Peças sujeitas a disponibilidade de estoque..." rows={2} />
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
            {desconto > 0 && <div className="flex justify-between text-sm text-red-600"><span>Desconto</span><span>- R$ {desconto.toFixed(2)}</span></div>}
            <div className="flex justify-between text-base font-bold text-green-700 border-t pt-2 mt-2"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? 'Salvar Alterações' : 'Criar Orçamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}