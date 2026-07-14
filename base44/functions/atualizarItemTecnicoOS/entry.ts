import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem editar atribuições de técnicos' }, { status: 403 });

    const body = await req.json();
    const { atendimentoId, itemSource, itemIndex, operacao, tecnicoId, novoNome, dataExecucao } = body || {};
    if (!atendimentoId || !itemSource || itemIndex === undefined || !operacao) {
      return Response.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
    }
    const campo = itemSource === 'queixa' ? 'itens_queixa' : 'itens_orcamento';

    const atendimento = await base44.asServiceRole.entities.Atendimento.get(atendimentoId);
    if (!atendimento) return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });

    const itens = JSON.parse(JSON.stringify(atendimento[campo] || []));
    const item = itens[itemIndex];
    if (!item) return Response.json({ error: 'Item não encontrado' }, { status: 404 });

    if (operacao === 'data_execucao') {
      item.data_execucao = dataExecucao || null;
    } else {
      // Materializa técnicos do item a partir do atendimento, se necessário
      if (!item.tecnicos || item.tecnicos.length === 0) {
        item.tecnicos = (atendimento.tecnicos_responsaveis || []).map(t => ({ id: t.id || t.nome, nome: t.nome }));
        if (item.tecnicos.length === 0 && atendimento.tecnico) {
          item.tecnicos = atendimento.tecnico.split(',').map(s => s.trim()).filter(s => s).map(s => ({ id: s, nome: s }));
        }
      }
      if (operacao === 'remover') {
        item.tecnicos = item.tecnicos.filter(t => (t.id || t.nome) !== tecnicoId);
      } else if (operacao === 'transferir') {
        // Resolve o id do novo técnico: busca em funcionários ativos, senão usa o nome
        let novoId = novoNome;
        try {
          const funcionarios = await base44.asServiceRole.entities.Funcionario.list();
          const func = (funcionarios || []).find(f => (f.status || 'ativo') === 'ativo' && f.nome_completo === novoNome);
          if (func) novoId = func.id;
        } catch {}
        const encontrou = item.tecnicos.some(t => (t.id || t.nome) === tecnicoId);
        if (encontrou) {
          item.tecnicos = item.tecnicos.map(t => (t.id || t.nome) === tecnicoId ? { id: novoId, nome: novoNome } : t);
        } else {
          item.tecnicos.push({ id: novoId, nome: novoNome });
        }
      } else {
        return Response.json({ error: 'Operação inválida' }, { status: 400 });
      }
    }

    await base44.asServiceRole.entities.Atendimento.update(atendimentoId, { [campo]: itens });
    return Response.json({ sucesso: true });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});