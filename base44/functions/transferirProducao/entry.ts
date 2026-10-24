import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem transferir produção' }, { status: 403 });
    }

    const corpo = await req.json();
    const { atendimentoId, servicoKey, operacao = 'transferir', tecnicoDestinoNome, observacao } = corpo || {};
    if (!atendimentoId || !servicoKey) {
      return Response.json({ error: 'Parâmetros insuficientes' }, { status: 400 });
    }

    const atendimento = await base44.asServiceRole.entities.Atendimento.get(atendimentoId);
    if (!atendimento) return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    if (!atendimento.retorno_servico) {
      return Response.json({ error: 'Somente OS marcadas como retorno podem transferir produção' }, { status: 400 });
    }

    // Cada transferência substitui a anterior do mesmo serviço
    await base44.asServiceRole.entities.TransferenciaProducao.deleteMany({
      atendimento_id: atendimentoId,
      servico_key: servicoKey,
    });

    if (operacao === 'cancelar') {
      return Response.json({ sucesso: true, transferencias: [] });
    }

    let origem = null;
    if (atendimento.atendimento_origem_id) {
      try {
        origem = await base44.asServiceRole.entities.Atendimento.get(atendimento.atendimento_origem_id);
      } catch (_e) {
        origem = null;
      }
    }

    // Serviços que deram garantia: os vinculados na OS ou, se não houver, todos os da OS de origem
    let garantias = (atendimento.servicos_garantia || []).filter((s) => s && s.nome);
    if (garantias.length === 0 && origem) {
      garantias = [
        ...(origem.itens_queixa || []).map((item, index) => ({ ...item, key: `queixa-${index}` })),
        ...(origem.itens_orcamento || []).map((item, index) => ({ ...item, key: `orcamento-${index}` })),
      ].filter((item) => item.nome);
    }

    const garantia = garantias.find((s) => s.key === servicoKey);
    if (!garantia) return Response.json({ error: 'Serviço de garantia não encontrado nesta OS' }, { status: 404 });
    if (!tecnicoDestinoNome) {
      return Response.json({ error: 'Informe o técnico que receberá a produção' }, { status: 400 });
    }

    // Técnicos que realizaram o serviço originalmente
    let tecnicosOrigem = (garantia.tecnicos || []).filter((t) => t && t.nome);
    if (tecnicosOrigem.length === 0 && origem) {
      const responsaveis = (origem.tecnicos_responsaveis || []).filter((t) => t && t.nome);
      if (responsaveis.length > 0) {
        tecnicosOrigem = responsaveis;
      } else if (origem.tecnico) {
        tecnicosOrigem = String(origem.tecnico)
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
          .map((n) => ({ id: n, nome: n }));
      }
    }
    if (tecnicosOrigem.length === 0) {
      return Response.json(
        { error: 'A OS de origem não possui técnico atribuído — não há produção a transferir.' },
        { status: 400 },
      );
    }

    let destinoId = tecnicoDestinoNome;
    const funcionarios = await base44.asServiceRole.entities.Funcionario.list();
    const funcionario = (funcionarios || []).find((f) => f.nome_completo === tecnicoDestinoNome);
    if (funcionario) destinoId = funcionario.id;

    const valorTotal = Number(garantia.valor_total) || 0;
    const valorPorTecnico = valorTotal / tecnicosOrigem.length;
    const agora = new Date().toISOString();

    const registros = tecnicosOrigem.map((t) => ({
      unidade_id: atendimento.unidade_id || '',
      atendimento_id: atendimento.id,
      numero_os: atendimento.numero_os || null,
      atendimento_origem_id: atendimento.atendimento_origem_id || '',
      atendimento_origem_numero: atendimento.atendimento_origem_numero || null,
      servico_key: servicoKey,
      servico_nome: garantia.nome || 'Serviço',
      valor: valorPorTecnico,
      tecnico_origem_id: t.id || t.nome,
      tecnico_origem_nome: t.nome,
      tecnico_destino_id: destinoId,
      tecnico_destino_nome: tecnicoDestinoNome,
      data_transferencia: agora,
      usuario_nome: user.full_name || user.email || '',
      observacao: observacao || '',
    }));

    const criados = await base44.asServiceRole.entities.TransferenciaProducao.bulkCreate(registros);
    return Response.json({ sucesso: true, transferencias: criados });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}