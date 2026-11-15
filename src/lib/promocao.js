import { base44 } from '@/api/base44Client';

export const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function fotoProdutoCadastro(produto) {
  return produto?.fotos?.[0]?.url || '';
}

export function linkPublico(promocaoId) {
  if (!promocaoId) return '';
  return `${window.location.origin}/PromocaoPublica?id=${promocaoId}`;
}

export function promocaoEncerrada(promocao) {
  if (!promocao) return true;
  if (promocao.ativa === false) return true;
  if (!promocao.data_fim) return false;
  return new Date(`${promocao.data_fim}T23:59:59`) < new Date();
}

export function montarMensagem(promocao, clienteNome) {
  const base = String(promocao?.texto || '').trim();
  const link = linkPublico(promocao?.id);
  const texto = base
    .replace(/\{nome\}/gi, clienteNome || '')
    .replace(/\{cliente\}/gi, clienteNome || '');
  if (texto.includes(link)) return texto;
  return `${texto}\n\n👉 Toque no link, veja os produtos com foto e marque o que você quer:\n${link}`;
}

export async function uploadArquivoPublico(file) {
  const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
  return file_url;
}

export function normalizarTelefone(telefone) {
  let numero = String(telefone || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return numero;
}