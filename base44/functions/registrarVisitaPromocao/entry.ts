import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { promocao_id } = await req.json().catch(() => ({}));
    if (!promocao_id) return Response.json({ error: 'promocao_id é obrigatório' }, { status: 400 });

    const promocao = await base44.asServiceRole.entities.Promocao.get(promocao_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!promocao) return Response.json({ error: 'Promoção não encontrada' }, { status: 404 });

    await base44.asServiceRole.entities.Promocao.updateMany(
      { id: promocao_id },
      { $inc: { total_visitas: 1 } }
    );

    return Response.json({ ok: true, total_visitas: (promocao.total_visitas || 0) + 1 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}