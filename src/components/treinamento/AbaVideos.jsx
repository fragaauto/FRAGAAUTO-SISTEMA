import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Play, Youtube, Edit, GripVertical, FolderOpen } from 'lucide-react';
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

function extrairYoutubeId(url) {
  const regexes = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  for (const r of regexes) {
    const m = url.match(r);
    if (m) return m[1];
  }
  return null;
}

function VideoCard({ video, isAdmin, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
        <div className="relative" onClick={() => setOpen(true)}>
          <img
            src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
            alt={video.titulo}
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-12 h-12 text-white fill-white" />
          </div>
          <div className="absolute top-2 right-2 bg-red-600 text-white rounded px-1.5 py-0.5 text-xs flex items-center gap-1">
            <Youtube className="w-3 h-3" />
            YouTube
          </div>
        </div>
        <CardContent className="p-3">
          <p className="font-semibold text-slate-800 text-sm line-clamp-2">{video.titulo}</p>
          {video.descricao && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{video.descricao}</p>}
          {isAdmin && (
            <div className="mt-2 flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:text-red-600 px-2"
                    onClick={e => e.stopPropagation()}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover vídeo?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(video.id)} className="bg-red-500 hover:bg-red-600">Remover</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <div className="space-y-4">
            <img
              src={`https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}
              alt={video.titulo}
              className="w-full rounded-lg"
            />
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{video.titulo}</h3>
              {video.descricao && <p className="text-slate-500 text-sm mt-1">{video.descricao}</p>}
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              <Youtube className="w-5 h-5" />
              Assistir no YouTube
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AbaVideos({ isAdmin }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [playlistAtiva, setPlaylistAtiva] = useState('todas');
  const [novaPlaylist, setNovaPlaylist] = useState('');
  const [form, setForm] = useState({ titulo: '', url: '', descricao: '', playlist: '' });

  const { data: videos = [] } = useQuery({
    queryKey: ['conteudo_treinamento_videos'],
    queryFn: () => base44.entities.ConteudoTreinamento.filter({ tipo: 'video', ativo: true }, 'ordem')
  });

  const criarMutation = useMutation({
    mutationFn: (data) => base44.entities.ConteudoTreinamento.create(data),
    onSuccess: async (novoVideo) => {
      // Notificar todos os usuários
      try {
        const usuarios = await base44.entities.User.list();
        const me = await base44.auth.me();
        for (const u of usuarios) {
          if (u.email !== me?.email) {
            await base44.integrations.Core.SendEmail({
              to: u.email,
              subject: '🎬 Novo vídeo de treinamento disponível!',
              body: `Olá ${u.full_name || u.email}!\n\nUm novo vídeo de treinamento foi adicionado:\n\n📹 ${novoVideo.titulo}\n${novoVideo.playlist ? `📂 Playlist: ${novoVideo.playlist}\n` : ''}\nAcesse o Manual de Treinamento no sistema para assistir.\n\nEquipe Fraga Auto`
            });
          }
        }
      } catch (e) { /* notificação falhou, não bloqueia */ }
      queryClient.invalidateQueries(['conteudo_treinamento_videos']);
      toast.success('Vídeo adicionado! Usuários notificados por e-mail.');
      setShowForm(false);
      setForm({ titulo: '', url: '', descricao: '', playlist: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConteudoTreinamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo_treinamento_videos']);
      toast.success('Vídeo removido');
    }
  });

  const handleSalvar = () => {
    if (!form.titulo || !form.url) { toast.error('Informe título e URL do vídeo'); return; }
    const youtubeId = extrairYoutubeId(form.url);
    if (!youtubeId) { toast.error('URL do YouTube inválida'); return; }
    const playlist = form.playlist || novaPlaylist || '';
    const ordem = videos.filter(v => v.playlist === playlist).length;
    criarMutation.mutate({ tipo: 'video', titulo: form.titulo, url: form.url, descricao: form.descricao, playlist, youtube_id: youtubeId, ordem, ativo: true });
  };

  // Playlists únicas
  const playlists = [...new Set(videos.map(v => v.playlist).filter(Boolean))];
  const videosFiltrados = playlistAtiva === 'todas' ? videos : videos.filter(v => v.playlist === playlistAtiva);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={playlistAtiva === 'todas' ? 'default' : 'outline'}
            onClick={() => setPlaylistAtiva('todas')}
            className={playlistAtiva === 'todas' ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            Todos ({videos.length})
          </Button>
          {playlists.map(pl => (
            <Button
              key={pl}
              size="sm"
              variant={playlistAtiva === pl ? 'default' : 'outline'}
              onClick={() => setPlaylistAtiva(pl)}
              className={playlistAtiva === pl ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1" />
              {pl} ({videos.filter(v => v.playlist === pl).length})
            </Button>
          ))}
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Vídeo
          </Button>
        )}
      </div>

      {videosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Youtube className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum vídeo {playlistAtiva !== 'todas' ? 'nesta playlist' : 'adicionado'}</p>
          {isAdmin && <p className="text-sm mt-1">Clique em "Adicionar Vídeo" para começar</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videosFiltrados.map(video => (
            <VideoCard key={video.id} video={video} isAdmin={isAdmin} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {/* Modal Adicionar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              Adicionar Vídeo do YouTube
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">URL do YouTube *</label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Título *</label>
              <Input
                placeholder="Ex: Como abrir um atendimento"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Descrição</label>
              <Input
                placeholder="Descrição opcional do vídeo"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Playlist</label>
              {playlists.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {playlists.map(pl => (
                    <button key={pl}
                      onClick={() => { setForm(f => ({ ...f, playlist: pl })); setNovaPlaylist(''); }}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${form.playlist === pl ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {pl}
                    </button>
                  ))}
                </div>
              )}
              <Input
                placeholder="Nova playlist ou deixe em branco"
                value={novaPlaylist || form.playlist}
                onChange={e => { setNovaPlaylist(e.target.value); setForm(f => ({ ...f, playlist: '' })); }}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSalvar} disabled={criarMutation.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {criarMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}