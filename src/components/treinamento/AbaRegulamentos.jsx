import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, Upload, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";

export default function AbaRegulamentos({ isAdmin }) {
  const queryClient = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const { data: regulamentos = [], isLoading } = useQuery({
    queryKey: ['regulamentos'],
    queryFn: () => base44.entities.Regulamento.list('-created_date'),
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Regulamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulamentos'] });
      toast.success('Regulamento publicado!');
      setTitulo(''); setDescricao(''); setArquivo(null);
    },
    onError: (e) => toast.error(e?.message || 'Erro ao publicar regulamento')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Regulamento.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['regulamentos'] }); toast.success('Regulamento removido'); }
  });

  const handlePublicar = async () => {
    if (!titulo.trim()) return toast.error('Informe o título do regulamento');
    if (!arquivo) return toast.error('Selecione um arquivo PDF');
    if (arquivo.type && arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) {
      return toast.error('O arquivo deve ser um PDF');
    }
    setEnviando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: arquivo });
      createMutation.mutate({ titulo, descricao, file_url, ativo: true });
    } catch (e) {
      toast.error(e?.message || 'Erro ao enviar arquivo');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-slate-800">Publicar Regulamento (PDF)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Regulamento Interno 2026" />
              </div>
              <div>
                <Label>Arquivo PDF *</Label>
                <Input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={e => setArquivo(e.target.files?.[0] || null)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Observações sobre o regulamento..." rows={2} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handlePublicar} disabled={enviando || createMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
                {(enviando || createMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Publicar Regulamento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
      ) : regulamentos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Nenhum regulamento publicado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {regulamentos.map((r) => (
            <Card key={r.id} className="hover:shadow-sm transition-all">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{r.titulo}</p>
                    {r.descricao && <p className="text-sm text-slate-500 truncate">{r.descricao}</p>}
                    {r.usuario_nome && <p className="text-xs text-slate-400 mt-0.5">Publicado por {r.usuario_nome}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Visualizar / Baixar
                    </Button>
                  </a>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isAdmin && regulamentos.length === 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">A administração ainda não publicou nenhum regulamento.</p>
        </div>
      )}
    </div>
  );
}