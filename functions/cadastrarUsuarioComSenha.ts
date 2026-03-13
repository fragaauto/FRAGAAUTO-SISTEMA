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

    // Cadastra o usuário usando o serviço de auth
    const novoUsuario = await base44.asServiceRole.auth.createUser({
      email,
      password,
      full_name: full_name || email.split('@')[0],
      role: role || 'user',
      aprovado: true, // Admin cadastrando já aprova automaticamente
    });

    return Response.json({ 
      success: true, 
      usuario: novoUsuario,
      message: 'Usuário cadastrado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return Response.json({ 
      error: error.message || 'Erro ao cadastrar usuário' 
    }, { status: 500 });
  }
});