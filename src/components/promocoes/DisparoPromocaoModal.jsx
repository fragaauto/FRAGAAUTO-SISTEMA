import React, { useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Send, Loader2, CheckCircle2, XCircle, Link2, Image as ImageIcon,
  Mic, Upload, X, Clock,
} from 'lucide-react';
import { linkPublico, montarMensagem, uploadArquivoPublico, filtrarClientes, descreverVale } from '@/lib/promocao';

export default function DisparoPromocaoModal({
  promocao,
  grupos,
  clientes,
  carregandoClientes,
  unidadeId,
  onClose,
  onConcluido,
}) {
  const [todos, setTodos] = useState(promocao.todos_clientes || false);
  const [gruposSel, setGruposSel] = useState(promocao.grupos_ids || []);
  const [imagem, setImagem] = useState(promocao.imagem_mensagem_url || '');
  const [audio, setAudio] = useState(promocao.audio_url || '');
  const [intervalo, setIntervalo] = useState(5);
  const [enviando, setEnviando] = useState(false);
  const [enviados, setEnviados] = useState(0);
  const [erros, setErros] = useState(0);
  const [resultados, setResultados] = useState([]);
  const [enviandoMidia, setEnviandoMidia] = useState('');
  const cancelRef = useRef(false);
  const imgRef = useRef(null);
  const audioRef = useRef(null);

  const filtros = useMemo(() => promocao.filtros_clientes || {}, [promocao.filtros_clientes]);

  const destinatarios = useMemo(
    () =>
      filtrarClientes(clientes, {
        todos,
        grupos,
        gruposIds: gruposSel,
        filtros,
      }),
    [clientes, grupos, gruposSel, todos, filtros]
  );

  const link = linkPublico(promocao.id);
  const preview = montarMensagem(promocao, destinatarios[0]?.nome || 'Cliente');
  const processados = enviados + erros;
  const progresso = destinatarios.length ? Math.round((processados / destinatarios.length) * 100) : 0;

  const anexar = async (file, tipo) => {
    if (!file) return;
    setEnviandoMidia(tipo);
    try {
      const url = await uploadArquivoPublico(file);
      if (tipo === 'imagem') setImagem(url);
      else setAudio(url);
      toast.success(tipo === 'imagem' ? 'Imagem anexada' : 'Áudio anexado');
    } catch (e) {
      toast.error('Não foi possível enviar o arquivo: ' + e.message);
    }
    setEnviandoMidia('');
  };

  const esperar = (segundos) => new Promise((r) => setTimeout(r, segundos * 1000));

  const iniciar = async () => {
    if (destinatarios.length === 0) return toast.error('Nenhum cliente com telefone nos destinos escolhidos');
    cancelRef.current = false;
    setEnviando(true);
    setEnviados(0);
    setErros(0);
    setResultados([]);

    await base44.entities.Promocao.update(promocao.id, {
      grupos_ids: gruposSel,
      todos_clientes: todos,
      imagem_mensagem_url: imagem,
      audio_url: audio,
    }).catch(() => {});

    let ok = 0;
    let falhas = 0;

    for (let i = 0; i < destinatarios.length; i++) {
      if (cancelRef.current) break;
      const cliente = destinatarios[i];
      try {
        const res = await base44.functions.invoke('enviarPromocaoWhatsApp', {
          telefone: cliente.telefone,
          mensagem: montarMensagem(promocao, cliente.nome),
          imagemUrl: imagem || null,
          audioUrl: audio || null,
          unidade_id: unidadeId || null,
        });
        if (res.data?.ok) {
          ok++;
          setEnviados((v) => v + 1);
          setResultados((prev) => [...prev, { nome: cliente.nome, ok: true }]);
        } else {
          throw new Error(res.data?.error || 'Erro no envio');
        }
      } catch (e) {
        falhas++;
        setErros((v) => v + 1);
        setResultados((prev) => [...prev, { nome: cliente.nome, ok: false, erro: e.message }]);
      }
      if (i < destinatarios.length - 1 && !cancelRef.current) await esperar(intervalo);
    }

    setEnviando(false);
    await base44.entities.Promocao.update(promocao.id, {
      total_enviados: (promocao.total_enviados || 0) + ok,
    }).catch(() => {});
    if (ok > 0 && falhas === 0) toast.success('Disparo concluído!');
    onConcluido?.();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !enviando && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Disparar: {promocao.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600 break-all flex-1">{link}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copiado'))}
              >
                Copiar
              </Button>
            </div>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-white border rounded p-2 max-h-32 overflow-y-auto">
              {preview}
            </pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Imagem do disparo</Label>
              {imagem ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={imagem} alt="Imagem" className="w-full h-24 object-cover" />
                  <button type="button" onClick={() => setImagem('')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imgRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-500 hover:border-orange-400"
                >
                  {enviandoMidia === 'imagem' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                  <span className="text-xs mt-1">Anexar imagem</span>
                </button>
              )}
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => anexar(e.target.files?.[0], 'imagem')} />
            </div>

            <div>
              <Label className="mb-1 block">Áudio do disparo</Label>
              {audio ? (
                <div className="relative border rounded-lg p-2 bg-white h-24 flex flex-col justify-center">
                  <audio src={audio} controls className="w-full" />
                  <button type="button" onClick={() => setAudio('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => audioRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-slate-500 hover:border-orange-400"
                >
                  {enviandoMidia === 'audio' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                  <span className="text-xs mt-1">Anexar áudio</span>
                </button>
              )}
              <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => anexar(e.target.files?.[0], 'audio')} />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Destinos</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={todos} onCheckedChange={(v) => setTodos(!!v)} disabled={enviando} />
                Todos os clientes com telefone
              </label>
              {grupos.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox
                    checked={gruposSel.includes(g.id)}
                    disabled={enviando}
                    onCheckedChange={() =>
                      setGruposSel((prev) =>
                        prev.includes(g.id) ? prev.filter((i) => i !== g.id) : [...prev, g.id]
                      )
                    }
                  />
                  {g.nome} ({g.cliente_ids?.length || 0})
                </label>
              ))}
            </div>
            {(filtros.codigo_de !== '' && filtros.codigo_de != null) ||
            (filtros.codigo_ate !== '' && filtros.codigo_ate != null) ||
            filtros.nome_iniciais ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {filtros.codigo_de !== '' && filtros.codigo_de != null && (
                  <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                    código de {filtros.codigo_de}
                  </span>
                )}
                {filtros.codigo_ate !== '' && filtros.codigo_ate != null && (
                  <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                    código até {filtros.codigo_ate}
                  </span>
                )}
                {filtros.nome_iniciais && (
                  <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                    nome: {filtros.nome_iniciais}
                  </span>
                )}
              </div>
            ) : null}
            <p className="text-xs text-slate-500 mt-2">
              {carregandoClientes
                ? 'Carregando clientes...'
                : `${destinatarios.length} cliente(s) receberão a campanha`}
            </p>
            {descreverVale(promocao) && (
              <p className="text-xs text-amber-700 mt-1">
                🎟️ Cada reserva pela página gera um vale de {descreverVale(promocao)}
              </p>
            )}
          </div>

          {!enviando && processados === 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-700">Intervalo entre envios</span>
              <Input
                type="number"
                min={2}
                max={120}
                value={intervalo}
                onChange={(e) => setIntervalo(Number(e.target.value) || 5)}
                className="w-20 h-8"
              />
              <span className="text-xs text-amber-700">segundos</span>
            </div>
          )}

          {(enviando || processados > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{processados} de {destinatarios.length} processados</span>
                <span>{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-3" />
              <div className="flex gap-3 text-sm">
                <span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />{enviados} enviados</span>
                <span className="text-red-700 flex items-center gap-1"><XCircle className="w-4 h-4" />{erros} com erro</span>
              </div>
            </div>
          )}

          {resultados.length > 0 && (
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {resultados.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  {r.ok ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="flex-1 truncate text-slate-700">{r.nome}</span>
                  {!r.ok && <span className="text-xs text-slate-400 truncate">{r.erro}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {!enviando && (
              <>
                <Button variant="outline" onClick={onClose} className="flex-1">Fechar</Button>
                <Button
                  onClick={iniciar}
                  disabled={carregandoClientes}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-2" /> Iniciar disparo
                </Button>
              </>
            )}
            {enviando && (
              <Button variant="destructive" className="flex-1" onClick={() => { cancelRef.current = true; toast.info('Envio interrompido.'); }}>
                <X className="w-4 h-4 mr-2" /> Interromper
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}