import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Send, Users, Save, Loader2, Play, CheckCircle2, XCircle, AlertTriangle, X, Clock, Image, Music, Trash2, Pause, SkipForward } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VARIAVEIS = ['{nome}', '{veiculo}', '{ultimo_servico}', '{placa}'];

export default function CampanhaModal({ campanha, atendimentos, clientes = [], onClose, onSaved }) {
  const [nome, setNome] = useState(campanha?.nomeCampanha || '');
  const [mensagem, setMensagem] = useState(campanha?.mensagemBase || 'Olá {nome} 👋\n\nGostaria de te oferecer uma condição especial para o seu {veiculo}.\n\nPosso te ajudar?');
  const [contatosSelecionados, setContatosSelecionados] = useState(campanha?.listaContatos?.map(c => c.clienteId) || []);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCodigoMin, setFiltroCodigoMin] = useState('');
  const [filtroCodigoMax, setFiltroCodigoMax] = useState('');
  const [filtroNascimentoInicio, setFiltroNascimentoInicio] = useState('');
  const [filtroNascimentoFim, setFiltroNascimentoFim] = useState('');
  const [ordenacao, setOrdenacao] = useState('codigo');
  const [filtroLetra, setFiltroLetra] = useState('');
  const [midiaUrl, setMidiaUrl] = useState(campanha?.midiaUrl || '');
  const [midiaTipo, setMidiaTipo] = useState(campanha?.midiaTipo || '');
  const [midiaUploadando, setMidiaUploadando] = useState(false);
  const fileInputRef = useRef(null);
  const [intervaloMin, setIntervaloMin] = useState(15);
  const [intervaloMax, setIntervaloMax] = useState(25);
  const [pausaAtivada, setPausaAtivada] = useState(false);
  const [pausarACada, setPausarACada] = useState(10);
  const [duracaoPausa, setDuracaoPausa] = useState(5);
  const [enviando, setEnviando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [contagemRegressiva, setContagemRegressiva] = useState(0);
  const [resultados, setResultados] = useState([]);
  const [indiceAtual, setIndiceAtual] = useState(-1);
  const [cancelado, setCancelado] = useState(false);
  const pausadoRef = useRef(false);
  const canceladoRef = useRef(false);

  const contatosDisponiveis = useMemo(() => {
    // Prioriza contatos do cadastro de clientes (não bloqueados)
    const map = {};

    // 1. Adiciona clientes cadastrados (não bloqueados)
    clientes.filter(c => !c.bloqueado && c.telefone).forEach(c => {
      map[c.id] = {
        clienteId: c.id,
        clienteNome: c.nome || 'Sem nome',
        telefone: c.telefone,
        veiculo: '',
        ultimoServico: '',
        atendimentoId: ''
      };
    });

    // 2. Complementa com dados de atendimentos (veículo e último serviço), mas não adiciona bloqueados
    const bloqueadosTelefones = new Set(clientes.filter(c => c.bloqueado).map(c => c.telefone).filter(Boolean));
    atendimentos.forEach(at => {
      if (!at.cliente_telefone) return;
      if (bloqueadosTelefones.has(at.cliente_telefone)) return;
      const chave = at.cliente_id || at.cliente_nome;
      if (map[chave]) {
        // Atualiza veiculo e ultimo servico se ja existe
        if (!map[chave].veiculo && at.placa) map[chave].veiculo = `${at.placa} - ${at.modelo}`;
        if (!map[chave].ultimoServico && at.queixa_inicial) map[chave].ultimoServico = at.queixa_inicial;
      } else {
        // Adiciona se não estava no cadastro de clientes
        map[chave] = {
          clienteId: chave,
          clienteNome: at.cliente_nome || 'Sem nome',
          telefone: at.cliente_telefone,
          veiculo: `${at.placa} - ${at.modelo}`,
          ultimoServico: at.queixa_inicial || '',
          atendimentoId: at.id
        };
      }
    });

    return Object.values(map);
  }, [atendimentos, clientes]);

  const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const handleMidiaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isAudio = file.type.startsWith('audio/');
    const isImagem = file.type.startsWith('image/');
    if (!isAudio && !isImagem) { toast.error('Apenas imagens ou áudios são suportados'); return; }
    setMidiaUploadando(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMidiaUrl(file_url);
      setMidiaTipo(isAudio ? 'audio' : 'image');
      toast.success('Arquivo enviado!');
    } catch (e) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setMidiaUploadando(false);
    }
  };

  const contatosFiltrados = contatosDisponiveis.filter(c => {
    if (filtroLetra && !c.clienteNome.toUpperCase().startsWith(filtroLetra)) return false;
    if (filtroNome && !c.clienteNome.toLowerCase().includes(filtroNome.toLowerCase())) return false;
    if (filtroTipo !== 'todos') {
      const clienteObj = clientes.find(cl => cl.id === c.clienteId);
      if (!clienteObj) return filtroTipo !== 'cadastrado';
      if (filtroTipo === 'fisica' && clienteObj.tipo_pessoa !== 'fisica') return false;
      if (filtroTipo === 'juridica' && clienteObj.tipo_pessoa !== 'juridica') return false;
    }
    if (filtroCodigoMin !== '') {
      const clienteObj = clientes.find(cl => cl.id === c.clienteId);
      if (!clienteObj?.codigo || clienteObj.codigo < Number(filtroCodigoMin)) return false;
    }
    if (filtroCodigoMax !== '') {
      const clienteObj = clientes.find(cl => cl.id === c.clienteId);
      if (!clienteObj?.codigo || clienteObj.codigo > Number(filtroCodigoMax)) return false;
    }
    // Filtro de aniversário: compara apenas dia e mês (ignora o ano)
    if (filtroNascimentoInicio || filtroNascimentoFim) {
      const clienteObj = clientes.find(cl => cl.id === c.clienteId);
      const nasc = clienteObj?.data_nascimento;
      if (!nasc) return false;
      const nascDate = new Date(nasc + 'T00:00:00');
      // Monta datas de comparação com o mesmo ano base para comparar só dia/mês
      const anoBase = 2000;
      const nascMD = new Date(anoBase, nascDate.getMonth(), nascDate.getDate());
      if (filtroNascimentoInicio) {
        const [yI, mI, dI] = filtroNascimentoInicio.split('-').map(Number);
        const inicio = new Date(anoBase, mI - 1, dI);
        if (nascMD < inicio) return false;
      }
      if (filtroNascimentoFim) {
        const [yF, mF, dF] = filtroNascimentoFim.split('-').map(Number);
        const fim = new Date(anoBase, mF - 1, dF);
        if (nascMD > fim) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (ordenacao === 'alfabetica') return a.clienteNome.localeCompare(b.clienteNome, 'pt-BR');
    if (ordenacao === 'nascimento') {
      const ca = clientes.find(cl => cl.id === a.clienteId);
      const cb = clientes.find(cl => cl.id === b.clienteId);
      const da = ca?.data_nascimento || '';
      const db = cb?.data_nascimento || '';
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    }
    // default: codigo
    const ca = clientes.find(cl => cl.id === a.clienteId);
    const cb = clientes.find(cl => cl.id === b.clienteId);
    return (ca?.codigo || 0) - (cb?.codigo || 0);
  });

  const todosFiltradosSelecionados = contatosFiltrados.length > 0 && contatosFiltrados.every(c => contatosSelecionados.includes(c.clienteId));

  const toggleTodosFiltrados = () => {
    if (todosFiltradosSelecionados) {
      setContatosSelecionados(prev => prev.filter(id => !contatosFiltrados.find(c => c.clienteId === id)));
    } else {
      const novoIds = contatosFiltrados.map(c => c.clienteId).filter(id => !contatosSelecionados.includes(id));
      setContatosSelecionados(prev => [...prev, ...novoIds]);
    }
  };

  const toggleContato = (id) => setContatosSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selecionarTodos = () => setContatosSelecionados(contatosFiltrados.map(c => c.clienteId));
  const deselecionarTodos = () => setContatosSelecionados([]);

  const saveMutation = useMutation({
    mutationFn: (data) => campanha?.id ? base44.entities.Campanha.update(campanha.id, data) : base44.entities.Campanha.create(data),
    onSuccess: () => { toast.success(campanha?.id ? 'Campanha atualizada!' : 'Campanha criada!'); onSaved(); }
  });

  const updateCampanhaMutation = useMutation({
    mutationFn: (data) => base44.entities.Campanha.update(campanha?.id, data)
  });

  const handleSave = (statusCampanha = 'rascunho') => {
    if (!nome.trim()) { toast.error('Informe o nome da campanha'); return; }
    const listaContatos = contatosSelecionados.map(id => {
      const c = contatosDisponiveis.find(x => x.clienteId === id);
      return c ? { ...c, status: 'pendente' } : null;
    }).filter(Boolean);
    saveMutation.mutate({ nomeCampanha: nome, mensagemBase: mensagem, midiaUrl, midiaTipo, listaContatos, status: statusCampanha, totalEnviados: campanha?.totalEnviados || 0, totalRespondidos: campanha?.totalRespondidos || 0, totalConvertidos: campanha?.totalConvertidos || 0 });
  };

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const gerarMensagemPersonalizada = (contato) => {
    return mensagem
      .replace('{nome}', contato.clienteNome || 'Cliente')
      .replace('{veiculo}', contato.veiculo || '')
      .replace('{placa}', contato.veiculo?.split(' - ')[0] || '')
      .replace('{ultimo_servico}', contato.ultimoServico || '');
  };

  const togglePausaManual = () => {
    if (pausadoRef.current) {
      pausadoRef.current = false;
      setPausado(false);
      setContagemRegressiva(0);
      toast.success('Retomando envios...');
    } else {
      pausadoRef.current = true;
      setPausado(true);
      toast.info('Envio pausado manualmente. Clique em Retomar para continuar.');
    }
  };

  const iniciarEnvioMassa = async () => {
    if (contatosSelecionados.length === 0) { toast.error('Selecione ao menos um contato'); return; }
    setEnviando(true);
    setCancelado(false);
    setPausado(false);
    setResultados([]);
    canceladoRef.current = false;
    pausadoRef.current = false;

    const contatos = contatosSelecionados.map(id => contatosDisponiveis.find(c => c.clienteId === id)).filter(Boolean);
    let enviadosNesteLote = 0;

    for (let i = 0; i < contatos.length; i++) {
      if (canceladoRef.current) break;

      // Aguarda se pausado manualmente
      while (pausadoRef.current && !canceladoRef.current) {
        await sleep(500);
      }
      if (canceladoRef.current) break;

      const contato = contatos[i];
      setIndiceAtual(i);

      const tel = (contato.telefone || '').replace(/\D/g, '');
      if (!tel) {
        setResultados(prev => [...prev, { id: contato.clienteId, nome: contato.clienteNome, ok: false, erro: 'Telefone inválido' }]);
        continue;
      }

      const msg = gerarMensagemPersonalizada(contato);
      try {
        const res = await base44.functions.invoke('enviarMensagemWhatsApp', { telefone: tel, mensagem: msg, midiaUrl: midiaUrl || null, midiaTipo: midiaTipo || null });
        if (res.data?.ok) {
          setResultados(prev => [...prev, { id: contato.clienteId, nome: contato.clienteNome, ok: true }]);
        } else {
          const errMsg = res.data?.error || 'Erro desconhecido';
          const semWhatsapp = errMsg.includes('exists":false') || errMsg.toLowerCase().includes('not registered');
          setResultados(prev => [...prev, { id: contato.clienteId, nome: contato.clienteNome, ok: false, semWhatsapp, erro: semWhatsapp ? 'Sem WhatsApp' : errMsg }]);
        }
      } catch (e) {
        setResultados(prev => [...prev, { id: contato.clienteId, nome: contato.clienteNome, ok: false, erro: e.message }]);
      }

      enviadosNesteLote++;

      // Pausa automática a cada X envios
      const ehUltimo = i === contatos.length - 1;
      if (!ehUltimo && !canceladoRef.current) {
        if (pausaAtivada && enviadosNesteLote >= pausarACada) {
          enviadosNesteLote = 0;
          const totalSegundos = duracaoPausa * 60;
          toast.info(`Pausa automática: aguardando ${duracaoPausa} min antes de continuar...`);
          for (let s = totalSegundos; s > 0; s--) {
            if (canceladoRef.current) break;
            // Pula pausa automática se usuário pausou/retomou manualmente
            while (pausadoRef.current && !canceladoRef.current) { await sleep(500); }
            setContagemRegressiva(s);
            await sleep(1000);
          }
          setContagemRegressiva(0);
          if (!canceladoRef.current) toast.success('Retomando envios...');
        } else {
          // Intervalo normal entre envios
          const min = Math.min(intervaloMin, intervaloMax);
          const max = Math.max(intervaloMin, intervaloMax);
          const segundos = min + Math.floor(Math.random() * (max - min + 1));
          for (let s = 0; s < segundos; s++) {
            if (canceladoRef.current) break;
            while (pausadoRef.current && !canceladoRef.current) { await sleep(500); }
            await sleep(1000);
          }
        }
      }
    }

    setEnviando(false);
    setPausado(false);
    pausadoRef.current = false;
    setContagemRegressiva(0);
    setIndiceAtual(-1);
  };

  const progresso = contatosSelecionados.length > 0 ? Math.round((resultados.length / contatosSelecionados.length) * 100) : 0;
  const finalizado = contatosSelecionados.length > 0 && resultados.length === contatosSelecionados.length;
  const sucessos = resultados.filter(r => r.ok).length;
  const erros = resultados.filter(r => !r.ok).length;

  const inserirVariavel = (v) => setMensagem(prev => prev + v);

  return (
    <Dialog open onOpenChange={!enviando ? onClose : undefined}>
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
                  <Button key={v} size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => inserirVariavel(v)}>{v}</Button>
                ))}
              </div>
            </div>
            <Textarea value={mensagem} onChange={e => setMensagem(e.target.value)} className="min-h-[150px]" />
            <p className="text-xs text-slate-400 mt-1">Use as variáveis acima para personalizar automaticamente</p>
          </div>

          {/* Mídia */}
          <div>
            <Label className="mb-2 block">📎 Anexar Imagem ou Áudio <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            {midiaUrl ? (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-slate-50">
                {midiaTipo === 'audio' ? <Music className="w-4 h-4 text-blue-500" /> : <Image className="w-4 h-4 text-green-500" />}
                <span className="text-xs text-slate-600 flex-1 truncate">{midiaTipo === 'audio' ? 'Áudio anexado' : 'Imagem anexada'}</span>
                {midiaTipo === 'image' && <img src={midiaUrl} alt="" className="h-10 w-10 object-cover rounded" />}
                <Button size="sm" variant="ghost" onClick={() => { setMidiaUrl(''); setMidiaTipo(''); }}>
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,audio/*" className="hidden" onChange={handleMidiaUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={midiaUploadando} className="flex-1">
                  {midiaUploadando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Image className="w-4 h-4 mr-2" />}
                  {midiaUploadando ? 'Enviando...' : 'Selecionar Imagem ou Áudio'}
                </Button>
              </div>
            )}
          </div>

          {/* Intervalo */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <Label className="text-amber-700 font-medium text-sm">Intervalo aleatório entre envios</Label>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-amber-700">De</span>
              <Input type="number" min={5} max={300} value={intervaloMin} onChange={e => setIntervaloMin(Number(e.target.value))} className="w-20" />
              <span className="text-sm text-amber-700">até</span>
              <Input type="number" min={5} max={300} value={intervaloMax} onChange={e => setIntervaloMax(Number(e.target.value))} className="w-20" />
              <span className="text-sm text-amber-700">segundos</span>
            </div>
            <p className="text-xs text-amber-600">⚠️ Intervalo aleatório para parecer mais humano e evitar bloqueios. Estimado: ~{Math.ceil(contatosSelecionados.length * ((intervaloMin + intervaloMax) / 2) / 60)} min.</p>

            {/* Pausa automática */}
            <div className="border-t border-amber-200 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Pause className="w-4 h-4 text-amber-600" />
                <Label className="text-amber-700 font-medium text-sm">Pausa automática</Label>
                <button
                  onClick={() => setPausaAtivada(p => !p)}
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${pausaAtivada ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-400 text-amber-600 hover:bg-amber-100'}`}
                >{pausaAtivada ? 'Ativada' : 'Desativada'}</button>
              </div>
              {pausaAtivada && (
                <div className="flex items-center gap-2 flex-wrap text-sm text-amber-700">
                  <span>Pausar a cada</span>
                  <Input type="number" min={1} max={500} value={pausarACada} onChange={e => setPausarACada(Number(e.target.value))} className="w-16 h-7 text-xs" />
                  <span>envios por</span>
                  <Input type="number" min={1} max={60} value={duracaoPausa} onChange={e => setDuracaoPausa(Number(e.target.value))} className="w-16 h-7 text-xs" />
                  <span>minutos</span>
                </div>
              )}
            </div>
          </div>

          {/* Contatos */}
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
            {/* Filtros */}
            <div className="space-y-2 mb-2">
              <Input placeholder="Filtrar por nome..." value={filtroNome} onChange={e => setFiltroNome(e.target.value)} />
              {/* Filtro por letra */}
              <div className="flex flex-wrap gap-0.5">
                <button
                  onClick={() => setFiltroLetra('')}
                  className={`px-1.5 py-0.5 rounded text-xs font-mono border transition-all ${!filtroLetra ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >Tds</button>
                {LETRAS.map(l => (
                  <button
                    key={l}
                    onClick={() => setFiltroLetra(prev => prev === l ? '' : l)}
                    className={`px-1.5 py-0.5 rounded text-xs font-mono border transition-all ${filtroLetra === l ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >{l}</button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-8 text-xs flex-1 min-w-[120px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="fisica">Pessoa Física</SelectItem>
                    <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 flex-1 min-w-[160px]">
                  <span className="text-xs text-slate-500 whitespace-nowrap">Cód. de</span>
                  <Input type="number" placeholder="Ex: 1" value={filtroCodigoMin} onChange={e => setFiltroCodigoMin(e.target.value)} className="h-8 text-xs w-20" />
                  <span className="text-xs text-slate-500">até</span>
                  <Input type="number" placeholder="Ex: 100" value={filtroCodigoMax} onChange={e => setFiltroCodigoMax(e.target.value)} className="h-8 text-xs w-20" />
                </div>
                {(filtroTipo !== 'todos' || filtroCodigoMin || filtroCodigoMax || filtroNome || filtroNascimentoInicio || filtroNascimentoFim) && (
                  <button onClick={() => { setFiltroNome(''); setFiltroTipo('todos'); setFiltroCodigoMin(''); setFiltroCodigoMax(''); setFiltroNascimentoInicio(''); setFiltroNascimentoFim(''); }} className="text-xs text-slate-400 hover:text-slate-600 px-2">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* Filtro aniversário */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 whitespace-nowrap">🎂 Aniversário entre</span>
                <Input type="date" value={filtroNascimentoInicio} onChange={e => setFiltroNascimentoInicio(e.target.value)} className="h-8 text-xs w-36" />
                <span className="text-xs text-slate-500">e</span>
                <Input type="date" value={filtroNascimentoFim} onChange={e => setFiltroNascimentoFim(e.target.value)} className="h-8 text-xs w-36" />
              </div>
              <div className="flex items-center gap-2" style={{display:'none'}}>{/* spacer fechado */}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">Ordenar por:</span>
                <Select value={ordenacao} onValueChange={setOrdenacao}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="codigo">Código</SelectItem>
                    <SelectItem value="alfabetica">A → Z (nome)</SelectItem>
                    <SelectItem value="nascimento">Data de nascimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              {/* Linha marcar todos */}
              <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border-b">
                <Checkbox
                  checked={todosFiltradosSelecionados && contatosFiltrados.length > 0}
                  onCheckedChange={toggleTodosFiltrados}
                />
                <span className="text-xs font-medium text-slate-600">
                  {todosFiltradosSelecionados ? 'Desmarcar todos' : `Marcar todos (${contatosFiltrados.length})`}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y">
                {contatosFiltrados.map(c => {
                  const clienteObj = clientes.find(cl => cl.id === c.clienteId);
                  return (
                    <div key={c.clienteId} className="flex items-center gap-3 p-2 hover:bg-slate-50">
                      <Checkbox checked={contatosSelecionados.includes(c.clienteId)} onCheckedChange={() => toggleContato(c.clienteId)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {clienteObj?.codigo && (
                            <span className="font-mono text-xs text-slate-400">#{String(clienteObj.codigo).padStart(4, '0')}</span>
                          )}
                          <p className="text-sm font-medium text-slate-800 truncate">{c.clienteNome}</p>
                        </div>
                        <p className="text-xs text-slate-500">{[c.veiculo, c.telefone].filter(Boolean).join(' • ')}</p>
                      </div>
                    </div>
                  );
                })}
                {contatosFiltrados.length === 0 && <p className="text-center py-4 text-slate-500 text-sm">Nenhum contato encontrado</p>}
              </div>
            </div>
            <p className="text-xs text-slate-400">Clientes bloqueados não são exibidos nesta lista.</p>
          </div>

          {/* Progresso do envio */}
          {(enviando || resultados.length > 0) && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{resultados.length} de {contatosSelecionados.length} enviados</span>
                <span>{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-3" />
              {enviando && contagemRegressiva > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <Pause className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700 flex-1">
                    Pausa automática — retomando em <strong>{Math.floor(contagemRegressiva / 60)}:{String(contagemRegressiva % 60).padStart(2, '0')}</strong>
                  </p>
                  <button onClick={() => { setContagemRegressiva(1); }} className="text-xs text-blue-500 hover:text-blue-700 underline whitespace-nowrap">Pular pausa</button>
                </div>
              )}
              {enviando && pausado && contagemRegressiva === 0 && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <Pause className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <p className="text-xs text-yellow-700 flex-1">Envio pausado manualmente.</p>
                </div>
              )}
              {enviando && !pausado && contagemRegressiva === 0 && indiceAtual >= 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Enviando para: {contatosDisponiveis.find(c => c.clienteId === contatosSelecionados[indiceAtual])?.clienteNome}
                </p>
              )}
              {resultados.length > 0 && (
                <div className="flex gap-3">
                  <div className="flex items-center gap-1 text-sm text-green-700 bg-green-50 rounded px-2 py-1">
                    <CheckCircle2 className="w-4 h-4" /> {sucessos} ok
                  </div>
                  <div className="flex items-center gap-1 text-sm text-red-700 bg-red-50 rounded px-2 py-1">
                    <XCircle className="w-4 h-4" /> {erros} erros
                  </div>
                </div>
              )}
              <div className="max-h-36 overflow-y-auto border rounded-lg divide-y">
                {resultados.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    {r.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : r.semWhatsapp ? <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <span className="flex-1 font-medium text-slate-700 truncate">{r.nome}</span>
                    {!r.ok && <span className="text-xs text-slate-400">{r.erro}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2 flex-wrap">
            <Button variant="outline" onClick={onClose} disabled={enviando} className="flex-1">Cancelar</Button>
            {!enviando && !finalizado && (
              <>
                <Button onClick={() => handleSave('rascunho')} variant="outline" className="flex-1" disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />Salvar
                </Button>
                <Button onClick={iniciarEnvioMassa} className="flex-1 bg-green-600 hover:bg-green-700" disabled={contatosSelecionados.length === 0}>
                  <Play className="w-4 h-4 mr-2" />Enviar Agora ({contatosSelecionados.length})
                </Button>
              </>
            )}
            {enviando && (
              <>
                <Button variant="outline" onClick={togglePausaManual} className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50">
                  {pausado ? <><SkipForward className="w-4 h-4 mr-2" /> Retomar</> : <><Pause className="w-4 h-4 mr-2" /> Pausar</>}
                </Button>
                <Button variant="destructive" onClick={() => { canceladoRef.current = true; setCancelado(true); }} className="flex-1">
                  <X className="w-4 h-4 mr-2" /> Interromper
                </Button>
              </>
            )}
            {finalizado && (
              <Button onClick={onClose} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Concluído
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}