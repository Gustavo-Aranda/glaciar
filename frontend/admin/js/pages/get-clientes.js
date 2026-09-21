let clientesGerais = []; 

document.addEventListener('DOMContentLoaded', () => {
    carregarClientes();

    const inputBusca = document.getElementById('input-busca-cliente');
    if(inputBusca) {
        inputBusca.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') filtrarClientes();
        });
    }
});

async function carregarClientes() {
    const container = document.getElementById('lista-clientes-container');
    container.innerHTML = '<p>Carregando clientes do banco de dados...</p>';

    try {
        const response = await fetch('http://localhost:5205/api/conta');
        
        if (!response.ok) throw new Error('Falha na comunicação com a API.');

        clientesGerais = await response.json(); 
        renderizarClientes(clientesGerais);

    } catch (error) {
        console.error('Erro no Fetch:', error);
        container.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Erro ao buscar clientes. Verifique se sua API C# está rodando.</p>`;
    }
}

function renderizarClientes(lista) {
    const container = document.getElementById('lista-clientes-container');
    container.innerHTML = ''; 

    if (lista.length === 0) {
        container.innerHTML = '<p>Nenhum cliente atende aos critérios da busca.</p>';
        return;
    }

    lista.forEach(cliente => {
        const isAtivo = cliente.ativo !== false; 
        const article = document.createElement('article');
        article.className = `admin-card ${!isAtivo ? 'inactive-card' : ''}`;

        article.innerHTML = `
            <div class="card-header">
                <div class="card-info">
                    <span class="card-title" ${!isAtivo ? 'style="color: var(--cinza-rocha-claro);"' : ''}>
                        ${cliente.nome} ${cliente.sobrenome}
                    </span>
                    <span class="card-subtitle">E-mail: ${cliente.email} | CPF: ${formatarCPF(cliente.cpf)}</span>
                </div>
                <span class="status ${isAtivo ? 'status-neutro' : 'status-atencao'}">
                    ${isAtivo ? 'Conta Ativa' : 'Conta Inativa'}
                </span>
            </div>
            <div class="card-body">
                <div class="client-details" ${!isAtivo ? 'style="opacity: 0.6;"' : ''}>
                    <p><strong>Data de Cadastro:</strong> ${formatarData(cliente.createdAt || cliente.created_at)}</p>
                    ${!isAtivo 
                        ? `<p><strong>Motivo Inativação:</strong> Desativado via painel admin.</p>` 
                        : `<p><strong>Tipo de Conta:</strong> ${cliente.tipoUsuario === 1 ? 'Administrador' : 'Cliente'}</p>`
                    }
                </div>
                <div class="action-buttons">
                    ${isAtivo ? `
                        <button class="btn btn-secondary">Ver Histórico</button>
                        <button class="btn btn-warning" onclick="inativarCliente(${cliente.id})">Inativar Cliente</button>
                    ` : `
                        <button class="btn btn-primary" onclick="reativarCliente(${cliente.id})">Reativar Conta</button>
                    `}
                </div>
            </div>
        `;
        
        container.appendChild(article);
    });
}

function filtrarClientes() {
    const termo = document.getElementById('input-busca-cliente').value.toLowerCase();
    
    const clientesFiltrados = clientesGerais.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(termo)) ||
        (c.sobrenome && c.sobrenome.toLowerCase().includes(termo)) ||
        (c.email && c.email.toLowerCase().includes(termo)) ||
        (c.cpf && c.cpf.includes(termo))
    );

    renderizarClientes(clientesFiltrados);
}