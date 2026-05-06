import React, { useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ItemOrcamento from './ItemOrcamento';

/**
 * Wrapper do ItemOrcamento que detecta quando "sob_encomenda" é marcado
 * e cria automaticamente o registro na entidade Encomenda.
 */
export default function ItemOrcamentoComEncomenda({ item, onUpdate, onRemove, readOnly, atendimento }) {
  // Ref para evitar criar encomenda duplicada na mesma sessão
  const encomendaCriada = useRef(!!item.sob_encomenda);

  const handleUpdate = async (updatedItem) => {
    // Se acabou de marcar "sob encomenda" e ainda não criou nesta sessão
    if (updatedItem.sob_encomenda && !encomendaCriada.current) {
      encomendaCriada.current = true;
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
        encomendaCriada.current = false; // permite tentar novamente
        toast.error('Erro ao criar encomenda');
      }
    }

    // Se desmarcou, reset da ref para permitir criar novamente se marcar de novo
    if (!updatedItem.sob_encomenda) {
      encomendaCriada.current = false;
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