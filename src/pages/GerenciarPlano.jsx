import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Shield, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { TODOS_MODULOS, MODULOS_DEFAULT } from '@/components/modulos';

export default function GerenciarPlano() {
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
  });

  const config = configs[0] || {};
  const [modulosAtivos, setModulosAtivos] = React.useState(null);

  React.useEffect(() => {
    if (config.id) {
      setModulosAtivos(config.modulos_ativos ?? MODULOS_DEFAULT);
    }
  }, [config.id]);

  const ativos = modulosAtivos ?? MODULOS_DEFAULT;

  const saveMutation = useMutation({
    mutationFn: () => {
      if (config.id) return base44.entities.Configuracao.update(config.id, { modulos_ativos: ativos });
      return base44.entities.Configuracao.create({ nome_empresa: 'Empresa', modulos_ativos: ativos });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['configuracoes']);
      toast.success('Plano salvo! O menu será atualizado automaticamente.');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const toggleModulo = (id) => {
    setModulosAtivos(prev => {
      const list = prev ?? MODULOS_DEFAULT;
      return list.includes(id) ? list.filter(m => m !== id) : [...list, id];
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const totalAtivos = TODOS_MODULOS.filter(m => m.essencial || ativos.includes(m.id)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-500" />
              Gerenciar Plano / Módulos
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Ative ou desative funcionalidades disponíveis nesta instalação
            </p>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Resumo */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-orange-800">Módulos ativos: {totalAtivos} de {TODOS_MODULOS.length}</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Módulos desativados ficam ocultos no menu e mostram tela de "acesso bloqueado" se acessados diretamente.
                </p>
              </div>
              <div className="text-3xl font-bold text-orange-500">{totalAtivos}/{TODOS_MODULOS.length}</div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de módulos */}
        <div className="space-y-3">
          {TODOS_MODULOS.map(modulo => {
            const ativo = modulo.essencial || ativos.includes(modulo.id);
            return (
              <Card
                key={modulo.id}
                className={`transition-all border-2 ${ativo ? 'border-green-200' : 'border-slate-200 opacity-70'}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{modulo.icone}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">{modulo.nome}</p>
                          {modulo.essencial && (
                            <Badge variant="outline" className="text-xs border-slate-300 text-slate-500 gap-1">
                              <Lock className="w-3 h-3" /> Essencial
                            </Badge>
                          )}
                          {ativo ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{modulo.descricao}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {modulo.paginas?.map(p => (
                            <span key={p} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={ativo}
                      disabled={modulo.essencial}
                      onCheckedChange={() => !modulo.essencial && toggleModulo(modulo.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base"
        >
          {saveMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Salvar Configurações de Plano
        </Button>
      </div>
    </div>
  );
}