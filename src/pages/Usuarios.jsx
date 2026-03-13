import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Loader2, Mail, Shield, User, CheckCircle, XCircle, Clock } from 'lucide-react';

const ROLE_LABELS = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
  user: { label: 'Usuário', color: 'bg-blue-100 text-blue-700' },
};

export default function Usuarios() {
  const qc = useQueryClient();
  const [showConvidar, setShowConvidar] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [convidando, setConvidando] = useState(false);
  const [aprovando, setAprovando] = useState(null);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleConvidar = async () => {
    if (!email) return toast.error('Informe o e-mail');
    setConvidando(true);
    try {
      await base44.users.inviteUser(email, role);
      toast.success(`Convite enviado para ${email}!`);
      setEmail('');
      setRole('user');
      setShowConvidar(false);
      qc.invalidateQueries({ queryKey: ['usuarios'] });
    } catch (e) {
      toast.error(e?.message || 'Erro ao enviar convite');
    } finally {
      setConvidando(false);
    }
  };

  const handleAprovar = async (u, aprovar) => {
    setAprovando(u.id);
    try {
      if (aprovar) {
        await base44.entities.User.update(u.id, { aprovado: true });
        toast.success(`${u.full_name || u.email} aprovado!`);
      } else {
        await base44.entities.User.delete(u.id);
        toast.success(`${u.full_name || u.email} removido do sistema.`);
      }
      qc.invalidateQueries({ queryKey: ['usuarios'] });
    } catch (e) {
      toast.error(e?.message || 'Erro ao processar solicitação');
    } finally {
      setAprovando(null);
    }
  };

  const pendentes = usuarios.filter(u => u.role !== 'admin' && !u.aprovado);
  const ativos = usuarios.filter(u => u.role === 'admin' || u.aprovado);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-500" /> Usuários
            </h1>
            <p className="text-slate-500 text-sm">Gerencie os usuários com acesso ao sistema</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowConvidar(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Convidar Usuário
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Pendentes de aprovação */}
        {pendentes.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Clock className="w-5 h-5" />
                Aguardando Aprovação ({pendentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendentes.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{u.full_name || '—'}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" /> {u.email}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => handleAprovar(u, true)}
                        disabled={aprovando === u.id}
                      >
                        {aprovando === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        <span className="ml-1 hidden sm:inline">Aprovar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleAprovar(u, false)}
                        disabled={aprovando === u.id}
                      >
                        <XCircle className="w-3 h-3" />
                        <span className="ml-1 hidden sm:inline">Recusar</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usuários ativos */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários ativos ({ativos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              </div>
            ) : ativos.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum usuário ativo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ativos.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{u.full_name || '—'}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" /> {u.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={ROLE_LABELS[u.role]?.color || 'bg-slate-100 text-slate-600'}>
                        <Shield className="w-3 h-3 mr-1" />
                        {ROLE_LABELS[u.role]?.label || u.role || 'Usuário'}
                      </Badge>
                      {u.role !== 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                          onClick={() => handleAprovar(u, false)}
                          disabled={aprovando === u.id}
                        >
                          Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConvidar} onOpenChange={setShowConvidar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" /> Convidar Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Perfil de acesso</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Admins têm acesso total ao sistema.</p>
            </div>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={handleConvidar}
              disabled={convidando || !email}
            >
              {convidando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Enviar Convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}