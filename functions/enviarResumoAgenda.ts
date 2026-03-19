import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar agendamentos dos próximos 2 dias
    const agora = new Date();
    const doisDias = new Date(agora);
    doisDias.setDate(doisDias.getDate() + 2);

    // Zerar horas para início do dia atual
    const inicioDia = new Date(agora);
    inicioDia.setHours(0, 0, 0, 0);

    // Final do segundo dia
    const finalDoisDias = new Date(doisDias);
    finalDoisDias.setHours(23, 59, 59, 999);

    const todosAgendamentos = await base44.asServiceRole.entities.Agendamento.list('-data_hora', 200);

    const proximos = todosAgendamentos.filter(a => {
      if (!a.data_hora) return false;
      const dt = new Date(a.data_hora);
      return dt >= inicioDia && dt <= finalDoisDias;
    });

    // Montar mensagem
    const formatar = (data) => {
      const d = new Date(data);
      const dia = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
      const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      return { dia, hora };
    };

    // Agrupar por dia
    const grupos = {};
    for (const ag of proximos) {
      const { dia, hora } = formatar(ag.data_hora);
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push({ ...ag, hora });
    }

    let mensagem = `📅 *Resumo da Agenda — Próximos 2 dias*\n\n`;

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

    // Enviar via agente WhatsApp para todas as conversas ativas
    // Busca conversas do agente atendimento_whatsapp
    const conversas = await base44.asServiceRole.agents.listConversations('atendimento_whatsapp');

    let enviados = 0;
    for (const conversa of conversas) {
      // Só envia para conversas com mensagens recentes (últimos 30 dias)
      const ultimaMsg = conversa.updated_date || conversa.created_date;
      const diasDesdeUltima = (Date.now() - new Date(ultimaMsg)) / (1000 * 60 * 60 * 24);
      if (diasDesdeUltima > 30) continue;

      await base44.asServiceRole.agents.addMessage(conversa, {
        role: 'assistant',
        content: mensagem,
      });
      enviados++;
    }

    return Response.json({
      message: `Resumo enviado para ${enviados} conversa(s). ${proximos.length} agendamento(s) nos próximos 2 dias.`,
      enviados,
      agendamentos: proximos.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});