import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
        }

        const { docs_url, titulo, conteudo } = await req.json();

        if (!docs_url) {
            return Response.json({ error: 'URL do Google Docs não informada' }, { status: 400 });
        }

        // Extrair o ID do documento da URL
        const match = docs_url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return Response.json({ error: 'URL inválida do Google Docs' }, { status: 400 });
        }

        const docId = match[1];

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledocs');

        // Buscar o documento atual para saber o índice final do conteúdo
        const getRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!getRes.ok) {
            const err = await getRes.text();
            return Response.json({ error: `Erro ao acessar documento: ${getRes.status} - ${err}` }, { status: 400 });
        }

        const doc = await getRes.json();
        const endIndex = doc.body?.content?.at(-1)?.endIndex ?? 1;

        // Texto a inserir: título + conteúdo com separador
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const textoInserir = `\n--- ${titulo} (atualizado em ${now}) ---\n${conteudo}\n`;

        // Inserir texto no final do documento (antes do último índice que é o \n final)
        const insertIndex = Math.max(1, endIndex - 1);

        const batchRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    {
                        insertText: {
                            location: { index: insertIndex },
                            text: textoInserir
                        }
                    }
                ]
            })
        });

        if (!batchRes.ok) {
            const err = await batchRes.text();
            return Response.json({ error: `Erro ao escrever no documento: ${batchRes.status} - ${err}` }, { status: 400 });
        }

        return Response.json({ success: true, chars: textoInserir.length });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});