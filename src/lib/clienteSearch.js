export function normalizarTexto(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filtrarClientes(lista, term, { limite } = {}) {
  const q = (term || '').trim();
  if (!q) return limite ? lista.slice(0, limite) : lista;
  const qNorm = normalizarTexto(q);
  const qDigits = q.replace(/\D/g, '');
  const resultado = lista.filter((c) => {
    if (normalizarTexto(c.nome).includes(qNorm)) return true;
    if (qDigits.length >= 2) {
      const tel = (c.telefone || '').replace(/\D/g, '');
      const cpf = (c.cpf_cnpj || '').replace(/\D/g, '');
      if (tel.includes(qDigits) || cpf.includes(qDigits)) return true;
    }
    return false;
  });
  return limite ? resultado.slice(0, limite) : resultado;
}