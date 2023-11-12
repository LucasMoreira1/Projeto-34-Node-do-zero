import { randomUUID } from "node:crypto"
import { sql } from './db.js'

export class DatabasePostgres {

    async list(search) {
        let logins

        if (search) {
            logins = await sql`select * from LOGIN where nome ilike ${`%` + search + `%`}`
        } else {
            logins = await sql`select * from LOGIN`
        }

        return logins
    }

    async create(login) {
        const { nome, email, tenant, senha } = login

        await sql`insert into LOGIN (nome, email, tenant, senha) values (${nome}, ${email}, ${tenant}, ${senha})`
    }

    async update(id, login) {
        const {tenant,nome,email,senha,datacadastro} = login

        await sql`update LOGIN set nome = ${nome}, email = ${email} WHERE id = ${id}`

    }

    async delete(id){
        await sql`delete from LOGIN where email = ${id}`
    }

    async verificarEmailExistente(email) {
        const resultado = await sql`SELECT EXISTS (SELECT 1 FROM login WHERE email = ${email})`;
        return resultado[0].exists;
    }

    async obterSenha(email) {
        const resultado = await sql`SELECT senha FROM login WHERE email = ${email}`;
        if (resultado.length > 0) {
            return resultado[0].senha;
        } else {
            // Retorne null ou uma string que indique que a senha não foi encontrada
            return null;
        }
    }

}