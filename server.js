import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
// import { DatabaseMemory } from './database-memory.js'
import { DatabasePostgres } from './database-postgres.js'

const server = fastify()

server.register(fastifyCors, {
    // Configurações do CORS
    origin: '*', // Permitir todas as origens (não recomendado para produção)
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
  });

const database = new DatabasePostgres()

// Tenant do sistema. (Criar escritorios)

server.post('/tenant', async (request, reply) => {
    const { nome, responsavel, email, telefone } = request.body;

    // Chame a função criarTenant no seu banco de dados e obtenha o ID retornado
    const novoTenantId = await database.criarTenant({
        nome,
        responsavel,
        email,
        telefone
    });

    // Envie o ID do novo Tenant como resposta para o frontend
    return reply.status(201).send({ novoTenantId });
});


server.get('/tenant/:email', async (request) => {
    const { email } = request.params;

    // Converter para minúsculas antes de verificar
    const emailExistente = await database.verificarEmailTenant(email.toLowerCase());

    return { existe: emailExistente };
});

// FIM TENANT
 
// Login do sistema.

server.post('/login', async (request, reply) => {
    const { id_tenant, nome, email, senha } = request.body

    await database.criarLogin({
        id_tenant,
        nome,
        email,
        senha
    })

    return reply.status(201).send()
})

server.get('/login/:email', async (request) => {
    const { email } = request.params;

    // Converter para minúsculas antes de verificar
    const emailExistente = await database.verificarEmailLogin(email.toLowerCase());

    return { existe: emailExistente };
});

// Validacao Login

server.post('/login/validacao', async (request, reply) => {
    const { email, senha } = request.body;

    // Verificar se o email existe no banco de dados
    const emailExistente = await database.verificarEmailLogin(email.toLowerCase());

    if (emailExistente) {
        // Obter informações do usuário do banco de dados
        const userInfo = await database.obterInformacoesUsuario(email.toLowerCase());

        // Obter a senha armazenada no banco de dados
        const senhaArmazenada = await database.obterSenha(email.toLowerCase());

        // Comparar a senha fornecida com a senha armazenada no banco de dados
        if (senha === senhaArmazenada) {
            // Credenciais válidas, incluir informações do usuário na resposta
            reply.status(200).send({ message: 'Credenciais válidas', userInfo });
        } else {
            reply.status(401).send({ message: 'Credenciais inválidas' });
        }
    } else {
        reply.status(401).send({ message: 'Email não cadastrado' });
    }
});

// Clientes

// Create
server.post('/clientes', async (request, reply) => {
    const { tenant, nome, cpf, estadocivil } = request.body;

    console.log('Received request with body:', request.body);

    if (!tenant || !nome || !cpf || !estadocivil) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
        // Atualizar próximo ID na tabela clientes_aux
        await database.atualizarProximoIDClientesAux(tenant);

        // Obtém o próximo ID para o tenant da tabela clientes_aux
        const nextIdResult = await database.obterNextIdCliente(tenant);
        const nextId = nextIdResult.next_id;

        // Cria o cliente com o próximo ID
        await database.criarCliente({
            tenant,
            id_cliente: nextId,
            nome,
            cpf,
            estadocivil,
        });

        return reply.status(201).send({ clienteID: nextId });
    } catch (error) {
        console.error('Erro durante a criação no banco de dados:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor', details: error.message });
    }
});

// Read
server.get('/clientes/:tenant', async (request) => {
    const { search } = request.query;
    const { tenant } = request.params;

    const clientes = await database.listarCliente({ tenant, search });

    return clientes;
});

// Update

server.put('/clientes/:id', async (request, reply) => {
    const clienteID = request.params.id

    const { tenant, id_cliente, nome, cpf, estadocivil } = request.body

    await database.update(clienteID, {
        tenant,
        id_cliente,
        nome,
        cpf,
        estadocivil,
    })

    return reply.status(204).send()
})

////////////////////////////////////////////////////////////////

server.put('/login2/:id', async (request, reply) => {
    const loginID = request.params.id

    const { tenant, nome, email, senha, dataCadastro } = request.body

    await database.update(loginID, {
        tenant,
        nome,
        email,
        senha,
        dataCadastro,
    })

    return reply.status(204).send()
})

server.delete('/login2/:email', async (request, reply) => {
    const loginID = request.params.id

    await database.delete(loginID)

    return reply.status(204).send()
})

server.get('/login2/:email', async (request) => {
    const { email } = request.params;

    // Converter para minúsculas antes de verificar
    const emailExistente = await database.verificarEmailExistente(email.toLowerCase());

    return { existe: emailExistente };
});


server.listen({
    host: '0.0.0.0',
    port: process.env.PORT ?? 3333,
})