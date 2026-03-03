import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Mail, Shield, Loader2, Edit2, Trash2, UserCog, Wrench } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ROLE_LABELS = {
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-800', icon: Shield },
  tecnico: { label: 'Técnico', color: 'bg-blue-100 text-blue-800', icon: Wrench },
  user: { label: 'Usuário', color: 'bg-slate-100 text-slate-700', icon: Users },
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState('user');
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState(null);
  const [deleteUserId, setDeleteUserId] = React.useState(null);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      await base44.users.inviteUser(email, role === 'admin' ? 'admin' : 'user');
      // Se for técnico, atualizar o role depois do convite
      if (role === 'tecnico') {
        // Aguarda um pouco e tenta encontrar o usuário para atualizar
        // Nota: o usuário só estará disponível após aceitar o convite
      }
    },
    onSuccess: () => {
      toast.success('Convite enviado! O usuário receberá um email com instruções de acesso.');
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRole('user');
      queryClient.invalidateQueries(['usuarios']);
    },
    onError: (error) => {
      toast.error('Erro ao enviar convite: ' + error.message);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      toast.success('Usuário atualizado!');
      queryClient.invalidateQueries(['usuarios']);
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      toast.success('Usuário excluído!');
      queryClient.invalidateQueries(['usuarios']);
      setDeleteUserId(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir usuário: ' + error.message);
    }
  });

  const openEditDialog = (user) => {
    setEditingUser({ ...user });
    setShowEditDialog(true);
  };

  const handleInvite = () => {
    if (!inviteEmail) { toast.error('Digite um email válido'); return; }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleSaveEdit = () => {
    updateUserMutation.mutate({
      id: editingUser.id,
      data: { role: editingUser.role, especialidade: editingUser.especialidade }
    });
  };

  const tecnicos = usuarios.filter(u => u.role === 'tecnico');
  const outros = usuarios.filter(u => u.role !== 'tecnico');

  const UserCard = ({ user }) => {
    const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.user;
    const RoleIcon = roleInfo.icon;
    return (
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${user.role === 'tecnico' ? 'bg-blue-100' : user.role === 'admin' ? 'bg-purple-100' : 'bg-slate-100'}`}>
              <RoleIcon className={`w-5 h-5 ${user.role === 'tecnico' ? 'text-blue-600' : user.role === 'admin' ? 'text-purple-600' : 'text-slate-600'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-800 truncate">{user.full_name || user.email}</p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              {user.especialidade && (
                <p className="text-xs text-blue-600 mt-0.5">🔧 {user.especialidade}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteUserId(user.id)} className="text-red-500 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-500" />
                Gerenciar Usuários
              </h1>
              <p className="text-slate-500">
                {usuarios.length} usuários • {tecnicos.length} técnico(s)
              </p>
            </div>
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Convidar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Novo Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="usuario@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Perfil de Acesso</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      {inviteRole === 'admin' && 'Administradores têm acesso completo ao sistema'}
                      {inviteRole === 'tecnico' && 'Técnicos podem ser lançados nos atendimentos como responsáveis'}
                      {inviteRole === 'user' && 'Usuários têm acesso padrão ao sistema'}
                    </p>
                  </div>
                  <Button
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {inviteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Enviar Convite
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            {/* Técnicos */}
            {tecnicos.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Técnicos ({tecnicos.length})
                </h2>
                <div className="space-y-3">
                  {tecnicos.map(u => <UserCard key={u.id} user={u} />)}
                </div>
              </div>
            )}

            {/* Outros usuários */}
            <div>
              {tecnicos.length > 0 && (
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Outros Usuários
                </h2>
              )}
              <div className="space-y-3">
                {outros.map(u => <UserCard key={u.id} user={u} />)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-4">
              <div>
                <Label>Nome</Label>
                <Input value={editingUser.full_name || ''} disabled className="bg-slate-100" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editingUser.email || ''} disabled className="bg-slate-100" />
              </div>
              <div>
                <Label>Perfil de Acesso</Label>
                <Select value={editingUser.role || 'user'} onValueChange={(v) => setEditingUser({ ...editingUser, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingUser.role === 'tecnico' && (
                <div>
                  <Label>Especialidade</Label>
                  <Input
                    value={editingUser.especialidade || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, especialidade: e.target.value })}
                    placeholder="Ex: Elétrica, Vidros, Portas..."
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateUserMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
              {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário perderá acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteUserMutation.mutate(deleteUserId)} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}