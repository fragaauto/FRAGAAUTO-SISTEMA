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
    const body = await resp.text();
    throw new Error(`Evolution API erro ${resp.status}: ${body}`);
  }
  return await resp.json();
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar configurações
    const configs = await base44.asServiceRole.entities.Configuracao.list();
    const config = configs[0];

    const evolutionOk = config?.evolution_api_url && config?.evolution_api_key && config?.evolution_instance;
    if (!evolutionOk) {
      return Response.json({ error: 'Evolution API não configurada' }, { status: 400 });
    }

    const evolutionBase = config.evolution_api_url.replace(/\/$/, '');

    // Buscar campanhas agendadas
    const agora = new Date();
    const campanhas = await base44.asServiceRole.entities.Campanha.list();
    const agendadas = campanhas.filter(c => {
      if (c.status !== 'agendada') return false;
      if (!c.dataAgendada) return false;
      const dataAgenda = new Date(c.dataAgendada);
      // Disparar se a data agendada já passou (com margem de 5 min)
      const diff = agora - dataAgenda;
      return diff >= 0 && diff <= 5 * 60 * 1000;
    });

    if (agendadas.length === 0) {
      return Response.json({ message: 'Nenhuma campanha para disparar neste momento' });
    }

    let totalEnviados = 0;
    const resultados = [];

    for (const campanha of agendadas) {
      // Atualizar status para "enviando"
      await base44.asServiceRole.entities.Campanha.update(campanha.id, { status: 'enviando' });

      const contatos = campanha.listaContatos || [];
      let sucessos = 0;
      let erros = 0;

      for (const contato of contatos) {
        if (contato.status !== 'pendente') continue;

        const tel = (contato.telefone || '').replace(/\D/g, '');
        if (!tel) continue;

        // Personalizar mensagem
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
          sucessos++;
          // Atualizar status do contato
          const novaLista = campanha.listaContatos.map(c => 
            c.clienteId === contato.clienteId ? { ...c, status: 'enviado' } : c
          );
          await base44.asServiceRole.entities.Campanha.update(campanha.id, { listaContatos: novaLista });
        } catch (e) {
          erros++;
          console.error(`Erro ao enviar para ${contato.clienteNome}:`, e);
        }

        // Intervalo entre envios (15-25s)
        const intervalo = 15 + Math.floor(Math.random() * 11);
        await sleep(intervalo * 1000);
      }

      totalEnviados += sucessos;

      // Atualizar campanha como finalizada
      await base44.asServiceRole.entities.Campanha.update(campanha.id, {
        status: 'finalizada',
        totalEnviados: sucessos
      });

      resultados.push({
        campanha: campanha.nomeCampanha,
        enviados: sucessos,
        erros
      });
    }

    return Response.json({
      success: true,
      campanhas: agendadas.length,
      totalEnviados,
      resultados
    });

  } catch (error) {
    console.error('Erro ao disparar campanhas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});