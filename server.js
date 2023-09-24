import { fastify } from 'fastify'
// import { DatabaseMemory } from './database-memory.js'
import { DatabasePostgres } from './database-postgres.js'

const server = fastify()

const database = new DatabasePostgres()

server.post('/cliente', async (request, reply) => {
    const { nome, email } = request.body

    await database.create({
        nome,
        email,
    })

    return reply.status(201).send()
})

server.get('/cliente', async (request) => {
    const search = request.query.search

    const cliente = await database.list(search)

    return cliente
})

server.put('/cliente/:id', async (request, reply) => {
    const clienteID = request.params.id

    const { nome, email } = request.body

    await database.update(clienteID, {
        nome,
        email,
    })

    return reply.status(204).send()
})

server.delete('/cliente/:id', async (request, reply) => {
    const clienteID = request.params.id

    await database.delete(clienteID)

    return reply.status(204).send()
})

server.listen({
    port: process.env.PORT ?? 3333,
})