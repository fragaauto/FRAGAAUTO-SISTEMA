import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const agora = new Date();
    // Horário em America/Sao_Paulo
    const horaAtual = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }); // ex: "17:30"

    const diaAtual = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay(); // 0-6

    // Buscar lembretes ativos
    const lembretes = await base44.asServiceRole.entities.LembreteWhatsApp.list();
    const ativos = lembretes.filter(l => l.ativo);

    let enviados = 0;

    for (const lembrete of ativos) {
      // Checar horário (compara HH:MM)
      const horarioLembrete = (lembrete.horario || '').trim();
      if (horarioLembrete !== horaAtual) continue;

      // Checar dia da semana
      if (lembrete.dias_semana && lembrete.dias_semana.length > 0) {
        if (!lembrete.dias_semana.includes(diaAtual)) continue;
      }

      // Checar se já foi enviado nesta janela (evitar reenvio em caso de múltiplas execuções no mesmo minuto)
      if (lembrete.ultimo_envio) {
        const ultimoEnvio = new Date(lembrete.ultimo_envio);
        const diffMin = (agora - ultimoEnvio) / (1000 * 60);
        if (diffMin < 4) continue; // evita reenvio nos próximos 4 minutos
      }

      let mensagem = lembrete.mensagem;

      // Se for do tipo resumo_agenda, gera o texto automaticamente
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

      // Enviar para todas as conversas ativas (últimos 30 dias)
      const conversas = await base44.asServiceRole.agents.listConversations('atendimento_whatsapp');
      for (const c of conversas) {
        const ultimaMsg = c.updated_date || c.created_date;
        const diasDesdeUltima = (Date.now() - new Date(ultimaMsg)) / (1000 * 60 * 60 * 24);
        if (diasDesdeUltima > 30) continue;

        // Busca o objeto completo da conversa antes de enviar
        const conversa = await base44.asServiceRole.agents.getConversation(c.id);
        await base44.asServiceRole.agents.addMessage(conversa, {
          role: 'assistant',
          content: mensagem,
        });
      }

      // Marcar último envio
      await base44.asServiceRole.entities.LembreteWhatsApp.update(lembrete.id, {
        ultimo_envio: agora.toISOString(),
      });

      enviados++;
    }

    return Response.json({ message: `${enviados} lembrete(s) enviado(s) no horário ${horaAtual}.`, enviados });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});