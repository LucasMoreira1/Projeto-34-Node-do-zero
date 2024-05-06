import  from node-windows

var svc = new service({
    name:'NodeJS - Advogado Digital',
    description: 'NodeJS Server para o sistema Advogado Digital.',
    script: 'C:\\Agility\\Projetos\\Projeto-34-Node-do-zero\\server.js'
});
   
svc.on('install',function(){
svc.start();
});

svc.install();