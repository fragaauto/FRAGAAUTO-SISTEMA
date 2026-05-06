import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, X, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Trash2, Wrench } from 'lucide-react';
import AtribuirTecnicoModal from './AtribuirTecnicoModal';

/**
 * Versão completa de ItemOrcamento com suporte a encomenda.
 * Ao marcar "sob encomenda", abre card para preencher dados e cria registro.
 */
export default function ItemOrcamentoComEncomenda({ item, onUpdate, onRemove, readOnly, atendimento }) {
  // Estado local que sobrepõe o prop para evitar flicker visual
  const [sobEncomendaLocal, setSobEncomendaLocal] = useState(!!item.sob_encomenda);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [custoEncomenda, setCustoEncomenda] = useState('');
  const [descricaoPeca, setDescricaoPeca] = useState(item.nome || '');
  const [mostrarModalTecnico, setMostrarModalTecnico] = useState(false);

  // Sincroniza se o item externo mudar (ex: recarregar página)
  React.useEffect(() => {
    setSobEncomendaLocal(!!item.sob_encomenda);
  }, [item.sob_encomenda]);

  const handleQuantidadeChange = (e) => {
    const value = e.target.value;
    if (value === '') { onUpdate({ ...item, sob_encomenda: sobEncomendaLocal, quantidade: '', valor_total: 0 }); return; }
    const quantidade = Math.max(1, parseInt(value) || 1);
    onUpdate({ ...item, sob_encomenda: sobEncomendaLocal, quantidade, valor_total: quantidade * item.valor_unitario });
  };

  const handleValorChange = (e) => {
    const value = e.target.value;
    if (value === '') { onUpdate({ ...item, sob_encomenda: sobEncomendaLocal, valor_unitario: '', valor_total: 0 }); return; }
    const valor_unitario = parseFloat(value) || 0;
    onUpdate({ ...item, sob_encomenda: sobEncomendaLocal, valor_unitario, valor_total: (item.quantidade || 0) * valor_unitario });
  };

  const handleAtribuirTecnico = (tecnicos) => {
    onUpdate({ ...item, sob_encomenda: sobEncomendaLocal, tecnicos: tecnicos || [] });
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    if (checked) {
      // Marca visualmente mas aguarda confirmação do form
      setSobEncomendaLocal(true);
      setDescricaoPeca(item.nome || '');
      setCustoEncomenda('');
      setShowForm(true);
    } else {
      // Desmarcar direto
      setSobEncomendaLocal(false);
      setShowForm(false);
      onUpdate({ ...item, sob_encomenda: false });
    }
  };

  const handleConfirmar = async () => {
    if (!descricaoPeca.trim()) {
      toast.error('Informe a descrição da peça');
      return;
    }
    setSalvando(true);
    try {
      await base44.entities.Encomenda.create({
        unidade_id: atendimento?.unidade_id || null,
        atendimento_id: atendimento?.id,
        numero_os: atendimento?.numero_os,
        nome_cliente: atendimento?.cliente_nome || '',
        telefone_cliente: atendimento?.cliente_telefone || '',
        modelo_veiculo: atendimento?.modelo || '',
        ano_veiculo: atendimento?.ano || '',
        placa_veiculo: atendimento?.placa || '',
        peca: descricaoPeca.trim(),
        valor_venda: item.valor_total || 0,
        custo_encomenda: parseFloat(custoEncomenda) || 0,
        foi_comprada: false,
        foi_entregue: false,
        status: 'nao_comprada',
      });
      toast.success(`📦 Encomenda registrada: ${descricaoPeca}`);
      setShowForm(false);
      // Salva o item com sob_encomenda: true no atendimento
      onUpdate({ ...item, sob_encomenda: true });
    } catch (e) {
      toast.error('Erro ao criar encomenda: ' + e.message);
      // Reverte checkbox se falhar
      setSobEncomendaLocal(false);
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelar = () => {
    setSobEncomendaLocal(false);
    setShowForm(false);
    onUpdate({ ...item, sob_encomenda: false });
  };

  return (
    <div>
      {/* Card do item — renderizado diretamente aqui para controle total */}
      <div className={`flex flex-col gap-2 p-4 rounded-xl border ${sobEncomendaLocal ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 truncate">{item.nome}</p>
              {sobEncomendaLocal && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                  <Package className="w-3 h-3 mr-1" /> Sob encomenda
                </Badge>
              )}
            </div>
            {item.tecnicos && item.tecnicos.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.tecnicos.map((tec, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                    <Wrench className="w-3 h-3 mr-1" />
                    {tec.nome}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMostrarModalTecnico(true)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
            >
              <Wrench className="w-4 h-4 mr-1" />
              <span className="text-xs">{item.tecnicos?.length > 0 ? 'Editar' : 'Atribuir'}</span>
            </Button>
          )}
        </div>

        {readOnly ? (
          <div className="flex items-center gap-4 flex-wrap text-sm text-slate-600">
            <span><span className="text-slate-400">Qtd:</span> {item.quantidade}</span>
            <span><span className="text-slate-400">Unit.:</span> R$ {item.valor_unitario?.toFixed(2)}</span>
            <span className="font-semibold text-green-700">Total: R$ {item.valor_total?.toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Qtd</span>
              <Input
                type="number" inputMode="numeric" min="1"
                value={item.quantidade}
                onChange={handleQuantidadeChange}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) handleQuantidadeChange({ target: { value: '1' } }); }}
                className="w-20 h-10 text-center"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Valor Unit.</span>
              <Input
                type="number" step="0.01" min="0"
                value={item.valor_unitario}
                onChange={handleValorChange}
                onFocus={(e) => e.target.select()}
                className="w-28 h-10"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">Total</span>
              <div className="h-10 px-3 flex items-center bg-green-50 border border-green-200 rounded-md font-semibold text-green-700 min-w-[100px]">
                R$ {item.valor_total?.toFixed(2)}
              </div>
            </div>
            <Button
              type="button" variant="ghost" size="icon"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        )}

        {!readOnly && (
          <label className="flex items-center gap-2 cursor-pointer mt-1 w-fit">
            <input
              type="checkbox"
              checked={sobEncomendaLocal}
              onChange={handleCheckboxChange}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <Package className="w-3 h-3 text-orange-500" />
              Produto sob encomenda
            </span>
          </label>
        )}
      </div>

      {/* Card do formulário de encomenda */}
      {showForm && (
        <div className="mt-2 p-4 bg-orange-50 border-2 border-orange-400 rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-orange-600" />
            <p className="font-semibold text-orange-800 text-sm">Preencha os dados da encomenda</p>
          </div>

          <div>
            <Label className="text-xs text-slate-600">Descrição / Nome da Peça *</Label>
            <Input
              value={descricaoPeca}
              onChange={(e) => setDescricaoPeca(e.target.value)}
              placeholder="Ex: Trava elétrica 2 fios lado esquerdo"
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs text-slate-600">Custo da Encomenda (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={custoEncomenda}
              onChange={(e) => setCustoEncomenda(e.target.value)}
              placeholder="0,00"
              className="mt-1 w-40"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleConfirmar}
              disabled={salvando}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Confirmar Encomenda
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelar} disabled={salvando}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {mostrarModalTecnico && (
        <AtribuirTecnicoModal
          item={item}
          onConfirm={handleAtribuirTecnico}
          onClose={() => setMostrarModalTecnico(false)}
        />
      )}
    </div>
  );
}