import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import { DatabasePostgres } from './database-postgres.js'
import fs from 'fs'
import Docxtemplater from 'docxtemplater'
import JSZip from 'jszip'

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

    try {
        // Verificar se o email existe no banco de dados
        const emailExistente = await database.verificarEmailLogin(email.toLowerCase());

        if (emailExistente) {
            // Obter informações do usuário do banco de dados
            const userInfo = await database.obterInformacoesUsuario(email.toLowerCase());

            // Obter a senha armazenada no banco de dados
            const senhaArmazenada = await database.obterSenha(email.toLowerCase());

            // Comparar a senha fornecida com a senha armazenada no banco de dados
            if (senha === senhaArmazenada) {
                // Obter informações do Tenant com base no id_tenant do usuário
                const tenantInfo = await database.obterTenantPorId(userInfo.id_tenant);

                // Credenciais válidas, incluir informações do usuário e do Tenant na resposta
                reply.status(200).send({ message: 'Credenciais válidas', userInfo, tenantInfo });
            } else {
                reply.status(401).send({ message: 'Credenciais inválidas' });
            }
        } else {
            reply.status(401).send({ message: 'Email não cadastrado' });
        }
    } catch (error) {
        console.error('Erro ao validar login:', error);
        reply.status(500).send({ message: 'Erro interno do servidor', details: error.message });
    }
});

// Clientes

// Create
server.post('/clientes', async (request, reply) => {
    const { tenant, nome, cpf, estadocivil, profissao, rg, orgemissor, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado } = request.body;

    console.log('Received request with body:', request.body);

    if (!tenant || !nome || !cpf || !estadocivil || !profissao || !rg || !telefone || !email || !cep || !rua || !numero || !bairro || !cidade || !estado) {
        return reply.status(400).send({ error: 'Faltando campos obrigatórios' });
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
            profissao,
            rg,
            orgemissor,
            telefone,
            email,
            cep,
            rua,
            numero,
            complemento,
            bairro,
            cidade,
            estado
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
    const clienteID = request.params.id;

    const { tenant, nome, cpf, estadocivil, profissao, rg, orgemissor, telefone, email, cep, rua, numero, complemento, bairro, cidade, estado } = request.body;

    if (!tenant || !nome || !cpf || !estadocivil || !profissao || !rg || !telefone || !email || !cep || !rua || !numero || !complemento || !bairro || !cidade || !estado) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
        await database.updateCliente(clienteID, {
            tenant,
            nome,
            cpf,
            estadocivil,
            profissao,
            rg,
            orgemissor,
            telefone,
            email,
            cep,
            rua,
            numero,
            complemento,
            bairro,
            cidade,
            estado
        });

        return reply.status(201).send();
    } catch (error) {
        console.error('Erro durante a atualização no banco de dados:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor', details: error.message });
    }
});

// Delete
server.delete('/clientes/:id', async (request, reply) => {
    
    const clienteID = request.params.id
    const { tenant } = request.body

    await database.deleteCliente(clienteID, tenant)

    return reply.status(204).send()
})

// FIM CLIENTES

// REUS

// Create
server.post('/reus', async (request, reply) => {
    const { tenant, nome, cpfcnpj, estadocivil, profissao, rg, telefone, email, endereco_completo_com_cep } = request.body;

    console.log('Received request with body:', request.body);

    if (!tenant || !nome || !cpfcnpj || !estadocivil || !profissao || !rg || !telefone || !email || !endereco_completo_com_cep) {
        return reply.status(400).send({ error: 'Faltando campos obrigatórios' });
    }

    try {
        // Atualizar próximo ID na tabela reus_aux
        await database.atualizarProximoIDReusAux(tenant);

        // Obtém o próximo ID para o tenant da tabela reus_aux
        const nextIdResult = await database.obterNextIdReus(tenant);
        const nextId = nextIdResult.next_id;

        // Cria o reu com o próximo ID
        await database.criarReu({
            tenant,
            id_reu: nextId,
            nome,
            cpfcnpj,
            estadocivil,
            profissao,
            rg,
            telefone,
            email,
            endereco_completo_com_cep
        });

        return reply.status(201).send({ reuID: nextId });
    } catch (error) {
        console.error('Erro durante a criação no banco de dados:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor', details: error.message });
    }
});

// Read
server.get('/reus/:tenant', async (request) => {
    const { search } = request.query;
    const { tenant } = request.params;

    const reus = await database.listarReus({ tenant, search });

    return reus;
});

