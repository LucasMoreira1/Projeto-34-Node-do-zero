import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import { DatabasePostgres } from './database-postgres.js'
import fs from 'fs'
import Docxtemplater from 'docxtemplater'
import JSZip from 'jszip'
import 'dotenv/config'
import axios from 'axios'
import formbody from '@fastify/formbody' // Importação do plugin
// const { GoogleGenerativeAI } = require("@google/generative-ai");
import { GoogleGenerativeAI } from '@google/generative-ai'
import ServerlessHttp from 'serverless-http'

const server = fastify()

// Registro dos plugins
server.register(fastifyCors, {
    origin: '*', // Permitir todas as origens (não recomendado para produção)
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
})

server.register(formbody) // Registro do plugin formbody separadamente


const database = new DatabasePostgres()

// Tenant do sistema. (Criar escritorios)

server.get('/hello', async (request, reply) => {
    reply.send("Hello World");
});

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
server.get('/clientes/:tenant', async (request, reply) => {
    const { search } = request.query;
    const { tenant } = request.params;

    try {
        const clientes = await database.listarCliente({ tenant, search });
        reply.send(clientes);
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        reply.status(500).send({ error: 'Erro ao listar clientes' });
    }
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

//
// Whatsapp
//
const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN } = process.env;

const chatHistory = {}; // Armazenar o histórico das conversas

server.post('/webhook', async (request, reply) => {
    // console.log('Incoming webhook message:', JSON.stringify(request.body, null, 2));

    const message = request.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
    // console.log(message)

    if (message?.type === 'text') {
        const business_phone_number_id = request.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;
        const fromNumber = message.from;
        const senderName = request.body.entry?.[0].changes?.[0].value?.contacts?.[0].profile?.name; // Extrai o nome do remetente da mensagem
        const messageText = message.text.body;

        // Adiciona histórico de conversa se não existir
        if (!chatHistory[fromNumber]) {
            chatHistory[fromNumber] = [
                {
                    role: "user",
                    // parts: [{ text: ``}],
                    parts: [{ text: `Seu nome será Stella e é uma assistente virtual para atendimento do sistema SAAS Advogado Digital. Na introdução, sempre informar o nome da pessoa, se houver. Preciso que seja bem amigável e use emojis na conversa, sem exagerar. O valor da mensalidade é de R$79,00 e se for necessário mais informações, solicite que entre em contato com o Lucas Moreira (12)98155-9778.` }],
                }
            ];
        }

        // Adiciona a mensagem recebida ao histórico
        chatHistory[fromNumber].push({
            role: "user",
            parts: [{ text: messageText }],
        });

        // Integração com a função resposta_gemini
        try {
            const geminiResponse = await resposta_gemini(chatHistory[fromNumber], senderName, fromNumber); // Passa o histórico atualizado como parâmetro
            // const geminiText = geminiResponse.text; // Extrai o texto da resposta de gemini

            // Adiciona a resposta de Gemini ao histórico
            chatHistory[fromNumber].push({
                role: "model",
                parts: [{ text: geminiResponse }],
            });

            await axios({
                method: 'POST',
                url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
                headers: {
                    Authorization: `Bearer ${GRAPH_API_TOKEN}`,
                },
                data: {
                    messaging_product: 'whatsapp',
                    to: fromNumber,
                    text: { body: geminiResponse }, // Envia a resposta de gemini
                    context: {
                        message_id: message.id,
                    },
                },
            });

            await axios({
                method: 'POST',
                url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
                headers: {
                    Authorization: `Bearer ${GRAPH_API_TOKEN}`,
                },
                data: {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: message.id,
                },
            });
        } catch (error) {
            console.error('Erro ao processar a mensagem:', error);
        }
    }

    reply.code(200).send();
});

server.get('/webhook', (request, reply) => {
    const mode = request.query['hub.mode']
    const token = request.query['hub.verify_token']
    const challenge = request.query['hub.challenge']

    // check the mode and token sent are correct
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        // respond with 200 OK and challenge token from the request
        reply.code(200).send(challenge)
        console.log('Webhook verified successfully!')
    } else {
        // respond with '403 Forbidden' if verify tokens do not match
        reply.code(403).send()
    }
})

server.get('/', (request, reply) => {
    reply.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`)
})

//
// CHAT
//

server.post('/chat', async (request, reply) => {
    const { message, userName } = request.body;
    const userId = request.ip; // Use IP as a unique identifier for the user or generate a unique user ID

    // Adiciona histórico de conversa se não existir
    if (!chatHistory[userId]) {
        chatHistory[userId] = [
            {
                role: "user",
                parts: [{ text: `Seu nome será Stella e é uma assistente virtual para atendimento do sistema SAAS Advogado Digital. Na introdução, sempre informar o nome da pessoa, se houver. Preciso que seja bem amigável e use emojis na conversa, sem exagerar. O valor da mensalidade é de R$79,00 e se for necessário mais informações, solicite que entre em contato com o Lucas Moreira (12)98155-9778.` }],
            }
        ];
    }

    // Adiciona a mensagem recebida ao histórico
    chatHistory[userId].push({
        role: "user",
        parts: [{ text: message }],
    });

    // Integração com a função resposta_gemini
    try {
        const geminiResponse = await resposta_gemini(chatHistory[userId], userName, userId);

        // Adiciona a resposta de Gemini ao histórico
        chatHistory[userId].push({
            role: "model",
            parts: [{ text: geminiResponse }],
        });

        reply.send({ response: geminiResponse });
    } catch (error) {
        console.error('Erro ao processar a mensagem:', error);
        reply.code(500).send({ error: 'Failed to get response from Gemini' });
    }
});

//
// GEMINI
//

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generationConfig = {
    stopSequences: ["red"],
    maxOutputTokens: 200,
    temperature: 0.9,
    topP: 0.1,
    topK: 16,
};

// The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig });

async function resposta_gemini(history, senderName, fromNumber) {
    try {
        // Adiciona um histórico inicial, se necessário
        if (!history.find(item => item.role === "model")) {
            history.push({
                role: "model",
                parts: [{ text: `Olá, ${senderName}!` }],
            });
        }

        const chat = model.startChat({ history });

        const result = await chat.sendMessage(history[history.length - 1].parts[0].text);
        
        // Extrai a resposta do resultado da geração de conteúdo
        const response = await result.response;
        
        // Extrai o texto da resposta
        const text = await response.text();

        console.log(history)
        console.log(senderName, " - ", fromNumber);
        console.log(text);
        // Retorna o texto da resposta
        return text;
    } catch (error) {
        console.error('Erro ao gerar resposta com Gemini:', error);
        throw error;
    }
}

////////////////////////////////////

// server.listen({
//     host: '0.0.0.0',
//     port: process.env.PORT ?? 3333,
// }, (err, address) => {
//     if (err) {
//         console.error(err)
//         process.exit(1)
//     }
//     console.log(`Server is listening on ${address}`)
// })

module.exports.handler = ServerlessHttp(server)