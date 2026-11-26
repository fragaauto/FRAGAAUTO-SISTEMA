import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { enviarTextoEvolution } from '../../shared/whatsapp.ts';

const TELEFONE_PADRAO = '31998684197';
const MESES_TODOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const fmtMoeda = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dataCurta = (iso) => {
  if (!iso) return '--';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const labelCompetencia = (comp) => {
  const [ano, mes] = comp.split('-');
  return `${mes}/${ano}`;
};

// Competência (AAAA-MM) no fuso do usuário
function competenciaAtual() {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return iso.slice(0, 7);
}

function montarRelatorio({ competencia, contas, empresa }) {
  const lista = contas || [];
  const emAberto = lista.filter((c) => c.status !== 'pago' && c.status !== 'cancelado');
  const pagas = lista.filter((c) => c.status === 'pago');
  const agora = new Date();
  const vencidas = emAberto.filter((c) => c.data_vencimento && new Date(c.data_vencimento) < agora);
  const soma = (l) => l.reduce((s, c) => s + (Number(c.valor) || 0), 0);

  const ordenadas = [...emAberto].sort(
    (a, b) => new Date(a.data_vencimento || 0) - new Date(b.data_vencimento || 0),
  );
  const linhas = ordenadas
    .slice(0, 40)
    .map((c) => `• ${dataCurta(c.data_vencimento)} — ${c.descricao || c.fornecedor || 'Conta'} — R$ ${fmtMoeda(c.valor)}`);

  const enviadoEm = `${dataCurta(agora)} às ${String(agora.getHours()).padStart(2, '0')}:${String(
    agora.getMinutes(),
  ).padStart(2, '0')}`;

  return [
    `*CONTAS A PAGAR — ${labelCompetencia(competencia)}*`,
    empresa ? empresa : null,
    '',
    '*Resumo*',
    `Previsto no mês: R$ ${fmtMoeda(soma(lista))}`,
    `Pago: R$ ${fmtMoeda(soma(pagas))}`,
    `Em aberto: R$ ${fmtMoeda(soma(emAberto))}`,
    `Vencidas: ${vencidas.length}`,
    '',
    `*Em aberto (${emAberto.length})*`,
    linhas.length ? linhas.join('\n') : 'Nenhuma conta em aberto.',
    emAberto.length > 40 ? `_...e mais ${emAberto.length - 40} conta(s)_` : null,
    '',
    `_Enviado em ${enviadoEm}_`,
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n');
}

// Gera as contas do mês a partir do planejamento, sem duplicar
async function gerarContasDoMes(base44, competencia, unidadeId) {
  const [ano, mes] = competencia.split('-').map(Number);
  const previstas = await base44.asServiceRole.entities.ContaPagarPrevista.list();
  const existentes = await base44.asServiceRole.entities.ContaPagar.filter({ competencia });
  const jaGeradas = new Set((existentes || []).map((c) => c.conta_prevista_id).filter(Boolean));

  const faltando = (previstas || []).filter((p) => {
    if (p.ativo === false) return false;
    // Somente contas fixas são geradas automaticamente; as variáveis são cadastradas mês a mês.
    if ((p.tipo || 'fixa') !== 'fixa') return false;
    const meses = Array.isArray(p.meses_cobranca) && p.meses_cobranca.length ? p.meses_cobranca : MESES_TODOS;
    if (!meses.includes(mes)) return false;
    if (unidadeId && p.unidade_id && p.unidade_id !== unidadeId) return false;
    return !jaGeradas.has(p.id);
  });
  if (!faltando.length) return 0;

  const ultimoDia = new Date(ano, mes, 0).getDate();
  const registros = faltando.map((p) => {
    const dia = Math.min(Math.max(Number(p.dia_vencimento) || 5, 1), ultimoDia);
    return {
      unidade_id: p.unidade_id || unidadeId || null,
      fornecedor: p.nome,
      categoria: p.categoria || 'outros',
      descricao: p.nome,
      valor: Number(p.valor_previsto) || 0,
      data_vencimento: new Date(ano, mes - 1, dia, 12).toISOString(),
      status: 'pendente',
      conta_prevista_id: p.id,
      competencia,
      observacoes: p.observacoes || '',
    };
  });

  await base44.asServiceRole.entities.ContaPagar.bulkCreate(registros);
  return registros.length;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const competencia = competenciaAtual();
    const [lembretes, configs] = await Promise.all([
      base44.asServiceRole.entities.LembreteContasPagar.list(),
      base44.asServiceRole.entities.Configuracao.list(),
    ]);
    const empresa = (configs || []).find((c) => c.nome_empresa)?.nome_empresa || null;

    const alvos = (lembretes || []).filter((l) => l.ativo !== false);
    if (!alvos.length) alvos.push({ telefone: TELEFONE_PADRAO, unidade_id: null });

    const resultados = [];

    for (const alvo of alvos) {
      const unidadeId = alvo.unidade_id || null;
      const cfg =
        (unidadeId &&
          (configs || []).find(
            (c) =>
              c.unidade_id === unidadeId &&
              c.evolution_api_url &&
              c.evolution_api_key &&
              c.evolution_instance,
          )) ||
        (configs || []).find((c) => c.evolution_api_url && c.evolution_api_key && c.evolution_instance);

      try {
        if (!cfg) throw new Error('Evolution API não configurada.');

        await gerarContasDoMes(base44, competencia, unidadeId);

        const contas = await base44.asServiceRole.entities.ContaPagar.filter({ competencia });
        const doAlvo = unidadeId ? contas.filter((c) => c.unidade_id === unidadeId) : contas;
        const mensagem = montarRelatorio({ competencia, contas: doAlvo, empresa });

        await enviarTextoEvolution(
          cfg.evolution_api_url,
          cfg.evolution_api_key,
          cfg.evolution_instance,
          alvo.telefone || TELEFONE_PADRAO,
          mensagem,
        );

        if (alvo.id) {
          await base44.asServiceRole.entities.LembreteContasPagar.update(alvo.id, {
            ultimo_envio_competencia: competencia,
          });
        }

        resultados.push({ unidade_id: unidadeId, ok: true, contas: doAlvo.length });
      } catch (error) {
        resultados.push({ unidade_id: unidadeId, ok: false, error: error.message });
      }
    }

    return Response.json({ competencia, resultados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});