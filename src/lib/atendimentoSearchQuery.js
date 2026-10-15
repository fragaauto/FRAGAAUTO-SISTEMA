const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function accentPattern(value) {
  const accents = { a: 'aáàâãä', e: 'eéèêë', i: 'iíìîï', o: 'oóòôõö', u: 'uúùûü', c: 'cç', n: 'nñ' };
  return Array.from(value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .map((char) => accents[char.toLowerCase()] ? `[${accents[char.toLowerCase()]}]` : escapeRegex(char)).join('');
}

export function buildAtendimentoSearchQuery(search) {
  const term = search.trim();
  if (!term) return {};

  // Apenas um número (ou OS #número) é uma busca por OS, nunca os dígitos de uma placa.
  const os = term.match(/^(?:OS\s*#?\s*|#\s*)?(\d+)$/i);
  if (os) return { numero_os: Number(os[1]) };

  const plate = term.replace(/[\s-]/g, '').toUpperCase();
  if (/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(plate)) {
    // A igualdade evita varrer cliente/modelo e contempla os formatos antigos da placa.
    const formats = [plate, `${plate.slice(0, 3)}-${plate.slice(3)}`, `${plate.slice(0, 3)} ${plate.slice(3)}`];
    const values = [...new Set([term, ...formats.flatMap((value) => [value, value.toLowerCase()])])];
    return { placa: { $in: values } };
  }

  const textPattern = { $regex: accentPattern(term), $options: 'i' };
  const alternatives = [{ cliente_nome: textPattern }, { modelo: textPattern }];
  if (/^[A-Z0-9]{1,7}$/.test(plate)) {
    // A busca parcial aceita a formatação do dado salvo, não apenas a do texto digitado.
    const pattern = Array.from(plate).map(escapeRegex).join('[\\s-]*');
    alternatives.push({ placa: { $regex: pattern, $options: 'i' } });
  }
  return { $or: alternatives };
}