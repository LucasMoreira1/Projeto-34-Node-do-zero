import { randomUUID } from "node:crypto"
import { sql } from './db.js'

export class DatabasePostgres {

    async list(search) {
        let clientes

        if (search) {
            clientes = await sql`select * from clientes where nome ilike ${`%` + search + `%`}` 
        } else {
            clientes = await sql`select * from clientes`
        }

        return clientes
    }

    async create(cliente) {
        const { nome, email} = cliente

        await sql`insert into clientes (nome, email) values (${nome}, ${email})`
    }

    async update(id, cliente) {
        const {nome,email} = cliente

        await sql`update clientes set nome = ${nome}, email = ${email} WHERE id = ${id}`

    }

    async delete(id){
        await sql`delete from clientes where id = ${id}`
    }

}