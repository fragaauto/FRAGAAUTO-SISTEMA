import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Image, FileText, Link, Loader2, X } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const TIPO_ICON = {
  imagem: Image,
  texto: FileText,
  link: Link
};

const TIPO_COR = {
  imagem: 'text-blue-500',
  texto: 'text-green-500',
  link: 'text-purple-500'
};

function ConteudoCard({ conteudo, isAdmin, onDelete }) {
  const [lightbox, setLightbox] = useState(false);
  const Icon = TIPO_ICON[conteudo.conteudo_tipo] || FileText;
  const cor = TIPO_COR[conteudo.conteudo_tipo] || 'text-slate-500';

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {conteudo.conteudo_tipo === 'imagem' && conteudo.url && (
            <img
              src={conteudo.url}
              alt={conteudo.titulo}
              className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightbox(true)}
            />
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${cor} flex-shrink-0`} />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {conteudo.conteudo_tipo}
                </span>
              </div>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover conteúdo?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(conteudo.id)} className="bg-red-500 hover:bg-red-600">Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{conteudo.titulo}</h3>
            {conteudo.descricao && (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{conteudo.descricao}</p>
            )}
            {conteudo.conteudo_tipo === 'link' && conteudo.url && (
              <a href={conteudo.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 block truncate">
                {conteudo.url}
              </a>
            )}
            <p className="text-xs text-slate-400 mt-3">
              {conteudo.created_date ? format(new Date(conteudo.created_date), "dd/MM/yyyy", { locale: ptBR }) : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2" onClick={() => setLightbox(false)}>
            <X className="w-6 h-6" />
          </button>
          <img src={conteudo.url} alt={conteudo.titulo} className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

export default function AbaConteudos({ isAdmin }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', conteudo_tipo: 'imagem', url: '' });
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);

  const { data: conteudos = [] } = useQuery({
    queryKey: ['conteudo_treinamento_outros'],
    queryFn: () => base44.entities.ConteudoTreinamento.filter({ tipo: 'conteudo', ativo: true }, '-created_date')
  });

  const criarMutation = useMutation({
    mutationFn: (data) => base44.entities.ConteudoTreinamento.create(data),
    onSuccess: async (novoConteudo) => {
      try {
        const usuarios = await base44.entities.User.list();
        const me = await base44.auth.me();
        for (const u of usuarios) {
          if (u.email !== me?.email) {
            await base44.integrations.Core.SendEmail({
              to: u.email,
              subject: '📚 Novo conteúdo de treinamento disponível!',
              body: `Olá ${u.full_name || u.email}!\n\nUm novo conteúdo de treinamento foi publicado:\n\n📌 ${novoConteudo.titulo}\n${novoConteudo.descricao ? `${novoConteudo.descricao}\n` : ''}\nAcesse o Manual de Treinamento no sistema para visualizar.\n\nEquipe Fraga Auto`
            });
          }
        }
      } catch (e) { /* silencioso */ }
      queryClient.invalidateQueries(['conteudo_treinamento_outros']);
      toast.success('Conteúdo publicado! Usuários notificados por e-mail.');
      setShowForm(false);
      setForm({ titulo: '', descricao: '', conteudo_tipo: 'imagem', url: '' });
      setArquivoSelecionado(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConteudoTreinamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo_treinamento_outros']);
      toast.success('Conteúdo removido');
    }
  });

  const handleSalvar = async () => {
    if (!form.titulo) { toast.error('Informe o título'); return; }

    let url = form.url;

    if (form.conteudo_tipo === 'imagem' && arquivoSelecionado) {
      setUploading(true);
      try {
        const res = await base44.integrations.Core.UploadFile({ file: arquivoSelecionado });
        url = res.file_url;
      } catch {
        toast.error('Erro ao fazer upload da imagem');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    criarMutation.mutate({ tipo: 'conteudo', titulo: form.titulo, descricao: form.descricao, conteudo_tipo: form.conteudo_tipo, url, ativo: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{conteudos.length} conteúdo(s) publicado(s)</p>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Publicar Conteúdo
          </Button>
        )}
      </div>

      {conteudos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum conteúdo publicado</p>
          {isAdmin && <p className="text-sm mt-1">Clique em "Publicar Conteúdo" para adicionar</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {conteudos.map(c => (
            <ConteudoCard key={c.id} conteudo={c} isAdmin={isAdmin} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publicar Conteúdo de Treinamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo de Conteúdo</label>
              <Select value={form.conteudo_tipo} onValueChange={v => setForm(f => ({ ...f, conteudo_tipo: v, url: '', }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imagem">🖼️ Imagem</SelectItem>
                  <SelectItem value="texto">📝 Texto / Comunicado</SelectItem>
                  <SelectItem value="link">🔗 Link Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Título *</label>
              <Input placeholder="Título do conteúdo" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {form.conteudo_tipo === 'texto' ? 'Conteúdo / Mensagem' : 'Descrição'}
              </label>
              <Textarea
                placeholder={form.conteudo_tipo === 'texto' ? 'Escreva o comunicado aqui...' : 'Descrição opcional'}
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            {form.conteudo_tipo === 'imagem' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Imagem</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setArquivoSelecionado(e.target.files[0])}
                  className="text-sm text-slate-600 w-full border border-slate-200 rounded-md px-3 py-2"
                />
                {arquivoSelecionado && <p className="text-xs text-green-600 mt-1">✓ {arquivoSelecionado.name}</p>}
              </div>
            )}
            {form.conteudo_tipo === 'link' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">URL do Link</label>
                <Input placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSalvar} disabled={criarMutation.isPending || uploading} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {(criarMutation.isPending || uploading) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publicando...</> : 'Publicar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}