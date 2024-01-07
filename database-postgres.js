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
        const userInfo = await sql`SELECT l.id_tenant, l.id_login, l.nome, l.email, t.nome as nomeTenant, t.responsavel, t.telefone FROM login l
                                  JOIN tenant t ON l.id_tenant = t.id_tenant
                                  WHERE l.email = ${email}`;
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
        const { tenant, nome, cpf, estadocivil, id_cliente } = cliente;
    
        if (tenant === undefined || nome === undefined || cpf === undefined || estadocivil === undefined) {
            throw new Error('Missing required values');
        }
    
        // Se o id_cliente for fornecido, incluí-lo na inserção
        if (id_cliente !== undefined) {
            await sql`INSERT INTO CLIENTES (id_tenant, id_cliente, nome, cpf, estadocivil) VALUES (${tenant}, ${id_cliente}, ${nome}, ${cpf}, ${estadocivil})`;
        } else {
            // Caso contrário, deixar o banco de dados gerar o id_cliente automaticamente
            await sql`INSERT INTO CLIENTES (id_tenant, nome, cpf, estadocivil) VALUES (${tenant}, ${nome}, ${cpf}, ${estadocivil})`;
        }
    }

    async updateCliente(id, cliente) {
        const { tenant, nome, cpf, estadocivil } = cliente;
    
        if (tenant === undefined || nome === undefined || cpf === undefined || estadocivil === undefined) {
            throw new Error('Missing required values');
        }

        await sql`UPDATE CLIENTES SET nome = '${nome}', cpf = ${cpf}, estadocivil = ${estadocivil} WHERE id_tenant = ${tenant} AND id_cliente = ${id}`;
        
    }
    

    async obterNextIdCliente(tenant) {
        const nextIdResult = await sql`SELECT next_id FROM clientes_aux WHERE id_tenant = ${tenant}`;
        return nextIdResult[0];
    }

    async atualizarProximoIDClientesAux(tenant) {
        // Verificar se há uma linha correspondente ao tenant na tabela clientes_aux
        const existente = await sql`SELECT 1 FROM clientes_aux WHERE id_tenant = ${tenant}`;
    
        if (existente.length === 0) {
            // Se não existir, criar uma nova linha com next_id igual a 1
            await sql`INSERT INTO clientes_aux (id_tenant, next_id) VALUES (${tenant}, 1)`;
        } else {
            // Se já existir, atualizar o próximo ID
            await sql`UPDATE clientes_aux SET next_id = next_id + 1 WHERE id_tenant = ${tenant}`;
        }
    }
    

    async listarCliente({ tenant, search }) {
        let clientes;
    
        if (search) {
            clientes = await sql`select id_cliente, nome, cpf, estadocivil from CLIENTES where id_tenant = ${tenant} and nome ilike ${`%` + search + `%`}`;
        } else {
            clientes = await sql`select id_cliente, nome, cpf, estadocivil from CLIENTES where id_tenant = ${tenant}`;
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