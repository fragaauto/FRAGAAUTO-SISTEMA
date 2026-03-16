import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle, Clock, Settings } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ItemAprovacao({ item, onUpdate }) {
  const [observacao, setObservacao] = React.useState(item.observacao_cliente || '');
  const [statusServico, setStatusServico] = React.useState(item.status_servico || 'aguardando_autorizacao');
  const [localStatus, setLocalStatus] = React.useState(item.status_aprovacao || 'pendente');
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Sync apenas se não estiver em processo de atualização
  React.useEffect(() => {
    if (!isUpdating) {
      setLocalStatus(item.status_aprovacao || 'pendente');
      setStatusServico(item.status_servico || 'aguardando_autorizacao');
      setObservacao(item.observacao_cliente || '');
    }
  }, [item.status_aprovacao, item.status_servico, item.observacao_cliente, isUpdating]);

  const handleAprovacao = (status) => {
    if (isUpdating) return; // Previne múltiplos cliques
    setIsUpdating(true);
    setLocalStatus(status);
    onUpdate({
      ...item,
      status_aprovacao: status,
      observacao_cliente: observacao,
      status_servico: statusServico
    });
    // Reset após delay suficiente para debounce (300ms) + chamada API (~1s)
    setTimeout(() => setIsUpdating(false), 1500);
  };

  const handleStatusServicoChange = (newStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    setStatusServico(newStatus);
    onUpdate({
      ...item,
      status_servico: newStatus
    });
    setTimeout(() => setIsUpdating(false), 1500);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'reprovado':
        return <Badge className="bg-red-100 text-red-800">Reprovado</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
    }
  };

  const getStatusServicoBadge = (status) => {
    switch (status) {
      case 'autorizado':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Autorizado
          </Badge>
        );
      case 'em_andamento':
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <Settings className="w-3 h-3 mr-1" />
            Em Andamento
          </Badge>
        );
      default:
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <Clock className="w-3 h-3 mr-1" />
            Aguardando Autorização
          </Badge>
        );
    }
  };

  return (
    <Card className={localStatus === 'reprovado' ? 'border-red-200 bg-red-50/30' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <p className="font-semibold text-slate-800">{item.nome}</p>
              {getStatusBadge(localStatus)}
              {getStatusServicoBadge(statusServico)}
            </div>
            <p className="text-sm text-slate-500">
              {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)} = <strong>R$ {item.valor_total?.toFixed(2)}</strong>
            </p>
          </div>
        </div>

        <div className="mb-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Status do Serviço</label>
          <Select value={statusServico} onValueChange={handleStatusServicoChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aguardando_autorizacao">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Aguardando Autorização
                </span>
              </SelectItem>
              <SelectItem value="autorizado">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Autorizado
                </span>
              </SelectItem>
              <SelectItem value="em_andamento">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Em Andamento
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(item.vantagens || item.desvantagens) && (
          <div className="space-y-2 text-sm">
            {item.vantagens && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-semibold text-green-800 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Vantagens de Fazer
                </p>
                <p className="text-green-700">{item.vantagens}</p>
              </div>
            )}
            {item.desvantagens && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-semibold text-red-800 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Riscos de Não Fazer
                </p>
                <p className="text-red-700">{item.desvantagens}</p>
              </div>
            )}
          </div>
        )}

        {localStatus === 'pendente' && (
          <>
            <Textarea
              placeholder="Observação do cliente (opcional)..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleAprovacao('aprovado')}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
              <Button
                onClick={() => handleAprovacao('reprovado')}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reprovar
              </Button>
            </div>
          </>
        )}

        {item.observacao_cliente && localStatus !== 'pendente' && (
          <div className="bg-slate-100 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Observação do cliente:</p>
            <p className="text-sm text-slate-700">{item.observacao_cliente}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}