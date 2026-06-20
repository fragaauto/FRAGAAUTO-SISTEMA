import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { addDays } from 'npm:date-fns@3.6.0';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function enviarViaEvolution(baseUrl, apiKey, instance, telefone, mensagem) {
  let numero = telefone.replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;

  const resp = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify({ number: numero, text: mensagem }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Evolution API ${resp.status}: ${body}`);
  }
  return await resp.json();
}

function gerarMensagem(item, config) {
  const diasValidade = config.dias_validade_oferta || 7;
  const dataValidade = addDays(new Date(), diasValidade).toLocaleDateString('pt-BR');
  const listaServicos = (item.servicosPendentes || [])
    .map(s => `• ${s.nome} - R$ ${(s.valor_total || 0).toFixed(2)}`).join('\n');
  const total = (item.valorTotalPendentes || 0).toFixed(2);

  let msg = config.mensagem_remarketing
    ? config.mensagem_remarketing
    : `Olá {nome} 👋\n\nNa sua última visita identificamos que no seu {veiculo} ficou pendente:\n\n{lista_servicos}\n\nTotal: R$ {total}\n\nTenho uma condição especial pra você!\n\n{oferta}\nCondição: {condicao}\n\nConsigo manter até {data_validade}.\n\nPosso agendar para você?`;

  return msg
    .replace('{nome}', item.clienteNome || 'Cliente')
    .replace('{veiculo}', `${item.placa || ''} - ${item.modelo || ''}`.trim().replace(/^-\s*/, ''))
    .replace('{lista_servicos}', listaServicos)
    .replace('{total}', total)
    .replace('{oferta}', config.oferta_padrao_remarketing || '⭐ Condição especial disponível')
    .replace('{condicao}', config.condicao_pagamento_remarketing || 'A combinar')
    .replace('{data_validade}', dataValidade)
    .replace('{nome_empresa}', config.nome_empresa || 'nossa empresa');
}

// Tamanho do lote por execução (para caber no timeout de ~180s com intervalos de 15-25s)
// 5 contatos * 25s max = 125s — seguro
const LOTE_TAMANHO = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // O SDK V3 pode encapsular os parâmetros em body.payload
    const { ids, intervaloMin = 15, intervaloMax = 25, unidade_id } = body.payload ?? body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'Lista de IDs obrigatória' }, { status: 400 });
    }

    // Usa asServiceRole para garantir acesso a todas as configs (independente de unidade/RLS)
    const configs = await base44.asServiceRole.entities.Configuracao.list();

    // Tenta pegar config da unidade específica, senão pega qualquer config que tenha Evolution configurada
    let config = unidade_id ? configs.find(c => c.unidade_id === unidade_id) : null;
    if (!config?.evolution_api_url) {
      config = configs.find(c => c.evolution_api_url && c.evolution_api_key && c.evolution_instance);
    }

    if (!config?.evolution_api_url || !config?.evolution_api_key || !config?.evolution_instance) {
      return Response.json({ error: 'Evolution API não configurada. Configure em Configurações > Integrações.' }, { status: 400 });
    }

    const evolutionBase = config.evolution_api_url.replace(/\/$/, '');

    // Busca os itens da fila pendentes
    const todos = await base44.asServiceRole.entities.RemarketingFila.list();
    const itensPendentes = todos.filter(item => ids.includes(item.id) && item.status === 'pendente');

    if (itensPendentes.length === 0) {
      return Response.json({ ok: true, message: 'Nenhum item pendente para enviar', processados: 0, total: 0 });
    }

    // Pega o lote
    const lote = itensPendentes.slice(0, LOTE_TAMANHO);
    const resultados = [];

    for (let i = 0; i < lote.length; i++) {
      const item = lote[i];
      const tel = (item.clienteTelefone || '').replace(/\D/g, '');

      if (!tel) {
        resultados.push({ id: item.id, ok: false, erro: 'Telefone inválido' });
        continue;
      }

      const mensagem = gerarMensagem(item, config);

      try {
        await enviarViaEvolution(evolutionBase, config.evolution_api_key, config.evolution_instance, tel, mensagem);

        // Atualiza status para 'enviado' na fila
        await base44.asServiceRole.entities.RemarketingFila.update(item.id, {
          status: 'enviado',
          dataUltimoEnvio: new Date().toISOString(),
          tentativas: (item.tentativas || 0) + 1,
          logEnvios: [...(item.logEnvios || []), { data: new Date().toISOString(), status: 'enviado', mensagem: mensagem.substring(0, 100) }]
        });

        resultados.push({ id: item.id, nome: item.clienteNome, ok: true });
      } catch (e) {
        await base44.asServiceRole.entities.RemarketingFila.update(item.id, {
          tentativas: (item.tentativas || 0) + 1,
          logEnvios: [...(item.logEnvios || []), { data: new Date().toISOString(), status: 'erro', erro: e.message }]
        });
        resultados.push({ id: item.id, nome: item.clienteNome, ok: false, erro: e.message });
      }

      // Intervalo entre envios
      if (i < lote.length - 1) {
        const min = Math.min(intervaloMin, intervaloMax);
        const max = Math.max(intervaloMin, intervaloMax);
        const seg = min + Math.floor(Math.random() * (max - min + 1));
        await sleep(seg * 1000);
      }
    }

    const aindaPendentes = itensPendentes.length - lote.length;
    const enviados = resultados.filter(r => r.ok).length;

    return Response.json({
      ok: true,
      processados: lote.length,
      enviados,
      erros: lote.length - enviados,
      aindaPendentes,
      resultados
    });

  } catch (error) {
    console.error('Erro disparo em massa:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});