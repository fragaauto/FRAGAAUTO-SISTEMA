import { base44 } from '@/api/base44Client';
import { getPublicUrl } from '@/lib/publicUrl';

export const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function fotoProdutoCadastro(produto) {
  return produto?.fotos?.[0]?.url || '';
}

export function linkPublico(promocaoId) {
  if (!promocaoId) return '';
  return getPublicUrl(`/PromocaoPublica?id=${promocaoId}`);
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

// Remove acentos e padroniza texto para comparação de nomes/códigos
export function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Letras iniciais digitadas pelo usuário ("A, B, c" -> ['a','b','c'])
export function letrasIniciais(texto) {
  return String(texto || '')
    .split(/[^A-Za-zÀ-ÿ]+/)
    .map((parte) => normalizarTexto(parte).charAt(0))
    .filter(Boolean);
}

// Aplica grupos + filtros (faixa de código e letra inicial do nome) sobre a base de clientes
export function filtrarClientes(clientes, { todos, grupos, gruposIds, filtros } = {}) {
  const base = (clientes || []).filter((c) => c.telefone && !c.bloqueado);
  let lista;

  if (todos) {
    lista = base;
  } else {
    const ids = new Set();
    (grupos || [])
      .filter((g) => (gruposIds || []).includes(g.id))
      .forEach((g) => (g.cliente_ids || []).forEach((id) => ids.add(id)));
    lista = base.filter((c) => ids.has(c.id));
  }

  const f = filtros || {};
  const temCodigo = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v));
  if (temCodigo(f.codigo_de)) {
    const de = Number(f.codigo_de);
    lista = lista.filter((c) => Number(c.codigo) >= de);
  }
  if (temCodigo(f.codigo_ate)) {
    const ate = Number(f.codigo_ate);
    lista = lista.filter((c) => Number(c.codigo) <= ate);
  }

  const letras = letrasIniciais(f.nome_iniciais);
  if (letras.length) {
    lista = lista.filter((c) => letras.includes(normalizarTexto(c.nome).charAt(0)));
  }

  return lista;
}

// Código curto do vale (ex: BLA-4F7K2)
export function gerarCodigoVale(promocao) {
  const prefixo =
    normalizarTexto(promocao?.titulo || '')
      .replace(/[^a-z]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'VALE';
  const aleatorio = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefixo}-${aleatorio}`;
}

// Descrição do vale oferecido na campanha
export function descreverVale(promocao) {
  if (!promocao?.vale_ativo) return '';
  const valor = Number(promocao.vale_valor || 0);
  if (!valor) return '';
  return promocao.vale_tipo === 'fixo' ? `${brl(valor)} de desconto` : `${valor}% de desconto`;
}

export function dataValidadeVale(dias) {
  const data = new Date();
  data.setDate(data.getDate() + Number(dias || 30));
  return data.toISOString().slice(0, 10);
}

export function dataBr(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}