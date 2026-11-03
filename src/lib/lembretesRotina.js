const STORAGE_KEY = 'lembretes_rotina_vistos';

export function chaveData(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function lerVistos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function marcarVisto(chave) {
  const vistos = lerVistos();
  vistos[chave] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vistos));
}

/**
 * Retorna os lembretes que devem aparecer agora e ainda não foram vistos hoje.
 */
export function lembretesPendentes(tarefas, agora = new Date()) {
  const vistos = lerVistos();
  const hoje = chaveData(agora);

  return (tarefas || [])
    .filter(t => t.lembrete_ativo && t.ativa !== false && (t.lembrete_mensagem || '').trim() && t.lembrete_horario)
    .map(t => {
      const [hora, minuto] = String(t.lembrete_horario).split(':').map(Number);
      if (Number.isNaN(hora) || Number.isNaN(minuto)) return null;

      if (t.lembrete_tipo === 'unico') {
        const data = String(t.lembrete_data || '').slice(0, 10);
        if (data !== hoje) return null;
      } else {
        const dias = t.lembrete_dias?.length ? t.lembrete_dias : (t.dias_semana || []);
        if (!dias.includes(agora.getDay())) return null;
      }

      const horaAlvo = new Date(agora);
      horaAlvo.setHours(hora, minuto, 0, 0);
      if (agora < horaAlvo) return null;

      const chave = `${t.id}_${hoje}_${t.lembrete_horario}`;
      if (vistos[chave]) return null;

      return { tarefa: t, chave };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.tarefa.lembrete_horario).localeCompare(String(b.tarefa.lembrete_horario)));
}