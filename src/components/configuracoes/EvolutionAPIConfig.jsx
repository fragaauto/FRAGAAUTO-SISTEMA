import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EvolutionAPIConfig({ formData, setFormData }) {
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState(null); // null | { ok: bool, mensagem: string, detalhes?: string }
  const [showKey, setShowKey] = useState(false);

  const testarConexao = async () => {
    setTestando(true);
    setResultado(null);

    const { evolution_api_url, evolution_api_key, evolution_instance } = formData;

    if (!evolution_api_url || !evolution_api_key || !evolution_instance) {
      setResultado({
        ok: false,
        mensagem: 'Preencha todos os campos antes de testar.',
        detalhes: [
          !evolution_api_url && '• URL da API está vazia.',
          !evolution_api_key && '• API Key está vazia.',
          !evolution_instance && '• Nome da instância está vazio.',
        ].filter(Boolean).join('\n')
      });
      setTestando(false);
      return;
    }

    // Validar se parece URL base válida (sem caminhos de manager/painel)
    const urlLimpa = evolution_api_url.replace(/\/$/, '');
    if (urlLimpa.includes('/manager') || urlLimpa.includes('/instance/')) {
      setResultado({
        ok: false,
        mensagem: 'URL inválida — parece ser o link do painel, não da API.',
        detalhes: 'A URL deve ser apenas a base da API, como:\nhttps://api.seudominio.com.br\n\nNão inclua caminhos como /manager ou /instance/...'
      });
      setTestando(false);
      return;
    }

    try {
      const res = await base44.functions.invoke('testarEvolutionAPI', {
        url: evolution_api_url,
        apiKey: evolution_api_key,
        instance: evolution_instance
      });

      setResultado(res.data);
    } catch (e) {
      setResultado({
        ok: false,
        mensagem: 'Erro ao executar o teste.',
        detalhes: e.message
      });
    }

    setTestando(false);
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          Integração WhatsApp — Evolution API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">
          Configure as credenciais da Evolution API para envio automático de mensagens WhatsApp (remarketing, lembretes, etc).
        </p>

        <div>
          <Label>URL da API</Label>
          <Input
            value={formData.evolution_api_url || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_url: e.target.value.trim() }))}
            placeholder="https://api.seudominio.com.br"
          />
          <p className="text-xs text-slate-500 mt-1">URL base da sua Evolution API (sem barra no final)</p>
        </div>

        <div>
          <Label>API Key (Global)</Label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={formData.evolution_api_key || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_key: e.target.value.trim() }))}
              placeholder="sua-api-key-aqui"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Encontre em: Evolution API → Configurações → Global API Key</p>
        </div>

        <div>
          <Label>Nome da Instância</Label>
          <Input
            value={formData.evolution_instance || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, evolution_instance: e.target.value.trim() }))}
            placeholder="fraga-auto"
          />
          <p className="text-xs text-slate-500 mt-1">Nome exato da instância conectada ao WhatsApp na Evolution API</p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={testarConexao}
          disabled={testando}
          className="w-full border-green-300 text-green-700 hover:bg-green-50"
        >
          {testando ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testando conexão...</>
          ) : (
            <><MessageCircle className="w-4 h-4 mr-2" />Testar Conexão</>
          )}
        </Button>

        {resultado && (
          <div className={`rounded-lg p-4 border ${resultado.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {resultado.ok
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-500" />
              }
              <p className={`font-semibold text-sm ${resultado.ok ? 'text-green-700' : 'text-red-700'}`}>
                {resultado.mensagem}
              </p>
            </div>
            {resultado.detalhes && (
              <p className="text-xs text-slate-600 whitespace-pre-wrap mt-1 ml-7">{resultado.detalhes}</p>
            )}
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-600">Como configurar:</p>
          <p>1. Instale a Evolution API em seu servidor</p>
          <p>2. Crie uma instância e conecte ao WhatsApp via QR Code</p>
          <p>3. Copie a URL, API Key e nome da instância aqui</p>
          <p>4. Clique em "Testar Conexão" para verificar</p>
        </div>
      </CardContent>
    </Card>
  );
}