let clientesGerais = []; 
let clienteParaExcluirId = null;
let clienteParaAlterarStatus = null;

document.addEventListener('DOMContentLoaded', () => {
    const modalExclusao = document.getElementById('modal-excluir-cliente');
    const btnCancelar = document.getElementById('btn-cancelar-exclusao');
    const btnConfirmar = document.getElementById('btn-confirmar-exclusao');
    const modalStatus = document.getElementById('modal-status-cliente');
    const btnCancelarStatus = document.getElementById('btn-cancelar-status');
    const btnConfirmarStatus = document.getElementById('btn-confirmar-status');

    btnCancelar?.addEventListener('click', fecharModalExclusao);
    btnConfirmar?.addEventListener('click', confirmarExclusaoCliente);
    btnCancelarStatus?.addEventListener('click', fecharModalStatus);
    btnConfirmarStatus?.addEventListener('click', confirmarAlteracaoStatus);
    modalExclusao?.addEventListener('click', event => {
        if (event.target === modalExclusao) fecharModalExclusao();
    });
    modalStatus?.addEventListener('click', event => {
        if (event.target === modalStatus) fecharModalStatus();
    });
});

function formatarCPF(cpf) {
    const cpfNumeros = String(cpf || '').replace(/\D/g, '');
    if (cpfNumeros.length !== 11) return cpf || 'Não informado';

    return cpfNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarData(data) {
    if (!data) return 'Não informado';

    const dataFormatada = new Date(data);
    if (Number.isNaN(dataFormatada.getTime())) return 'Data inválida';

    return dataFormatada.toLocaleDateString('pt-BR');
}

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
    mostrarLoading('Carregando clientes...');
    container.innerHTML = '<p>Carregando clientes do banco de dados...</p>';

    try {
        const response = await fetch('http://localhost:5205/api/conta');
        
        if (!response.ok) throw new Error('Falha na comunicação com a API.');

        clientesGerais = await response.json(); 
        renderizarClientes(clientesGerais);

    } catch (error) {
        console.error('Erro no Fetch:', error);
        container.innerHTML = `<p style="color: #e74c3c; font-weight: bold;">Erro ao buscar clientes. Verifique se sua API C# está rodando.</p>`;
    } finally {
        esconderLoading();
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
        const nome = escapeHtml(capitalizarNome(cliente.nome));
        const sobrenome = escapeHtml(capitalizarNome(cliente.sobrenome));
        const email = escapeHtml(cliente.email);
        const cpf = escapeHtml(formatarCPF(cliente.cpf));
        const dataCadastro = escapeHtml(formatarData(cliente.createdAt || cliente.created_at));
        const article = document.createElement('article');
        article.className = `admin-card ${!isAtivo ? 'inactive-card' : ''}`;

        article.innerHTML = `
            <div class="card-header">
                <div class="card-info">
                    <span class="card-title" ${!isAtivo ? 'style="color: var(--cinza-rocha-claro);"' : ''}>
                        ${nome} ${sobrenome}
                        <button class="btn-edit-client" type="button" title="Editar usuário" aria-label="Editar usuário" onclick="abrirEdicaoCliente(${cliente.id})">
                            <img src="./assets/icons/pencil-solid-full.svg" alt="">
                        </button>
                        <button class="btn-delete-client" type="button" title="Excluir usuário" aria-label="Excluir usuário" onclick="abrirExclusaoCliente(${cliente.id})">
                            <img src="./assets/icons/trash-solid-full.svg" alt="">
                        </button>
                    </span>
                    <span class="card-subtitle">E-mail: ${email} | CPF: ${cpf}</span>
                </div>
                <span class="status ${isAtivo ? 'status-neutro' : 'status-atencao'}">
                    ${isAtivo ? 'Conta Ativa' : 'Conta Inativa'}
                </span>
            </div>
            <div class="card-body">
                <div class="client-details" ${!isAtivo ? 'style="opacity: 0.6;"' : ''}>
                    <p><strong>Data de Cadastro:</strong> ${dataCadastro}</p>
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
    const inputBusca = document.getElementById('input-busca-cliente');
    const termo = (inputBusca?.value || '').trim().toLowerCase();
    const termoCpf = termo.replace(/\D/g, '');
    
    const clientesFiltrados = clientesGerais.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(termo)) ||
        (c.sobrenome && c.sobrenome.toLowerCase().includes(termo)) ||
        (c.email && c.email.toLowerCase().includes(termo)) ||
        (termoCpf && c.cpf && String(c.cpf).replace(/\D/g, '').includes(termoCpf))
    );

    renderizarClientes(clientesFiltrados);
}

async function inativarCliente(id) {
    await alterarStatusCliente(id, false);
}

async function reativarCliente(id) {
    await alterarStatusCliente(id, true);
}

function abrirExclusaoCliente(id) {
    const cliente = clientesGerais.find(clienteAtual => clienteAtual.id === id);
    if (!cliente) return;

    clienteParaExcluirId = id;
    document.getElementById('exclusao-nome').textContent =
        `${capitalizarNome(cliente.nome)} ${capitalizarNome(cliente.sobrenome)}`;
    document.getElementById('exclusao-email').textContent = cliente.email || '';
    document.getElementById('modal-excluir-cliente').classList.remove('hidden');
}

function fecharModalExclusao() {
    clienteParaExcluirId = null;
    document.getElementById('modal-excluir-cliente')?.classList.add('hidden');
}

async function confirmarExclusaoCliente() {
    if (!clienteParaExcluirId) return;

    const id = clienteParaExcluirId;
    fecharModalExclusao();

    mostrarLoading('Excluindo usuário...');
    try {
        const response = await fetch(`http://localhost:5205/api/conta/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Falha ao excluir o usuário.');

        await carregarClientes();
        mostrarResultado('Usuário excluído', 'O usuário foi removido com sucesso.', 'sucesso');
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        mostrarResultado('Não foi possível excluir', 'O usuário não pôde ser removido.', 'erro');
    } finally {
        esconderLoading();
    }
}

