import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, X, Check, Loader2 } from 'lucide-react';
import ItemOrcamento from './ItemOrcamento';

/**
 * Wrapper do ItemOrcamento que detecta quando "sob_encomenda" é marcado
 * e abre um card para preencher os dados da encomenda antes de salvar.
 */
export default function ItemOrcamentoComEncomenda({ item, onUpdate, onRemove, readOnly, atendimento }) {
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [custoEncomenda, setCustoEncomenda] = useState('');
  const [descricaoPeca, setDescricaoPeca] = useState(item.nome || '');
  const prevSobEncomenda = useRef(!!item.sob_encomenda);

  const handleUpdate = (updatedItem) => {
    // Se acabou de MARCAR "sob encomenda", abrir o formulário
    if (updatedItem.sob_encomenda && !prevSobEncomenda.current) {
      setPendingItem(updatedItem);
      setDescricaoPeca(updatedItem.nome || '');
      setCustoEncomenda('');
      setShowForm(true);
      // Não chama onUpdate ainda — espera confirmação
      return;
    }

    // Se DESMARCOU
    if (!updatedItem.sob_encomenda) {
      prevSobEncomenda.current = false;
      setShowForm(false);
      setPendingItem(null);
    }

    onUpdate(updatedItem);
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
        valor_venda: pendingItem?.valor_total || 0,
        custo_encomenda: parseFloat(custoEncomenda) || 0,
        foi_comprada: false,
        foi_entregue: false,
        status: 'nao_comprada',
      });
      toast.success(`📦 Encomenda registrada: ${descricaoPeca}`);
      prevSobEncomenda.current = true;
      setShowForm(false);
      // Agora salva o item com sob_encomenda: true
      onUpdate({ ...pendingItem, sob_encomenda: true });
    } catch (e) {
      toast.error('Erro ao criar encomenda: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelar = () => {
    // Desmarcar o checkbox — reverter
    setShowForm(false);
    setPendingItem(null);
    prevSobEncomenda.current = false;
    // Notifica o pai para salvar com sob_encomenda: false
    onUpdate({ ...item, sob_encomenda: false });
  };

  return (
    <div>
      <ItemOrcamento
        item={item}
        onUpdate={handleUpdate}
        onRemove={onRemove}
        readOnly={readOnly}
      />

      {showForm && (
        <div className="mt-2 p-4 bg-orange-50 border-2 border-orange-300 rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-orange-600" />
            <p className="font-semibold text-orange-800 text-sm">Dados da Encomenda</p>
          </div>

          <div>
            <Label className="text-xs text-slate-600">Descrição / Nome da Peça *</Label>
            <Input
              value={descricaoPeca}
              onChange={(e) => setDescricaoPeca(e.target.value)}
              placeholder="Ex: Trava elétrica 2 fios lado esquerdo"
              className="mt-1"
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelar}
              disabled={salvando}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}