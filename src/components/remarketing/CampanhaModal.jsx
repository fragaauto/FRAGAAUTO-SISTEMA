import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Users, Filter, Save } from 'lucide-react';

const VARIAVEIS = ['{nome}', '{veiculo}', '{ultimo_servico}', '{placa}'];

export default function CampanhaModal({ campanha, atendimentos, onClose, onSaved }) {
  const [nome, setNome] = useState(campanha?.nomeCampanha || '');
  const [mensagem, setMensagem] = useState(campanha?.mensagemBase || 'Olá {nome} 👋\n\nGostaria de te oferecer uma condição especial para o seu {veiculo}.\n\nPosso te ajudar?');
  const [contatosSelecionados, setContatosSelecionados] = useState(
    campanha?.listaContatos?.map(c => c.clienteId) || []
  );
  const [filtroNome, setFiltroNome] = useState('');

  // Montar lista de contatos únicos a partir dos atendimentos
  const contatosDisponiveis = useMemo(() => {
    const map = {};
    atendimentos.forEach(at => {
      if (!at.cliente_telefone) return;
      if (!map[at.cliente_id || at.cliente_nome]) {
        map[at.cliente_id || at.cliente_nome] = {
          clienteId: at.cliente_id || at.cliente_nome,
          clienteNome: at.cliente_nome || 'Sem nome',
          telefone: at.cliente_telefone,
          veiculo: `${at.placa} - ${at.modelo}`,
          ultimoServico: at.queixa_inicial || '',
          atendimentoId: at.id
        };
      }
    });
    return Object.values(map);
  }, [atendimentos]);

  const contatosFiltrados = contatosDisponiveis.filter(c =>
    !filtroNome || c.clienteNome.toLowerCase().includes(filtroNome.toLowerCase())
  );

  const toggleContato = (id) => {
    setContatosSelecionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selecionarTodos = () => setContatosSelecionados(contatosFiltrados.map(c => c.clienteId));
  const deselecionarTodos = () => setContatosSelecionados([]);

  const saveMutation = useMutation({
    mutationFn: (data) => campanha?.id
      ? base44.entities.Campanha.update(campanha.id, data)
      : base44.entities.Campanha.create(data),
    onSuccess: () => {
      toast.success(campanha?.id ? 'Campanha atualizada!' : 'Campanha criada!');
      onSaved();
    }
  });

  const handleSave = (statusCampanha = 'rascunho') => {
    if (!nome.trim()) { toast.error('Informe o nome da campanha'); return; }
    const listaContatos = contatosSelecionados.map(id => {
      const c = contatosDisponiveis.find(x => x.clienteId === id);
      return c ? { ...c, status: 'pendente' } : null;
    }).filter(Boolean);

    saveMutation.mutate({
      nomeCampanha: nome,
      mensagemBase: mensagem,
      listaContatos,
      status: statusCampanha,
      totalEnviados: campanha?.totalEnviados || 0,
      totalRespondidos: campanha?.totalRespondidos || 0,
      totalConvertidos: campanha?.totalConvertidos || 0,
    });
  };

  const inserirVariavel = (v) => setMensagem(prev => prev + v);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-500" />
            {campanha?.id ? 'Editar Campanha' : 'Nova Campanha'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label>Nome da Campanha *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Reativação - Borrachas de Porta" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Mensagem Base</Label>
              <div className="flex gap-1 flex-wrap">
                {VARIAVEIS.map(v => (
                  <Button key={v} size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => inserirVariavel(v)}>
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              className="min-h-[150px]"
              placeholder="Digite a mensagem..."
            />
            <p className="text-xs text-slate-400 mt-1">Use as variáveis acima para personalizar automaticamente</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1">
                <Users className="w-4 h-4" /> Contatos ({contatosSelecionados.length} selecionados)
              </Label>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-xs" onClick={selecionarTodos}>Todos</Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={deselecionarTodos}>Nenhum</Button>
              </div>
            </div>
            <Input
              placeholder="Filtrar por nome..."
              value={filtroNome}
              onChange={e => setFiltroNome(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {contatosFiltrados.map(c => (
                <div key={c.clienteId} className="flex items-center gap-3 p-2 hover:bg-slate-50">
                  <Checkbox
                    checked={contatosSelecionados.includes(c.clienteId)}
                    onCheckedChange={() => toggleContato(c.clienteId)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.clienteNome}</p>
                    <p className="text-xs text-slate-500">{c.veiculo} • {c.telefone}</p>
                  </div>
                </div>
              ))}
              {contatosFiltrados.length === 0 && (
                <p className="text-center py-4 text-slate-500 text-sm">Nenhum contato encontrado</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={() => handleSave('rascunho')} variant="outline" className="flex-1" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />Salvar Rascunho
            </Button>
            <Button onClick={() => handleSave('agendada')} className="flex-1 bg-orange-500 hover:bg-orange-600" disabled={saveMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />Agendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}