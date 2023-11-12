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

server.post('/login', async (request, reply) => {
    const { nome, email, tenant, senha } = request.body

    await database.create({
        nome,
        email,
        tenant,
        senha,
    })

    return reply.status(201).send()
})

server.get('/login', async (request) => {
    const search = request.query.search

    const login = await database.list(search)

    return login
})

server.put('/login/:id', async (request, reply) => {
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

server.delete('/login/:email', async (request, reply) => {
    const loginID = request.params.id

    await database.delete(loginID)

    return reply.status(204).send()
})

server.get('/login/:email', async (request) => {
    const { email } = request.params;

    // Você pode ajustar esta função conforme necessário com a lógica do seu banco de dados
    const emailExistente = await database.verificarEmailExistente(email);

    return { existe: emailExistente };
});

// ...

server.post('/login/validacao', async (request, reply) => {
    const { email, senha } = request.body;

    // Verificar se o email existe no banco de dados
    const emailExistente = await database.verificarEmailExistente(email);

    if (emailExistente) {
        // Obter a senha armazenada no banco de dados
        const senhaArmazenada = await database.obterSenha(email);

        // Comparar a senha fornecida com a senha armazenada no banco de dados
        if (senha === senhaArmazenada) {
            reply.status(200).send({ message: 'Credenciais válidas' });
        } else {
            reply.status(401).send({ message: 'Credenciais inválidas' });
        }
    } else {
        reply.status(401).send({ message: 'Email não cadastrado' });
    }
    console.log('Email Existente:', emailExistente);
    console.log('Senha Armazenada:', senhaArmazenada);
});


server.listen({
    host: '0.0.0.0',
    port: process.env.PORT ?? 3333,
})