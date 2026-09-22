document.addEventListener('DOMContentLoaded', async () => {
    const id = obterIdUsuarioAtual();
    if (!id) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('btn-sair-conta')?.addEventListener('click', () => {
        limparUsuarioEmCache();
        window.location.href = 'login.html';
    });

    const linkEditar = document.getElementById('btn-editar-perfil');
    if (linkEditar) linkEditar.href = `editar-perfil.html?id=${encodeURIComponent(id)}`;

    const usuarioEmCache = obterUsuarioEmCache(id);
    if (usuarioEmCache) {
        preencherPerfil(usuarioEmCache);
    } else {
        mostrarLoadingUsuario('Carregando seus dados...');
        try {
            const response = await fetch(`http://localhost:5205/api/conta/${id}`);
            if (!response.ok) throw new Error('Não foi possível carregar o perfil.');

            const usuario = await response.json();
            preencherPerfil(usuario);
            salvarUsuarioEmCache(usuario);
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            document.getElementById('conta-nome').textContent = 'Não disponível';
            document.getElementById('conta-sobrenome').textContent = 'Não disponível';
            document.getElementById('conta-email').textContent = 'Não disponível';
            document.getElementById('conta-telefone').textContent = 'Não disponível';
        } finally {
            esconderLoadingUsuario();
        }
    }

    await carregarEndereco(id);
});

async function carregarEndereco(usuarioId) {
    try {
        const response = await fetch(`http://localhost:5205/api/enderecos/cliente/${usuarioId}`);
        if (!response.ok) throw new Error('Não foi possível carregar os endereços.');

        const enderecos = await response.json();
        const enderecoUsuario = enderecos.find(endereco => endereco.padrao || endereco.Padrao) || enderecos[0];
        const endereco = enderecoUsuario?.endereco || enderecoUsuario?.Endereco;
        document.getElementById('conta-endereco').textContent = endereco
            ? formatarEndereco(endereco)
            : 'Sem endereço';
    } catch (error) {
        console.error('Erro ao carregar endereços:', error);
        document.getElementById('conta-endereco').textContent = 'Sem endereço';
    }
}

function formatarEndereco(endereco) {
    const logradouro = endereco.logradouro || endereco.Logradouro || '';
    const numero = endereco.numero || endereco.Numero || '';
    const cidade = endereco.cidade || endereco.Cidade || '';
    const estado = endereco.estado || endereco.Estado || '';
    const rua = [logradouro, numero].filter(Boolean).join(', ');
    const localidade = [cidade, estado].filter(Boolean).join(', ');

    return [rua, localidade].filter(Boolean).join(' - ') || 'Sem endereço';
}

function preencherPerfil(usuario) {
    document.getElementById('conta-nome').textContent = usuario.nome || '';
    document.getElementById('conta-sobrenome').textContent = usuario.sobrenome || '';
    document.getElementById('conta-email').textContent = usuario.email || '';
    const telefone = usuario.telefone || usuario.Telefone || '';
    document.getElementById('conta-telefone').textContent = telefone
        ? formatarTelefone(telefone)
        : 'Não informado';
}

function formatarTelefone(telefone) {
    const numeros = String(telefone).replace(/\D/g, '').slice(0, 11);
    return numeros.length > 10
        ? numeros.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3')
        : numeros.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
}
