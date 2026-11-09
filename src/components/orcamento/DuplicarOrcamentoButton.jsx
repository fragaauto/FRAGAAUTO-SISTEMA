import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Duplica o orçamento atual em um novo atendimento (mesmo cliente, veículo e itens)
export default function DuplicarOrcamentoButton({ atendimento, usuarioNome, disabled }) {
  const navigate = useNavigate();
  const [duplicando, setDuplicando] = useState(false);

  const resetarItem = (item) => ({
    ...item,
    status_aprovacao: 'pendente',
    status_servico: 'aguardando_autorizacao',
    tecnicos: [],
    data_execucao: null,
  });

  const duplicar = async () => {
    setDuplicando(true);
    try {
      let proximoNumero = 1;
      const page = await base44.entities.Atendimento.filter({}, { sort: '-numero_os', limit: 1, fields: ['numero_os'] });
      proximoNumero = (page.items?.[0]?.numero_os || 0) + 1;

      const novo = await base44.entities.Atendimento.create({
        unidade_id: atendimento.unidade_id || null,
        numero_os: proximoNumero,
        cliente_id: atendimento.cliente_id || '',
        cliente_nome: atendimento.cliente_nome || '',
        cliente_telefone: atendimento.cliente_telefone || '',
        cliente_cpf: atendimento.cliente_cpf || '',
        cliente_endereco: atendimento.cliente_endereco || '',
        veiculo_id: atendimento.veiculo_id || '',
        placa: (atendimento.placa || '').toUpperCase(),
        modelo: atendimento.modelo || '',
        marca: atendimento.marca || '',
        ano: atendimento.ano || '',
        km_atual: atendimento.km_atual || '',
        observacoes_veiculo: atendimento.observacoes_veiculo || '',
        data_entrada: new Date().toISOString(),
        queixa_inicial: atendimento.queixa_inicial || '',
        pre_diagnostico: atendimento.pre_diagnostico || '',
        observacoes: atendimento.observacoes || '',
        checklist: atendimento.checklist || [],
        itens_queixa: (atendimento.itens_queixa || []).map(resetarItem),
        itens_orcamento: (atendimento.itens_orcamento || []).map(resetarItem),
        subtotal_queixa: atendimento.subtotal_queixa || 0,
        subtotal_checklist: atendimento.subtotal_checklist || 0,
        subtotal: atendimento.subtotal || 0,
        desconto: atendimento.desconto || 0,
        valor_final: atendimento.valor_final || 0,
        status: 'queixa_pendente',
        historico_edicoes: [{
          data: new Date().toISOString(),
          usuario: usuarioNome || 'Sistema',
          campo_editado: 'duplicacao',
          descricao: `Orçamento duplicado da OS #${atendimento.numero_os || ''}`,
        }],
      });

      toast.success(`Orçamento duplicado na OS #${proximoNumero}`);
      navigate(createPageUrl(`VerAtendimento?id=${novo.id}`));
    } catch (e) {
      toast.error('Não foi possível duplicar o orçamento');
    } finally {
      setDuplicando(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || duplicando}>
          {duplicando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
          Duplicar orçamento
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicar este orçamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Será criada uma nova OS com os mesmos dados de cliente, veículo e os itens deste orçamento.
            As aprovações e os técnicos não são copiados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={duplicar} className="bg-orange-500 hover:bg-orange-600">
            Duplicar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}