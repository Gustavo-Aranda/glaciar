document.addEventListener('DOMContentLoaded', () => {
    carregarClientes();
});

async function carregarClientes() {
    const container = document.getElementById('lista-clientes-container');
    container.innerHTML = '<p>Carregando clientes do banco de dados...</p>';

    try {
        // Ajuste a URL/porta para a rota GET do seu UsuarioController em C#
        const response = await fetch('https://localhost:5205/api/conta');
        
        if (!response.ok) {
            throw new Error('Falha na comunicação com a API.');
        }

        const clientes = await response.json();
        container.innerHTML = ''; // Limpa a mensagem de carregamento

        if (clientes.length === 0) {
            container.innerHTML = '<p>Nenhum cliente cadastrado no sistema.</p>';
            return;
        }

        // Percorre a lista que veio do C# e desenha o HTML
        clientes.forEach(cliente => {
            // Verifica o status do cliente (ajuste 'ativo' para o nome exato da sua propriedade C#)
            // Caso sua entidade ainda não tenha a propriedade Ativo, considere true por padrão
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
                            : `<p><strong>Tipo de Conta:</strong> ${cliente.tipoUsuario || 'Cliente'}</p>`
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

    } catch (error) {
        console.error('Erro no Fetch:', error);
        container.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Erro ao buscar clientes. Verifique se sua API C# está rodando (dotnet run).</p>`;
    }
}

// ==========================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E AÇÃO
// ==========================================

function formatarCPF(cpf) {
    if (!cpf) return '';
    const apenasNumeros = cpf.replace(/\D/g, '');
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarData(dataIso) {
    if (!dataIso) return 'N/A';
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR');
}

async function inativarCliente(id) {
    if(confirm("Tem certeza que deseja inativar o acesso deste cliente?")) {
        // Implementar a chamada PUT/DELETE para a rota de inativação
        console.log(`Disparando inativação para o ID: ${id}`);
        // Exemplo: await fetch(`https://localhost:5205/api/conta/${id}/inativar`, { method: 'PUT' });
        // carregarClientes(); // Recarrega a lista após o sucesso
    }
}

async function reativarCliente(id) {
    if(confirm("Deseja restaurar o acesso deste cliente?")) {
        // Implementar a chamada PUT para a rota de reativação
        console.log(`Disparando reativação para o ID: ${id}`);
    }
}