// Update
server.put('/reus/:id', async (request, reply) => {
    const reusID = request.params.id;

    const { tenant, nome, cpfcnpj, estadocivil, profissao, rg, telefone, email, endereco_completo_com_cep } = request.body;

    if (!tenant || !nome || !cpfcnpj || !estadocivil || !profissao || !rg || !telefone || !email || !endereco_completo_com_cep) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
        await database.updateReus(reusID, {
            tenant,
            nome,
            cpfcnpj,
            estadocivil,
            profissao,
            rg,
            telefone,
            email,
            endereco_completo_com_cep
        });

        return reply.status(201).send();
    } catch (error) {
        console.error('Erro durante a atualização no banco de dados:', error);
        return reply.status(500).send({ error: 'Erro interno do servidor', details: error.message });
    }
});

// Delete
server.delete('/reus/:id', async (request, reply) => {
    
    const reuID = request.params.id
    const { tenant } = request.body

    await database.deleteReu(reuID, tenant)

    return reply.status(204).send()
})

// FIM REUS

// Gerar DOCX 

// server.register(require('fastify-formbody'));

server.post('/gerar-docx', async (request, reply) => {
    try {
        // Obtenha os dados do cliente do corpo da solicitação
        const {
            clienteID,
            clienteNome,
            clienteCPF,
            clienteEstadoCivil,
            clienteProfissao,
            clienteRG,
            clienteOrgEmissor,
            clienteTelefone,
            clienteEmail,
            clienteCEP,
            clienteRua,
            clienteNumero,
            clienteComplemento,
            clienteBairro,
            clienteCidade,
            clienteEstado,
            tenantCidade,
            tenantEstado,
            tenantResponsavel,
            tenantEmail,
            tipoDocumento
        } = request.body;

        // Obtenha a data atual
        const Data = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    
        // Caminho para o modelo DOCX
        let templatePath;
        let docDownload;
        switch (tipoDocumento) {
            case '1':
                templatePath = './src/documents/Modelo_Contrato_Honorarios_Advocaticios.docx';
                docDownload = `${clienteID}_${clienteNome}_Contrato_Honorarios_Advocaticios.docx`;
                break;
            case '2':
                templatePath = './src/documents/Modelo_Declaracao_Hipossuficiencia.docx';
                docDownload = `${clienteID}_${clienteNome}_Declaracao_Hipossuficiencia.docx`;
                break;
            case '3':
                templatePath = './src/documents/Modelo_Manifesto.docx';
                docDownload = `${clienteID}_${clienteNome}_Manifesto.docx`;
                break;
            case '4':
                templatePath = './src/documents/Modelo_Procuracao.docx';
                docDownload = `${clienteID}_${clienteNome}_Procuracao.docx`;
                break;
            default:
                throw new Error('Tipo de documento inválido');
        }
        // Carregue o conteúdo do modelo DOCX
        const templateContent = fs.readFileSync(templatePath, 'binary');
    
        // Crie um objeto de dados para preencher o modelo
        const data = {
            clienteID,
            clienteNome,
            clienteCPF,
            clienteEstadoCivil,
            clienteProfissao,
            clienteRG,
            clienteOrgEmissor,
            clienteTelefone,
            clienteEmail,
            clienteCEP,
            clienteRua,
            clienteNumero,
            clienteComplemento,
            clienteBairro,
            clienteCidade,
            clienteEstado,
            tenantCidade,
            tenantEstado,
            tenantResponsavel,
            tenantEmail,
            Data 
        };
    
        // Crie um novo objeto Docxtemplater
        const zip = new JSZip(templateContent);
        const doc = new Docxtemplater(zip, {
            parser: tag => ({
                get(scope, context) {
                    return scope[tag] || tag;
                }
            })
        });
    
        // Preencha o modelo com os dados
        doc.setData(data);
    
        // Renderize o documento
        doc.render();
    
        // Converta o documento para um buffer
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    
        // Defina os cabeçalhos para download
        reply.header('Content-disposition', `attachment; filename=${docDownload}`);
        reply.header('Content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
        // Envie o documento como resposta
        reply.send(buffer);
      } catch (error) {
        console.error('Erro ao gerar o documento DOCX:', error);
        reply.status(500).send({ error: 'Erro interno do servidor', details: error.message });
      }
    });

////////////////////////////////////////////////////////////////

server.listen({
    host: '0.0.0.0',
    port: process.env.PORT ?? 3333,
})