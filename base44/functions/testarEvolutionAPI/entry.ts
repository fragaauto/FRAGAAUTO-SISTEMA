import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (!user) return Response.json({ ok: false, mensagem: 'Não autenticado. Faça login e tente novamente.' });

    const { url, apiKey, instance } = await req.json();

    if (!url || !apiKey || !instance) {
      return Response.json({
        ok: false,
        mensagem: 'Preencha todos os campos antes de testar.',
        detalhes: [
          !url && '• URL da API está vazia.',
          !apiKey && '• API Key está vazia.',
          !instance && '• Nome da instância está vazio.',
        ].filter(Boolean).join('\n')
      });
    }

    const baseUrl = url.replace(/\/$/, '');

    // 1. Verificar se a API responde (timeout de 10s)
    let apiResp;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      apiResp = await fetch(`${baseUrl}/instance/fetchInstances`, {
        headers: { 'apikey': apiKey },
        signal: controller.signal
      });
      clearTimeout(timeout);
    } catch (e) {
      if (e.name === 'AbortError') {
        return Response.json({
          ok: false,
          mensagem: 'Tempo esgotado ao conectar à Evolution API.',
          detalhes: 'A API não respondeu em 10 segundos. Verifique se a URL está correta e o servidor está acessível.'
        });
      }
      return Response.json({
        ok: false,
        mensagem: 'Não foi possível conectar à URL informada.',
        detalhes: `Verifique se a URL está correta e acessível.\nDetalhe: ${e.message}`
      });
    }

    if (apiResp.status === 401 || apiResp.status === 403) {
      return Response.json({
        ok: false,
        mensagem: 'API Key inválida ou sem permissão.',
        detalhes: 'Verifique a API Key global nas configurações da Evolution API.'
      });
    }

    if (!apiResp.ok) {
      const errText = await apiResp.text().catch(() => '');
      return Response.json({
        ok: false,
        mensagem: `A API respondeu com erro HTTP ${apiResp.status}.`,
        detalhes: `Verifique se a URL está correta e se o servidor está rodando.\n${errText.slice(0, 200)}`
      });
    }

    // 2. Ler resposta como texto e depois parsear (evita erro se resposta não for JSON)
    const responseText = await apiResp.text();
    let instances;
    try {
      instances = JSON.parse(responseText);
    } catch (e) {
      return Response.json({
        ok: false,
        mensagem: 'A API não retornou JSON válido.',
        detalhes: `Resposta recebida: ${responseText.slice(0, 300)}`
      });
    }

    const lista = Array.isArray(instances) ? instances : (instances.data || []);

    // 3. Verificar se a instância existe
    const instanceFound = lista.find(i => i.name === instance || i.instance?.instanceName === instance);

    if (!instanceFound) {
      const nomes = lista.map(i => i.name || i.instance?.instanceName).filter(Boolean).join(', ') || 'nenhuma encontrada';
      return Response.json({
        ok: false,
        mensagem: `Instância "${instance}" não encontrada.`,
        detalhes: `Instâncias disponíveis: ${nomes}\n\nVerifique o nome exato da instância.`
      });
    }

    // 4. Verificar status da instância
    const status = instanceFound.connectionStatus || instanceFound.instance?.connectionStatus || instanceFound.state;

    if (status && status !== 'open' && status !== 'connected') {
      return Response.json({
        ok: false,
        mensagem: `Instância encontrada mas não está conectada ao WhatsApp.`,
        detalhes: `Status atual: "${status}"\n\nAcesse o painel da Evolution API e conecte via QR Code.`
      });
    }

    return Response.json({
      ok: true,
      mensagem: `✅ Conexão OK! Instância "${instance}" conectada ao WhatsApp.`,
      detalhes: `Status: ${status || 'conectado'}`
    });

  } catch (error) {
    return Response.json({
      ok: false,
      mensagem: 'Erro inesperado ao testar conexão.',
      detalhes: error.message
    });
  }
});