async function alterarStatusCliente(id, ativo) {
    const cliente = clientesGerais.find(clienteAtual => clienteAtual.id === id);
    if (!cliente) return;

    clienteParaAlterarStatus = { id, ativo };
    document.getElementById('status-titulo').textContent = ativo
        ? 'Reativar conta'
        : 'Inativar conta';
    document.getElementById('status-mensagem').textContent = ativo
        ? 'Deseja reativar a conta deste cliente?'
        : 'Deseja inativar a conta deste cliente?';
    document.getElementById('status-nome').textContent =
        `${capitalizarNome(cliente.nome)} ${capitalizarNome(cliente.sobrenome)}`;
    document.getElementById('status-acao-simbolo').textContent = ativo ? '\u2713' : '!';
    document.getElementById('btn-confirmar-status').textContent = ativo
        ? 'Reativar conta'
        : 'Inativar conta';
    document.getElementById('modal-status-cliente').classList.remove('hidden');
}

function fecharModalStatus() {
    clienteParaAlterarStatus = null;
    document.getElementById('modal-status-cliente')?.classList.add('hidden');
}

async function confirmarAlteracaoStatus() {
    if (!clienteParaAlterarStatus) return;

    const { id, ativo } = clienteParaAlterarStatus;
    fecharModalStatus();

    mostrarLoading(ativo ? 'Reativando conta...' : 'Inativando conta...');
    try {
        const response = await fetch(`http://localhost:5205/api/conta/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ativo })
        });

        if (!response.ok) throw new Error('Falha ao alterar o status da conta.');

        await carregarClientes();
        mostrarResultado('Status atualizado', `A conta foi ${ativo ? 'reativada' : 'inativada'} com sucesso.`, 'sucesso');
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        mostrarResultado('Não foi possível atualizar', 'O status da conta não pôde ser alterado.', 'erro');
    } finally {
        esconderLoading();
    }
}

function capitalizarNome(nome) {
    return String(nome || '')
        .toLocaleLowerCase('pt-BR')
        .replace(/(^|[\s'-])\p{L}/gu, letra => letra.toLocaleUpperCase('pt-BR'));
}

function escapeHtml(valor) {
    return String(valor ?? '').replace(/[&<>'"]/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[caractere]));
}
