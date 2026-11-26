// Envio de texto via Evolution API — usado pelas funções que disparam WhatsApp.

export async function enviarTextoEvolution(
  url: string,
  apiKey: string,
  instance: string,
  telefone: string,
  mensagem: string,
) {
  const baseUrl = String(url || '').replace(/\/$/, '');
  let numero = String(telefone || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) {
    numero = `55${numero}`;
  }

  const resp = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({ number: numero, text: mensagem }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Evolution API retornou ${resp.status}: ${body}`);
  }

  return await resp.json();
}