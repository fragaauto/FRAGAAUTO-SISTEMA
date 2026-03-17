import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function enviarMensagemEvolution(baseUrl, apiKey, instance, telefone, mensagem, midiaUrl, midiaTipo) {
  let numero = telefone.replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) {
    numero = `55${numero}`;
  }

  const endpoint = midiaUrl 
    ? (midiaTipo === 'audio' ? '/message/sendAudio' : '/message/sendMedia')
    : '/message/sendText';

  const body = midiaUrl 
    ? (midiaTipo === 'audio' 
        ? { number: numero, audio: midiaUrl, caption: mensagem }
        : { number: numero, mediaUrl: midiaUrl, caption: mensagem })
    : { number: numero, text: mensagem };

  const resp = await fetch(`${baseUrl}${endpoint}/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const bodyText = await resp.text();
    throw new Error(`Evolution API erro ${resp.status}: ${bodyText}`);
  }
  return await resp.json();
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Lote máximo por execução para não exceder timeout
const LOTE_TAMANHO = 10;
// Intervalo entre envios (segundos)
const INTERVALO_MIN = 15;
const INTERVALO_MAX = 25;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const configs = await base44.asServiceRole.entities.Configuracao.list();
    const config = configs[0];

    const evolutionOk = config?.evolution_api_url && config?.evolution_api_key && config?.evolution_instance;
    if (!evolutionOk) {
      return Response.json({ error: 'Evolution API não configurada' }, { status: 400 });
    }

    const evolutionBase = config.evolution_api_url.replace(/\/$/, '');

    const agora = new Date();
    const campanhas = await base44.asServiceRole.entities.Campanha.list();

    // Busca campanhas agendadas (ainda não iniciadas) cujo horário já chegou
    const paraIniciar = campanhas.filter(c => {
      if (c.status !== 'agendada') return false;
      if (!c.dataAgendada) return false;
      const dataAgenda = new Date(c.dataAgendada);
      return agora >= dataAgenda;
    });

    // Busca campanhas em andamento (enviando) que ainda têm contatos pendentes (e não foram canceladas)
    const emAndamento = campanhas.filter(c => c.status === 'enviando');

    // Todas as campanhas que precisam de processamento
    const paraProcessar = [...paraIniciar, ...emAndamento];

    if (paraProcessar.length === 0) {
      return Response.json({ message: 'Nenhuma campanha para disparar neste momento' });
    }

    let totalEnviadosNestaChamada = 0;
    const resultados = [];

    for (const campanha of paraProcessar) {
      // Re-busca a campanha para checar se foi cancelada entre o início e agora
      const campanhaAtual = await base44.asServiceRole.entities.Campanha.get(campanha.id);
      if (!campanhaAtual || campanhaAtual.status === 'cancelada' || campanhaAtual.status === 'finalizada') {
        resultados.push({ campanha: campanha.nomeCampanha, mensagem: `Ignorada (status: ${campanhaAtual?.status})` });
        continue;
      }

      // Marca como enviando se ainda estava agendada
      if (campanhaAtual.status === 'agendada') {
        await base44.asServiceRole.entities.Campanha.update(campanha.id, { status: 'enviando' });
      }

      const contatos = campanha.listaContatos || [];
      const pendentes = contatos.filter(c => c.status === 'pendente');

      if (pendentes.length === 0) {
        // Todos já foram enviados — finaliza
        await base44.asServiceRole.entities.Campanha.update(campanha.id, {
          status: 'finalizada',
          totalEnviados: contatos.filter(c => c.status === 'enviado').length
        });
        resultados.push({ campanha: campanha.nomeCampanha, mensagem: 'Finalizada (sem pendentes)' });
        continue;
      }

      // Processa apenas LOTE_TAMANHO contatos nesta execução
      const lote = pendentes.slice(0, LOTE_TAMANHO);
      let sucessosLote = 0;
      let errosLote = 0;

      // Copia lista atual para modificar
      let listaAtual = [...contatos];

      for (let i = 0; i < lote.length; i++) {
        const contato = lote[i];
        const tel = (contato.telefone || '').replace(/\D/g, '');
        if (!tel) {
          listaAtual = listaAtual.map(c =>
            c.clienteId === contato.clienteId ? { ...c, status: 'erro' } : c
          );
          errosLote++;
          continue;
        }

        const msg = (campanha.mensagemBase || '')
          .replace('{nome}', contato.clienteNome || 'Cliente')
          .replace('{veiculo}', contato.veiculo || '')
          .replace('{placa}', contato.veiculo?.split(' - ')[0] || '')
          .replace('{ultimo_servico}', contato.ultimoServico || '');

        try {
          await enviarMensagemEvolution(
            evolutionBase,
            config.evolution_api_key,
            config.evolution_instance,
            tel,
            msg,
            campanha.midiaUrl || null,
            campanha.midiaTipo || null
          );
          sucessosLote++;
          listaAtual = listaAtual.map(c =>
            c.clienteId === contato.clienteId ? { ...c, status: 'enviado' } : c
          );
        } catch (e) {
          errosLote++;
          console.error(`Erro ao enviar para ${contato.clienteNome}:`, e.message);
          listaAtual = listaAtual.map(c =>
            c.clienteId === contato.clienteId ? { ...c, status: 'erro' } : c
          );
        }

        totalEnviadosNestaChamada++;

        // Intervalo entre envios (exceto no último do lote)
        if (i < lote.length - 1) {
          const intervalo = INTERVALO_MIN + Math.floor(Math.random() * (INTERVALO_MAX - INTERVALO_MIN + 1));
          await sleep(intervalo * 1000);
        }
      }

      // Salva progresso
      const aindaPendentes = listaAtual.filter(c => c.status === 'pendente').length;
      const totalEnviados = listaAtual.filter(c => c.status === 'enviado').length;

      if (aindaPendentes === 0) {
        // Concluído!
        await base44.asServiceRole.entities.Campanha.update(campanha.id, {
          listaContatos: listaAtual,
          status: 'finalizada',
          totalEnviados
        });
        resultados.push({
          campanha: campanha.nomeCampanha,
          enviados: sucessosLote,
          erros: errosLote,
          status: 'finalizada'
        });
      } else {
        // Ainda tem pendentes — salva progresso e continua na próxima execução
        await base44.asServiceRole.entities.Campanha.update(campanha.id, {
          listaContatos: listaAtual,
          totalEnviados
        });
        resultados.push({
          campanha: campanha.nomeCampanha,
          enviadosNesteLote: sucessosLote,
          errosNesteLote: errosLote,
          aindaPendentes,
          status: 'em_andamento'
        });
      }
    }

    return Response.json({
      success: true,
      campanhasProcessadas: paraProcessar.length,
      totalEnviadosNestaChamada,
      resultados
    });

  } catch (error) {
    console.error('Erro ao disparar campanhas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});