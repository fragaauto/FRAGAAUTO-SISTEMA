import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const configs = await base44.asServiceRole.entities.Configuracao.list();
    const config = configs[0];

    if (!config) {
      return Response.json({ error: 'Configuração não encontrada' }, { status: 400 });
    }

    const spreadsheetId = config.agenda_google_sheets_id;
    const abaName = config.agenda_google_sheets_aba || 'Agendamentos';

    if (!spreadsheetId) {
      return Response.json({ error: 'ID da planilha não configurado. Configure em Configurações > Integrações.' }, { status: 400 });
    }

    const colData     = config.agenda_sheets_col_data     || 'A';
    const colHora     = config.agenda_sheets_col_hora     || 'B';
    const colCliente  = config.agenda_sheets_col_cliente  || 'C';
    const colServico  = config.agenda_sheets_col_servico  || 'D';
    const colPlaca    = config.agenda_sheets_col_placa    || 'E';
    const colObs      = config.agenda_sheets_col_obs      || 'F';

    const colIdx = (letter) => letter.toUpperCase().charCodeAt(0) - 65;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Colocar o nome da aba entre aspas simples para suportar espaços e caracteres especiais
    const range = `'${abaName}'!A:Z`;
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const sheetsRes = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!sheetsRes.ok) {
      const err = await sheetsRes.text();
      return Response.json({ error: `Erro ao ler planilha: ${err}` }, { status: 400 });
    }

    const sheetsData = await sheetsRes.json();
    const rows = sheetsData.values || [];

    if (rows.length <= 1) {
      return Response.json({ message: 'Nenhum dado na planilha (ou apenas cabeçalho)', sincronizados: 0 });
    }

    const dataRows = rows.slice(1);

    const agendamentosExistentes = await base44.asServiceRole.entities.Agendamento.list();
    const existentesSet = new Set(
      agendamentosExistentes
        .filter(a => a.data_hora && a.cliente_nome)
        .map(a => {
          const dt = new Date(a.data_hora);
          return `${dt.toISOString().slice(0, 16)}_${(a.cliente_nome || '').toLowerCase().trim()}`;
        })
    );

    let sincronizados = 0;
    let ignorados = 0;

    for (const row of dataRows) {
      const dataStr    = (row[colIdx(colData)]    || '').trim();
      const horaStr    = (row[colIdx(colHora)]    || '').trim();
      const cliente    = (row[colIdx(colCliente)] || '').trim();
      const servico    = (row[colIdx(colServico)] || '').trim();
      const placa      = (row[colIdx(colPlaca)]   || '').trim();
      const obs        = (row[colIdx(colObs)]     || '').trim();

      if (!dataStr || !servico) { ignorados++; continue; }

      let dataHoraISO = null;
      try {
        let datePart = dataStr;
        let timePart = horaStr || '08:00';

        if (!/^\d{1,2}:\d{2}$/.test(timePart)) timePart = '08:00';

        // Converter DD/MM/YYYY → YYYY-MM-DD
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
          const [dd, mm, yyyy] = datePart.split('/');
          datePart = `${yyyy}-${mm}-${dd}`;
        }

        dataHoraISO = new Date(`${datePart}T${timePart}:00`).toISOString();
      } catch (_) {
        ignorados++;
        continue;
      }

      if (!dataHoraISO || isNaN(new Date(dataHoraISO))) { ignorados++; continue; }

      const chave = `${dataHoraISO.slice(0, 16)}_${cliente.toLowerCase()}`;
      if (existentesSet.has(chave)) { ignorados++; continue; }

      await base44.asServiceRole.entities.Agendamento.create({
        titulo: servico,
        cliente_nome: cliente || null,
        placa: placa ? placa.toUpperCase() : null,
        data_hora: dataHoraISO,
        observacoes: obs || null,
        status: 'agendado',
      });

      existentesSet.add(chave);
      sincronizados++;
    }

    return Response.json({
      message: `Sincronização concluída: ${sincronizados} novo(s) agendamento(s), ${ignorados} linha(s) ignorada(s).`,
      sincronizados,
      ignorados,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});