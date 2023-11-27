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
        const emailLowerCase = email.toLowerCase(); // Converter para minúsculas
        const resultado = await sql`SELECT EXISTS (SELECT 1 FROM login WHERE email = ${emailLowerCase})`;
        return resultado[0].exists;
    }

    async obterSenha(email) {
        const emailLowerCase = email.toLowerCase(); // Converter para minúsculas
        const resultado = await sql`SELECT senha FROM login WHERE email = ${emailLowerCase}`;
        if (resultado.length > 0) {
            return resultado[0].senha;
        } else {
            // Retorne null ou uma string que indique que a senha não foi encontrada
            return null;
        }
    }

    async obterInformacoesUsuario(email) {
        const resultado = await sql`SELECT tenant, nome, email FROM login WHERE email = ${email}`;
        if (resultado.length > 0) {
            return resultado[0];
        } else {
            return null;
        }
    }

    // Clientes

    async verificarCPFExistente(cpf) {
        const resultado = await sql`SELECT EXISTS (SELECT 1 FROM clientes WHERE cpf = ${cpf})`;
        return resultado[0].exists;
    }

    async criarCliente(cliente) {
        const { tenant, nome, cpf, estadocivil } = cliente;
    
        if (tenant === undefined || nome === undefined || cpf === undefined || estadocivil === undefined) {
            throw new Error('Undefined values are not allowed');
        }
    
        await sql`insert into CLIENTES (tenant, nome, cpf, estadocivil) values (${tenant}, ${nome}, ${cpf}, ${estadocivil})`;
    }

    async listarCliente(search) {
        let clientes

        if (search) {
            clientes = await sql`select clientid, nome, cpf, estadocivil from CLIENTES where nome ilike ${`%` + search + `%`}`
        } else {
            clientes = await sql`select clientid, nome, cpf, estadocivil from CLIENTES`
        }

        return clientes
    }

}