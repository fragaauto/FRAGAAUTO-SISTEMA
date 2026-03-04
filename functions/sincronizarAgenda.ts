import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar configurações
    const configs = await base44.asServiceRole.entities.Configuracao.list();
    const config = configs[0];

    if (!config) {
      return Response.json({ error: 'Configuração não encontrada' }, { status: 400 });
    }

    const spreadsheetId = config.agenda_google_sheets_id;
    const abaName = config.agenda_google_sheets_aba || 'Agendamentos';

    if (!spreadsheetId) {
      return Response.json({ error: 'ID da planilha não configurado. Configure em Configurações > Agenda.' }, { status: 400 });
    }

    // Colunas configuráveis (com fallback padrão A=data, B=hora, C=cliente, D=serviço, E=placa, F=obs)
    const colData     = config.agenda_sheets_col_data     || 'A';
    const colHora     = config.agenda_sheets_col_hora     || 'B';
    const colCliente  = config.agenda_sheets_col_cliente  || 'C';
    const colServico  = config.agenda_sheets_col_servico  || 'D';
    const colPlaca    = config.agenda_sheets_col_placa    || 'E';
    const colObs      = config.agenda_sheets_col_obs      || 'F';

    // Função para converter letra de coluna em índice (A=0, B=1, ...)
    const colIdx = (letter) => letter.toUpperCase().charCodeAt(0) - 65;

    // Buscar token OAuth do Google Sheets
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Ler planilha
    const range = `${abaName}!A:Z`;
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
      return Response.json({ message: 'Nenhum dado na planilha', sincronizados: 0 });
    }

    // Pular linha de cabeçalho (row[0])
    const dataRows = rows.slice(1);

    // Buscar agendamentos existentes para evitar duplicatas
    const agendamentosExistentes = await base44.asServiceRole.entities.Agendamento.list();
    
    // Criar um set de chaves únicas dos existentes: data_hora + cliente_nome
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

      // Ignorar linhas sem data ou serviço
      if (!dataStr || !servico) {
        ignorados++;
        continue;
      }

      // Parsear data/hora — aceita formatos: DD/MM/YYYY, YYYY-MM-DD
      let dataHoraISO = null;
      try {
        let datePart = dataStr;
        let timePart = horaStr || '08:00';

        // Normalizar hora (aceita HH:MM ou H:MM)
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

      if (!dataHoraISO || isNaN(new Date(dataHoraISO))) {
        ignorados++;
        continue;
      }

      // Verificar duplicata
      const chave = `${dataHoraISO.slice(0, 16)}_${cliente.toLowerCase()}`;
      if (existentesSet.has(chave)) {
        ignorados++;
        continue;
      }

      // Criar agendamento
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
      message: `Sincronização concluída: ${sincronizados} novo(s) agendamento(s) importado(s), ${ignorados} linha(s) ignorada(s).`,
      sincronizados,
      ignorados,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});