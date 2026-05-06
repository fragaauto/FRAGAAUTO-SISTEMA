import React from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ItemOrcamento from './ItemOrcamento';

/**
 * Wrapper do ItemOrcamento que detecta quando "sob_encomenda" é marcado
 * e cria automaticamente o registro na entidade Encomenda.
 */
export default function ItemOrcamentoComEncomenda({ item, onUpdate, onRemove, readOnly, atendimento }) {
  const handleUpdate = async (updatedItem) => {
    // Detectar se acabou de marcar "sob encomenda"
    if (updatedItem.sob_encomenda && !item.sob_encomenda) {
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
          peca: updatedItem.nome,
          valor_venda: updatedItem.valor_total || 0,
          custo_encomenda: 0,
          foi_comprada: false,
          foi_entregue: false,
          status: 'nao_comprada',
        });
        toast.success(`📦 Encomenda registrada: ${updatedItem.nome}`);
      } catch (e) {
        toast.error('Erro ao criar encomenda');
      }
    }
    onUpdate(updatedItem);
  };

  return (
    <ItemOrcamento
      item={item}
      onUpdate={handleUpdate}
      onRemove={onRemove}
      readOnly={readOnly}
    />
  );
}