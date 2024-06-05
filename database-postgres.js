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
        const { tenant, nome, cpf, estadocivil, id_cliente, profissao, rg, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado } = cliente;
    
        if (tenant === undefined || nome === undefined || cpf === undefined || estadocivil === undefined || profissao === undefined || rg === undefined || telefone === undefined || email === undefined || cep === undefined || rua === undefined || numero === undefined || complemento === undefined || bairro === undefined || cidade === undefined || estado === undefined) {
            throw new Error('Missing required values');
        }
    
        if (id_cliente !== undefined) {
            await sql`INSERT INTO CLIENTES (id_tenant, id_cliente, nome, cpf, estadocivil, profissao, rg, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado) VALUES (${tenant}, ${id_cliente}, ${nome}, ${cpf}, ${estadocivil}, ${profissao}, ${rg}, ${telefone}, ${email}, ${cep}, ${rua}, ${numero}, ${complemento}, ${bairro}, ${cidade}, ${estado})`;
        } else {
            await sql`INSERT INTO CLIENTES (id_tenant, nome, cpf, estadocivil, profissao, rg, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado) VALUES (${tenant}, ${nome}, ${cpf}, ${estadocivil}, ${profissao}, ${rg}, ${telefone}, ${email}, ${cep}, ${rua}, ${numero}, ${complemento}, ${bairro}, ${cidade}, ${estado})`;
        }
    }
    
    async updateCliente(id, cliente) {
        const { tenant, nome, cpf, estadocivil, profissao, rg, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado } = cliente;
    
        if (tenant === undefined || nome === undefined || cpf === undefined || estadocivil === undefined || profissao === undefined || rg === undefined || telefone === undefined || email === undefined || cep === undefined || rua === undefined || numero === undefined || complemento === undefined || bairro === undefined || cidade === undefined || estado === undefined) {
            throw new Error('Missing required values');
        }
    
        await sql`UPDATE CLIENTES SET nome = ${nome}, cpf = ${cpf}, estadocivil = ${estadocivil}, profissao = ${profissao}, rg = ${rg}, telefone = ${telefone}, email = ${email}, cep = ${cep}, rua = ${rua}, numero = ${numero}, complemento = ${complemento}, bairro = ${bairro}, cidade = ${cidade}, estado = ${estado} WHERE id_tenant = ${tenant} AND id_cliente = ${id}`;
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
            clientes = await sql`SELECT id_cliente, nome, profissao, estadocivil, telefone, rg, cpf, email, cep, rua, numero, complemento, bairro, cidade, estado FROM CLIENTES WHERE id_tenant = ${tenant} AND nome ILIKE ${`%` + search + `%`}`;
        } else {
            clientes = await sql`SELECT id_cliente, nome, profissao, estadocivil, telefone, rg, cpf, email, cep, rua, numero, complemento, bairro, cidade, estado FROM CLIENTES WHERE id_tenant = ${tenant}`;
        }
    
        return clientes;
    }    
    
    async deleteCliente(id, tenant){
        await sql`delete from CLIENTES where id_cliente = ${id} and id_tenant = ${tenant}`;
    }

    // Fim clientes

    // Reus

    async verificarCPFCNPJExistente(cpfcnpj) {
        const resultado = await sql`SELECT EXISTS (SELECT 1 FROM reus WHERE cpfcnpj = ${cpfcnpj})`;
        return resultado[0].exists;
    }

    async criarReu(reu) {
        const { tenant, nome, cpfcnpj, estadocivil, id_reu, profissao, rg, telefone, email, endereco_completo_com_cep } = reu;
    
        if (tenant === undefined || nome === undefined || cpfcnpj === undefined || estadocivil === undefined || profissao === undefined || rg === undefined || telefone === undefined || email === undefined || endereco_completo_com_cep === undefined) {
            throw new Error('Missing required values');
        }
    
        // Se o id_reu for fornecido, incluí-lo na inserção
        if (id_reu !== undefined) {
            await sql`INSERT INTO REUS (id_tenant, id_reu, nome, cpfcnpj, estadocivil, profissao, rg, telefone, email, endereco_completo_com_cep) VALUES (${tenant}, ${id_reu}, ${nome}, ${cpfcnpj}, ${estadocivil}, ${profissao}, ${rg}, ${telefone}, ${email}, ${endereco_completo_com_cep})`;
        } else {
            // Caso contrário, deixar o banco de dados gerar o id_reu automaticamente
            await sql`INSERT INTO REUS (id_tenant, nome, cpfcnpj, estadocivil, profissao, rg, telefone, email, endereco_completo_com_cep) VALUES (${tenant}, ${nome}, ${cpfcnpj}, ${estadocivil}, ${profissao}, ${rg}, ${telefone}, ${email}, ${endereco_completo_com_cep})`;
        }
    }
    
    async updateReu(id, reu) {
        const { tenant, nome, cpfcnpj, estadocivil, profissao, rg, telefone, email, endereco_completo_com_cep } = reu;
    
        if (tenant === undefined || nome === undefined || cpfcnpj === undefined || estadocivil === undefined || profissao === undefined || rg === undefined || telefone === undefined || email === undefined || endereco_completo_com_cep === undefined ) {
            throw new Error('Missing required values');
        }
    
        await sql`UPDATE REUS SET nome = ${nome}, cpfcnpj = ${cpfcnpj}, estadocivil = ${estadocivil}, profissao = ${profissao}, rg = ${rg}, telefone = ${telefone}, email = ${email}, endereco_completo_com_cep = ${endereco_completo_com_cep} WHERE id_tenant = ${tenant} AND id_reu = ${id}`;
    }
    
    async obterNextIdReus(tenant) {
        const nextIdResult = await sql`SELECT next_id FROM reus_aux WHERE id_tenant = ${tenant}`;
        return nextIdResult[0];
    }

    async atualizarProximoIDReusAux(tenant) {
        // Verificar se há uma linha correspondente ao tenant na tabela reus_aux
        const existente = await sql`SELECT 1 FROM reus_aux WHERE id_tenant = ${tenant}`;
    
        if (existente.length === 0) {
            // Se não existir, criar uma nova linha com next_id igual a 1
            await sql`INSERT INTO reus_aux (id_tenant, next_id) VALUES (${tenant}, 1)`;
        } else {
            // Se já existir, atualizar o próximo ID
            await sql`UPDATE reus_aux SET next_id = next_id + 1 WHERE id_tenant = ${tenant}`;
        }
    }
    
    async listarReus({ tenant, search }) {
        let reus;
    
        if (search) {
            reus = await sql`SELECT id_reu, nome, cpfcnpj, estadocivil, profissao, rg, telefone, email, endereco_completo_com_cep FROM REUS WHERE id_tenant = ${tenant} AND nome ILIKE ${`%` + search + `%`}`;
        } else {
            reus = await sql`SELECT id_reu, nome, cpfcnpj, estadocivil, profissao, rg, telefone, email, endereco_completo_com_cep FROM REUS WHERE id_tenant = ${tenant}`;
        }
    
        return reus;
    }
    
    async deleteReu(id, tenant){
        await sql`delete from REUS where id_reu = ${id} and id_tenant = ${tenant}`;
    }

    // Fim reu

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

