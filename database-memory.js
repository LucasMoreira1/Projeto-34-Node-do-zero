import { randomUUID } from "node:crypto"

export class DatabaseMemory {
    #clientes = new Map()


    list(search) {
        return Array.from(this.#clientes.entries())
            .map((clienteArray) => {
                const id = clienteArray[0]
                const dados = clienteArray[1]

                return {
                    id,
                    ...dados,
                }
            })
            .filter(cliente => {
                if (search) {
                    return cliente.nome.includes(search)
                }

                return true
            })
        
    }

    create(cliente) {
        const clienteID = randomUUID()

        this.#clientes.set(clienteID, cliente)
    }

    update(id, cliente) {
        this.#clientes.set(id, cliente)
    }

    delete(id){
        this.#clientes.delete(id)
    }

}