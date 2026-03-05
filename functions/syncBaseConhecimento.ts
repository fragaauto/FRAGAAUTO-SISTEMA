import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
        }

        const { record_id, docs_url } = await req.json();

        if (!docs_url) {
            return Response.json({ error: 'URL do Google Docs não informada' }, { status: 400 });
        }

        // Extract Google Docs ID from URL
        const match = docs_url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return Response.json({ error: 'URL inválida. Use a URL do Google Docs (ex: https://docs.google.com/document/d/ID/edit)' }, { status: 400 });
        }

        const docId = match[1];
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

        const response = await fetch(exportUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) {
            return Response.json({ 
                error: `Erro ao buscar documento: ${response.status}. Verifique se o documento está compartilhado publicamente.` 
            }, { status: 400 });
        }

        const content = await response.text();

        if (record_id) {
            await base44.asServiceRole.entities.BaseConhecimento.update(record_id, {
                conteudo: content,
                ultima_sincronizacao: new Date().toISOString()
            });
        }

        return Response.json({ 
            success: true, 
            chars: content.length,
            preview: content.substring(0, 200) + '...'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});