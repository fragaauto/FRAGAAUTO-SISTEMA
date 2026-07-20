import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Payload enviado pela automação de entidade (event/data)
    let payload = null;
    try { payload = await req.json(); } catch { payload = null; }
    const data = payload?.data || payload || null;

    const tipo = data?.tipo || 'registro';
    const mensagem = data?.mensagem || '';
    const categoria = data?.categoria || '';

    // Buscar todos os administradores registrados
    let admins = [];
    try {
      admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    } catch (e) {
      console.error('Erro ao buscar admins:', e);
    }

    if (!admins || admins.length === 0) {
      return Response.json({ message: 'Nenhum administrador encontrado para notificar.' });
    }

    const tipoLabel = {
      comentario: 'Comentário',
      queixa: 'Queixa',
      reclamacao: 'Reclamação',
      sugestao: 'Sugestão'
    }[tipo] || 'Registro';

    const assunto = `🔔 Novo registro no Mural Anônimo: ${tipoLabel}`;
    const corpo =
      `Olá,\n\n` +
      `Um novo registro foi enviado no Mural Anônimo:\n\n` +
      `Tipo: ${tipoLabel}` +
      (categoria ? `\nCategoria: ${categoria}` : '') +
      `\n\nMensagem:\n${mensagem}\n\n` +
      `Acesse o sistema (menu Mural Anônimo) para visualizar e responder.`;

    let enviados = 0;
    for (const admin of admins) {
      if (!admin.email) continue;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: assunto,
          body: corpo
        });
        enviados++;
      } catch (e) {
        console.error('Erro ao enviar email para', admin.email, e);
      }
    }

    return Response.json({ success: true, enviados, totalAdmins: admins.length });
  } catch (error) {
    console.error('Erro ao notificar mural anônimo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});