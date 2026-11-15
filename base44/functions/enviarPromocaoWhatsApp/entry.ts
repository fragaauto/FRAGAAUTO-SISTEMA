import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

function formatarNumero(telefone) {
  let numero = String(telefone || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return numero;
}

async function enviarTexto(baseUrl, apiKey, instance, numero, texto) {
  const resp = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify({ number: numero, text: texto }),
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`Evolution API retornou ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function enviarImagem(baseUrl, apiKey, instance, numero, imagemUrl, legenda) {
  const resp = await fetch(`${baseUrl}/message/sendMedia/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify({ number: numero, mediatype: 'image', media: imagemUrl, caption: legenda || '' }),
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`Evolution API retornou ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function enviarAudio(baseUrl, apiKey, instance, numero, audioUrl) {
  const resp = await fetch(`${baseUrl}/message/sendWhatsAppAudio/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify({ number: numero, audio: audioUrl }),
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`Evolution API retornou ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { telefone, mensagem, imagemUrl, audioUrl, unidade_id } = body.payload ?? body;

    if (!telefone) return Response.json({ error: 'Telefone é obrigatório.' }, { status: 400 });
    if (!mensagem && !audioUrl) return Response.json({ error: 'Mensagem é obrigatória.' }, { status: 400 });

    const configs = await base44.asServiceRole.entities.Configuracao.list();
    let config = unidade_id ? configs.find((c) => c.unidade_id === unidade_id) : null;
    if (!config?.evolution_api_url) {
      config = configs.find((c) => c.evolution_api_url && c.evolution_api_key && c.evolution_instance);
    }
    if (!config?.evolution_api_url || !config?.evolution_api_key || !config?.evolution_instance) {
      return Response.json({
        error: 'Evolution API não configurada. Acesse Configurações e preencha os dados da Evolution API.',
      }, { status: 400 });
    }

    const baseUrl = config.evolution_api_url.replace(/\/$/, '');
    const numero = formatarNumero(telefone);

    if (imagemUrl) {
      await enviarImagem(baseUrl, config.evolution_api_key, config.evolution_instance, numero, imagemUrl, mensagem);
    }
    if (audioUrl) {
      await enviarAudio(baseUrl, config.evolution_api_key, config.evolution_instance, numero, audioUrl);
    }
    if (!imagemUrl && mensagem) {
      await enviarTexto(baseUrl, config.evolution_api_key, config.evolution_instance, numero, mensagem);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message });
  }
}