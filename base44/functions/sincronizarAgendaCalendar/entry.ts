import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const unidade_id = body.unidade_id || null;

    const configs = await base44.asServiceRole.entities.Configuracao.list();

    let config = null;
    if (unidade_id) {
      config = configs.find(c => c.unidade_id === unidade_id);
    }
    if (!config) {
      config = configs.find(c => !c.unidade_id) || configs[0];
    }
    if (!config) {
      return Response.json({ error: 'Configuração não encontrada' }, { status: 400 });
    }

    const calendarId = config.agenda_google_calendar_id || 'primary';

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Erro ao ler calendário: ${err}` }, { status: 400 });
    }

    const data = await res.json();
    const events = (data.items || []).filter(e => e.status !== 'cancelled');

    const agendamentosExistentes = unidade_id
      ? await base44.asServiceRole.entities.Agendamento.filter({ unidade_id })
      : await base44.asServiceRole.entities.Agendamento.list();

    const existentesSet = new Set(
      agendamentosExistentes
        .filter(a => a.data_hora && a.titulo)
        .map(a => {
          const dt = new Date(a.data_hora);
          return `${dt.toISOString().slice(0, 16)}_${(a.titulo || '').toLowerCase().trim()}`;
        })
    );

    let sincronizados = 0;
    let ignorados = 0;

    for (const event of events) {
      const titulo = (event.summary || 'Sem título').trim();
      const startStr = event.start?.dateTime || event.start?.date;
      const endStr = event.end?.dateTime || event.end?.date;

      if (!startStr) { ignorados++; continue; }

      const dataHora = new Date(startStr).toISOString();

      let duracaoMinutos = 60;
      if (endStr) {
        duracaoMinutos = Math.round((new Date(endStr) - new Date(startStr)) / 60000);
        if (!duracaoMinutos || duracaoMinutos < 0) duracaoMinutos = 60;
      }

      let clienteNome = '';
      if (event.attendees && event.attendees.length > 0) {
        clienteNome = event.attendees[0].displayName || event.attendees[0].email || '';
      }

      const observacoes = event.description || '';

      const chave = `${dataHora.slice(0, 16)}_${titulo.toLowerCase()}`;
      if (existentesSet.has(chave)) { ignorados++; continue; }

      await base44.asServiceRole.entities.Agendamento.create({
        titulo,
        cliente_nome: clienteNome || null,
        data_hora: dataHora,
        duracao_minutos: duracaoMinutos,
        observacoes: observacoes || null,
        status: 'agendado',
        unidade_id: unidade_id || null,
      });

      existentesSet.add(chave);
      sincronizados++;
    }

    return Response.json({
      message: `Google Calendar: ${sincronizados} novo(s) agendamento(s), ${ignorados} ignorado(s).`,
      sincronizados,
      ignorados,
      totalEventos: events.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}