import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Função utilitária para enviar mensagem via Evolution API
async function enviarViaEvolution(url, apiKey, instance, telefone, mensagem) {
  const baseUrl = url.replace(/\/$/, '');

  // Formatar número: garantir que começa com 55 (Brasil)
  let numero = telefone.replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) {
    numero = `55${numero}`;
  }

  const resp = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
    body: JSON.stringify({
      number: numero,
      text: mensagem,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Evolution API retornou ${resp.status}: ${body}`);
  }

  return await resp.json();
}

async function enviarMidiaViaEvolution(url, apiKey, instance, telefone, caption, mediaUrl, tipo) {
  const baseUrl = url.replace(/\/$/, '');
  let numero = telefone.replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;

  let endpoint, body;

  if (tipo === 'audio') {
    endpoint = `${baseUrl}/message/sendWhatsAppAudio/${instance}`;
    body = { number: numero, audio: mediaUrl };
  } else {
    endpoint = `${baseUrl}/message/sendMedia/${instance}`;
    body = { number: numero, mediatype: 'image', media: mediaUrl, caption };
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const bodyText = await resp.text();
    throw new Error(`Evolution API retornou ${resp.status}: ${bodyText}`);
  }

  // Se tem áudio, envia também o texto após
  if (tipo === 'audio' && caption) {
    await enviarViaEvolution(url, apiKey, instance, telefone, caption);
  }

  return await resp.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { telefone, mensagem, midiaUrl, midiaTipo } = await req.json();

    if (!telefone || !mensagem) {
      return Response.json({ error: 'Telefone e mensagem são obrigatórios.' }, { status: 400 });
    }

    // Buscar configurações da Evolution API
    const configs = await base44.entities.Configuracao.list();
    const config = configs[0];

    if (!config?.evolution_api_url || !config?.evolution_api_key || !config?.evolution_instance) {
      return Response.json({
        error: 'Evolution API não configurada. Acesse Configurações e preencha os dados da Evolution API.'
      }, { status: 400 });
    }

    let resultado;

    if (midiaUrl && midiaTipo) {
      resultado = await enviarMidiaViaEvolution(
        config.evolution_api_url,
        config.evolution_api_key,
        config.evolution_instance,
        telefone,
        mensagem,
        midiaUrl,
        midiaTipo
      );
    } else {
      resultado = await enviarViaEvolution(
        config.evolution_api_url,
        config.evolution_api_key,
        config.evolution_instance,
        telefone,
        mensagem
      );
    }

    return Response.json({ ok: true, resultado });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});