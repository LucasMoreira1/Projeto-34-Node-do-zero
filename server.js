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

server.delete('/login/:id', async (request, reply) => {
    const loginID = request.params.id

    await database.delete(loginID)

    return reply.status(204).send()
})

server.listen({
    host: '0.0.0.0',
    port: process.env.PORT ?? 3333,
})