import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar configuração
    const configs = await base44.asServiceRole.entities.Configuracao.list();
    const config = configs[0];

    if (!config?.lembrete_checklist_ativo) {
      return Response.json({ message: 'Lembrete de checklist desativado nas configurações.' });
    }

    const whatsappDest = config.lembrete_checklist_whatsapp || config.whatsapp_atendimento;
    if (!whatsappDest) {
      return Response.json({ message: 'Nenhum número de WhatsApp configurado para lembretes.' });
    }

    // Buscar atendimentos ativos com checklist vazio
    const atendimentos = await base44.asServiceRole.entities.Atendimento.list();
    const statusAtivos = ['rascunho', 'queixa_pendente', 'queixa_aprovada', 'em_diagnostico', 'aguardando_aprovacao_checklist', 'em_execucao'];

    const semChecklist = atendimentos.filter(a => {
      const ativo = statusAtivos.includes(a.status);
      const checklistVazio = !a.checklist || a.checklist.length === 0;
      return ativo && checklistVazio;
    });

    if (semChecklist.length === 0) {
      return Response.json({ message: 'Nenhum atendimento com checklist pendente.' });
    }

    // Montar mensagem
    const lista = semChecklist.map(a => {
      const placa = a.placa || 'sem placa';
      const modelo = a.modelo || 'sem modelo';
      const cliente = a.cliente_nome ? ` - ${a.cliente_nome}` : '';
      return `• ${placa} (${modelo}${cliente})`;
    }).join('\n');

    const mensagem = `🔔 *Lembrete de Checklist Pendente*\n\nOs seguintes atendimentos ainda não têm checklist preenchido:\n\n${lista}\n\nNão esqueça de registrar o checklist para cada veículo!`;

    // Enviar via Evolution API se configurado
    const evolutionOk = config?.evolution_api_url && config?.evolution_api_key && config?.evolution_instance;
    
    if (evolutionOk) {
      try {
        let numero = whatsappDest.replace(/\D/g, '');
        if (numero.length === 10 || numero.length === 11) {
          numero = `55${numero}`;
        }

        const evolutionBase = config.evolution_api_url.replace(/\/$/, '');
        const resp = await fetch(`${evolutionBase}/message/sendText/${config.evolution_instance}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.evolution_api_key,
          },
          body: JSON.stringify({ number: numero, text: mensagem }),
        });

        if (!resp.ok) {
          const body = await resp.text();
          throw new Error(`Evolution API erro ${resp.status}: ${body}`);
        }

        console.log('Lembrete enviado via Evolution API para:', whatsappDest);
      } catch (e) {
        console.error('Erro ao enviar via Evolution API:', e);
        return Response.json({ error: e.message }, { status: 500 });
      }
    } else {
      console.log('Evolution API não configurada. Configure em Configurações > Integrações.');
      return Response.json({ error: 'Evolution API não configurada' }, { status: 400 });
    }

    return Response.json({
      success: true,
      pendentes: semChecklist.length,
      mensagem,
      whatsapp: whatsappDest,
      atendimentos: semChecklist.map(a => ({ id: a.id, placa: a.placa, modelo: a.modelo, cliente: a.cliente_nome }))
    });
  } catch (error) {
    console.error('Erro no lembrete de checklist:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});