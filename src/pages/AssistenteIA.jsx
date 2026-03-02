import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Bot, Plus, Trash2, Sparkles } from 'lucide-react';
import MessageBubble from '../components/assistente/MessageBubble.jsx';

export default function AssistenteIA() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!currentConversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(currentConversation.id, (data) => {
      setMessages(data.messages || []);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentConversation?.id]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const convs = await base44.agents.listConversations({ agent_name: 'assistente_interno' });
      setConversations(convs || []);
      if (convs?.length > 0) {
        selectConversation(convs[0]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingConvs(false);
  };

  const selectConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setCurrentConversation(full);
    setMessages(full.messages || []);
  };

  const newConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'assistente_interno',
      metadata: { name: `Conversa ${new Date().toLocaleString('pt-BR')}` }
    });
    setConversations(prev => [conv, ...prev]);
    setCurrentConversation(conv);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    let conv = currentConversation;
    if (!conv) {
      conv = await base44.agents.createConversation({
        agent_name: 'assistente_interno',
        metadata: { name: `Conversa ${new Date().toLocaleString('pt-BR')}` }
      });
      setConversations(prev => [conv, ...prev]);
      setCurrentConversation(conv);
    }

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    await base44.agents.addMessage(conv, userMsg);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - conversas */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">Assistente IA</span>
          </div>
          <Button onClick={newConversation} className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nova Conversa
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingConvs ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhuma conversa ainda</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-all ${
                  currentConversation?.id === conv.id
                    ? 'bg-purple-50 text-purple-800 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <p className="truncate">{conv.metadata?.name || 'Conversa'}</p>
                <p className="text-xs text-slate-400 truncate">
                  {conv.updated_date ? new Date(conv.updated_date).toLocaleDateString('pt-BR') : ''}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Assistente Interno</p>
              <p className="text-xs text-slate-500">Fraga Auto Portas · IA operacional</p>
            </div>
          </div>
          <Button onClick={newConversation} variant="outline" size="sm" className="md:hidden">
            <Plus className="w-4 h-4 mr-1" />
            Nova
          </Button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pb-20">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Assistente Interno</h2>
                <p className="text-slate-500 max-w-sm text-sm">
                  Diga o que precisa e eu faço no sistema. Exemplos:
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {[
                  '🚗 Abre um atendimento para placa ABC1234, modelo Civic, cliente João Silva',
                  '📦 Cadastra produto: Película 3M, categoria vidros, valor R$350',
                  '👤 Cadastra cliente Maria Souza, telefone 11999998888',
                  '✅ Lança no checklist do atendimento ABC1234 os itens: vidro traseiro e porta dianteira esquerda'
                ].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(ex.replace(/^[^\s]+ /, ''))}
                    className="text-left p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-4 py-3">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite o que precisa fazer no sistema..."
              className="flex-1 h-11"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 h-11 px-4"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-center text-slate-400 mt-2">
            Enter para enviar • O assistente pode criar, editar e consultar dados do sistema
          </p>
        </div>
      </div>
    </div>
  );
}