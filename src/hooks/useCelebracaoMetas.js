import { useMemo, useState } from 'react';

const MARCOS = [25, 50, 75];

export const FRASES_MARCO = {
  25: 'Um quarto da meta já foi! Excelente começo.',
  50: 'Metade do caminho percorrido. Vamos com tudo!',
  75: 'Falta pouco! O time está voando.',
};

function chaveCelebracao(unidadeId, tipo, referencia, marco) {
  const mes = new Date().toISOString().slice(0, 7);
  return `meta-celebracao:${unidadeId || 'geral'}:${mes}:${tipo}:${referencia}:${marco}`;
}

function jaVisto(chave) {
  try {
    return localStorage.getItem(chave) === '1';
  } catch {
    return true;
  }
}

// Decide qual comemoração exibir na Home (uma por vez, uma única vez por mês)
export default function useCelebracaoMetas({
  unidadeId,
  metas = [],
  faturamentoMes = 0,
  metasCategoria = [],
  vendasCategoria = {},
}) {
  const [vistos, setVistos] = useState([]);

  const candidatos = useMemo(() => {
    const lista = [];
    const total = Number(faturamentoMes) || 0;

    const metaGeral = (metas || [])
      .filter((m) => m.ativa !== false)
      .reduce((soma, m) => soma + (Number(m.meta_mes) || 0), 0);

    if (metaGeral > 0 && total > 0) {
      const percentual = (total / metaGeral) * 100;
      if (percentual >= 100) {
        lista.push({ tipo: 'geral', marco: 100, referencia: 'geral', valor: total, meta: metaGeral });
      } else {
        [...MARCOS].reverse().forEach((marco) => {
          if (percentual >= marco) {
            lista.push({ tipo: 'progresso', marco, referencia: 'geral', valor: total, meta: metaGeral });
          }
        });
      }
    }

    (metasCategoria || [])
      .filter((m) => m.ativa !== false && Number(m.meta_mes) > 0)
      .forEach((m) => {
        const vendido = Number(vendasCategoria?.[m.categoria]) || 0;
        if (vendido >= Number(m.meta_mes)) {
          lista.push({
            tipo: 'categoria',
            marco: 100,
            referencia: m.categoria,
            categoria: m.categoria,
            valor: vendido,
            meta: Number(m.meta_mes),
          });
        }
      });

    return lista.map((item) => ({
      ...item,
      chave: chaveCelebracao(unidadeId, item.tipo, item.referencia, item.marco),
    }));
  }, [unidadeId, metas, faturamentoMes, metasCategoria, vendasCategoria]);

  const celebracao = candidatos.find((c) => !vistos.includes(c.chave) && !jaVisto(c.chave)) || null;

  const fechar = () => {
    if (!celebracao) return;
    try {
      localStorage.setItem(celebracao.chave, '1');
    } catch {
      // storage indisponível — segue sem persistir
    }
    setVistos((prev) => [...prev, celebracao.chave]);
  };

  return { celebracao, fechar };
}