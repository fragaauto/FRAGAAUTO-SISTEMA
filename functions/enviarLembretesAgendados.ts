import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function enviarViaEvolution(baseUrl, apiKey, instance, telefone, mensagem) {
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
    body: JSON.stringify({ number: numero, text: mensagem }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Evolution API retornou ${resp.status}: ${body}`);
  }
  return await resp.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const agora = new Date();
    const horaAtual = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    const diaAtual = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay();

    // Buscar configurações
    const configs = await base44.asServiceRole.entities.Configuracao.list();
    const config = configs[0];

    const evolutionOk = config?.evolution_api_url && config?.evolution_api_key && config?.evolution_instance;
    const evolutionBase = evolutionOk ? config.evolution_api_url.replace(/\/$/, '') : null;

    // Buscar lembretes ativos
    const lembretes = await base44.asServiceRole.entities.LembreteWhatsApp.list();
    const ativos = (lembretes || []).filter(l => l.ativo);

    let enviados = 0;
    const erros = [];

    for (const lembrete of ativos) {
      const horarioLembrete = (lembrete.horario || '').trim();
      if (horarioLembrete !== horaAtual) continue;

      if (lembrete.dias_semana && lembrete.dias_semana.length > 0) {
        if (!lembrete.dias_semana.includes(diaAtual)) continue;
      }

      if (lembrete.ultimo_envio) {
        const diffMin = (agora - new Date(lembrete.ultimo_envio)) / (1000 * 60);
        if (diffMin < 4) continue;
      }

      let mensagem = lembrete.mensagem;

      if (lembrete.tipo === 'resumo_agenda') {
        const inicioDia = new Date(agora);
        inicioDia.setHours(0, 0, 0, 0);
        const finalDoisDias = new Date(agora);
        finalDoisDias.setDate(finalDoisDias.getDate() + 2);
        finalDoisDias.setHours(23, 59, 59, 999);

        const todos = await base44.asServiceRole.entities.Agendamento.list('-data_hora', 200);
        const proximos = todos.filter(a => {
          if (!a.data_hora) return false;
          const dt = new Date(a.data_hora);
          return dt >= inicioDia && dt <= finalDoisDias;
        });

        const grupos = {};
        for (const ag of proximos) {
          const d = new Date(ag.data_hora);
          const dia = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
          const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
          if (!grupos[dia]) grupos[dia] = [];
          grupos[dia].push({ ...ag, hora });
        }

        mensagem = `📅 *Resumo da Agenda — Próximos 2 dias*\n\n`;
        if (proximos.length === 0) {
          mensagem += `✅ Nenhum agendamento nos próximos 2 dias.`;
        } else {
          for (const [dia, ags] of Object.entries(grupos)) {
            mensagem += `📆 *${dia}*\n`;
            for (const ag of ags) {
              mensagem += `  🕐 *${ag.hora}* — ${ag.titulo || 'Agendamento'}`;
              if (ag.cliente_nome) mensagem += `\n  👤 ${ag.cliente_nome}`;
              if (ag.placa) mensagem += ` | 🚗 ${ag.placa}`;
              if (ag.tecnico) mensagem += `\n  🔧 ${ag.tecnico}`;
              mensagem += `\n  ——————————\n`;
            }
            mensagem += `\n`;
          }
          mensagem += `Total: *${proximos.length} agendamento(s)*`;
        }
      }

      // Enviar para cada destinatário configurado
      const destinatarios = lembrete.destinatarios && lembrete.destinatarios.length > 0 
        ? lembrete.destinatarios 
        : (config.lembrete_checklist_whatsapp ? [config.lembrete_checklist_whatsapp] : []);

      if (destinatarios.length === 0) {
        erros.push(`Lembrete "${lembrete.nome}": Nenhum destinatário configurado`);
        continue;
      }

      if (!evolutionOk) {
        erros.push(`Lembrete "${lembrete.nome}": Evolution API não configurada`);
        continue;
      }

      for (const telefone of destinatarios) {
        try {
          await enviarViaEvolution(
            evolutionBase,
            config.evolution_api_key,
            config.evolution_instance,
            telefone,
            mensagem
          );
          enviados++;
        } catch (e) {
          erros.push(`Lembrete "${lembrete.nome}" para ${telefone}: ${e.message}`);
        }
      }

      await base44.asServiceRole.entities.LembreteWhatsApp.update(lembrete.id, {
        ultimo_envio: agora.toISOString(),
      });
    }

    return Response.json({
      message: `${enviados} lembrete(s) enviado(s) no horário ${horaAtual}.`,
      enviados,
      erros: erros.length > 0 ? erros : undefined
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});