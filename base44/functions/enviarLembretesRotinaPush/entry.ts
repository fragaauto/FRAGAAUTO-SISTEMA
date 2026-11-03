import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const TZ = 'America/Sao_Paulo';
const JANELA_MINUTOS = 5;

function agoraLocal() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(new Date());

  const valores = {};
  partes.forEach(p => { valores[p.type] = p.value; });

  const diasSemana = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hora = valores.hour === '24' ? '00' : valores.hour;

  return {
    data: `${valores.year}-${valores.month}-${valores.day}`,
    minutos: Number(hora) * 60 + Number(valores.minute),
    diaSemana: diasSemana[valores.weekday],
  };
}

function minutosDoHorario(horario) {
  const [hora, minuto] = String(horario || '').split(':').map(Number);
  if (Number.isNaN(hora) || Number.isNaN(minuto)) return null;
  return hora * 60 + minuto;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const agora = agoraLocal();
    const tarefas = await base44.asServiceRole.entities.TarefaRotina.filter({ lembrete_ativo: true });

    const devidos = (tarefas || []).filter(t => {
      if (!t.lembrete_ativo || t.ativa === false) return false;
      if (!(t.lembrete_mensagem || '').trim() || !t.lembrete_horario) return false;

      if (t.lembrete_tipo === 'unico') {
        if (String(t.lembrete_data || '').slice(0, 10) !== agora.data) return false;
      } else {
        const dias = t.lembrete_dias?.length ? t.lembrete_dias : (t.dias_semana || []);
        if (!dias.includes(agora.diaSemana)) return false;
      }

      const alvo = minutosDoHorario(t.lembrete_horario);
      if (alvo === null) return false;
      const diferenca = agora.minutos - alvo;
      if (diferenca < 0 || diferenca >= JANELA_MINUTOS) return false;

      return t.lembrete_ultimo_envio !== `${agora.data} ${t.lembrete_horario}`;
    });

    if (devidos.length === 0) {
      return Response.json({ enviados: 0, tarefas: [] });
    }

    const usuarios = await base44.asServiceRole.entities.User.list();
    const lista = Array.isArray(usuarios) ? usuarios : (usuarios?.items || []);
    const destinatarios = lista.filter(u => u.email && u.aprovado !== false);

    const envios = [];
    for (const tarefa of devidos) {
      for (const destino of destinatarios) {
        envios.push({ tarefa, destino });
      }
    }

    const resultados = [];
    for (let i = 0; i < envios.length; i += 6) {
      const lote = envios.slice(i, i + 6);
      const respostas = await Promise.allSettled(lote.map(({ tarefa, destino }) =>
        base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: destino.id,
          title: tarefa.titulo,
          content: tarefa.lembrete_mensagem,
        })
      ));
      respostas.forEach((r, idx) => {
        resultados.push({
          user_id: lote[idx].destino.id,
          tarefa: lote[idx].tarefa.titulo,
          ok: r.status === 'fulfilled',
          erro: r.status === 'rejected' ? String(r.reason?.message || r.reason) : null,
        });
      });
    }

    for (const tarefa of devidos) {
      await base44.asServiceRole.entities.TarefaRotina.update(tarefa.id, {
        lembrete_ultimo_envio: `${agora.data} ${tarefa.lembrete_horario}`,
      });
    }

    const falhas = resultados.filter(r => !r.ok);
    return Response.json({
      enviados: resultados.length - falhas.length,
      falhas: falhas.length,
      tarefas: devidos.map(t => t.titulo),
      erroExemplo: falhas[0]?.erro || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}