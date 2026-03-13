import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica se o usuário é admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas admins podem cadastrar usuários.' }, { status: 403 });
    }

    const { email, password, full_name, role } = await req.json();

    // Validações
    if (!email || !password) {
      return Response.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }

    // Primeiro, envia o convite para criar a conta
    await base44.asServiceRole.users.inviteUser(email, role || 'user');
    
    // Aguarda um pouco para o usuário ser criado
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Busca o usuário criado
    const usuarios = await base44.asServiceRole.entities.User.filter({ email });
    
    if (usuarios.length === 0) {
      throw new Error('Usuário não foi criado corretamente');
    }
    
    const novoUsuario = usuarios[0];
    
    // Atualiza com o nome completo e aprova
    await base44.asServiceRole.entities.User.update(novoUsuario.id, {
      full_name: full_name || email.split('@')[0],
      aprovado: true
    });

    return Response.json({ 
      success: true, 
      usuario: { ...novoUsuario, full_name: full_name || email.split('@')[0] },
      message: `Usuário cadastrado. Login: ${email} / Senha: definir no primeiro acesso via link do email`
    });

  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return Response.json({ 
      error: error.message || 'Erro ao cadastrar usuário' 
    }, { status: 500 });
  }
});