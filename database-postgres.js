import { randomUUID } from "node:crypto"
import { sql } from './db.js'

export class DatabasePostgres {

    // Tenant (Escritorio)

    async criarTenant(dadosTenant) {
        const { nome, responsavel, email, telefone } = dadosTenant;
    
        // Adicione a cláusula RETURNING id à sua consulta SQL
        const resultado = await sql`INSERT INTO TENANT (nome, responsavel, email, telefone) VALUES (${nome}, ${responsavel}, ${email}, ${telefone}) RETURNING id_tenant`;
    
        // O resultado agora contém o ID retornado
        const novoTenantId = resultado[0]
    
        return novoTenantId;
    }
    

    async verificarEmailTenant(email) {
        const emailLowerCase = email.toLowerCase(); // Converter para minúsculas
        const resultado = await sql`SELECT EXISTS (SELECT 1 FROM tenant WHERE email = ${emailLowerCase})`;
        return resultado[0].exists;
    }

     

    // Login

    async criarLogin(dadosLogin) {
        const { id_tenant, nome, email, senha } = dadosLogin

        await sql`insert into LOGIN (id_tenant, nome, email, senha) values (${id_tenant}, ${nome}, ${email}, ${senha})`
    }

    async verificarEmailLogin(email) {
        const emailLowerCase = email.toLowerCase(); // Converter para minúsculas
        const resultado = await sql`SELECT EXISTS (SELECT 1 FROM login WHERE email = ${emailLowerCase})`;
        return resultado[0].exists;
    }

    // Validacao Login

    async obterInformacoesUsuario(email) {
        const userInfo = await sql`SELECT id_tenant, id_login, nome, email FROM login WHERE email = ${email}`;
        return userInfo[0];
    }

    async obterSenha(email) {
        const senha = await sql`SELECT senha FROM login WHERE email = ${email}`;
        return senha[0].senha;
    }


    // Clientes

    async verificarCPFExistente(cpf) {
        const resultado = await sql`SELECT EXISTS (SELECT 1 FROM clientes WHERE cpf = ${cpf})`;
        return resultado[0].exists;
    }

    async criarCliente(cliente) {
        const { id_tenant, nome, cpf, estadocivil } = cliente;
    
        if (id_tenant === undefined || nome === undefined || cpf === undefined || estadocivil === undefined) {
            throw new Error('Undefined values are not allowed');
        }
    
        await sql`insert into CLIENTES (id_tenant, nome, cpf, estadocivil) values (${id_tenant}, ${nome}, ${cpf}, ${estadocivil})`;
    }

    async listarCliente({ id_tenant, search }) {
        let clientes;
    
        if (search) {
            clientes = await sql`select clientid, nome, cpf, estadocivil from CLIENTES where id_tenant = ${id_tenant} and nome ilike ${`%` + search + `%`}`;
        } else {
            clientes = await sql`select clientid, nome, cpf, estadocivil from CLIENTES where id_tenant = ${id_tenant}`;
        }
    
        return clientes;
    }

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
        const { nome, email, id_tenant, senha } = login

        await sql`insert into LOGIN (nome, email, id_tenant, senha) values (${nome}, ${email}, ${id_tenant}, ${senha})`
    }

    async update(id, login) {
        const {id_tenant,nome,email,senha,datacadastro} = login

        await sql`update LOGIN set nome = ${nome}, email = ${email} WHERE id = ${id}`

    }

    async delete(id){
        await sql`delete from LOGIN where email = ${id}`
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
    
}