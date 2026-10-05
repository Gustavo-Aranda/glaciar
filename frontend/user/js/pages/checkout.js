const API_BASE_URL = 'http://localhost:5205/api';
const USUARIO_ID = 1; // Header de simulação de autenticação

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('checkout-form');
    const msgDiv = document.getElementById('mensagem');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msgDiv.textContent = 'Processando...';
        msgDiv.style.color = 'blue';

        // 1. Endereço
        const tipoEndereco = document.querySelector('input[name="endereco_tipo"]:checked').value;
        let usuarioEnderecoId = null;
        let novoEndereco = null;

        if (tipoEndereco === 'existente') {
            usuarioEnderecoId = parseInt(document.getElementById('endereco-existente').value);
        } else {
            novoEndereco = {
                cep: document.getElementById('cep').value,
                logradouro: document.getElementById('logradouro').value,
                numero: document.getElementById('numero').value,
                bairro: document.getElementById('bairro').value,
                cidade: document.getElementById('cidade').value,
                estado: document.getElementById('estado').value.toUpperCase(), // Enum esperado string
                salvarNoPerfil: document.getElementById('salvar-perfil').checked,
                apelido: document.getElementById('apelido').value
            };
        }

        // 2. Cupons
        const cuponsInput = document.getElementById('cupons').value;
        const codigosCupons = cuponsInput ? cuponsInput.split(',').map(c => c.trim()).filter(c => c) : [];

        // 3. Cartões
        const cartoes = [];
        document.querySelectorAll('.cartao-item').forEach(item => {
            const idVal = item.querySelector('.cartao-id').value;
            const valorVal = item.querySelector('.cartao-valor').value;

            if (idVal && valorVal) {
                cartoes.push({
                    usuarioCartaoId: parseInt(idVal),
                    novoCartao: null, // Para este front simples, só simularemos cartão já existente.
                    valor: parseFloat(valorVal)
                });
            }
        });

        // Montar Payload
        const payload = {
            usuarioEnderecoId: usuarioEnderecoId,
            novoEndereco: novoEndereco,
            codigosCupons: codigosCupons,
            cartoes: cartoes
        };

        try {
            const response = await fetch(`${API_BASE_URL}/checkout/finalizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Usuario-Id': USUARIO_ID.toString()
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                msgDiv.style.color = 'green';
                msgDiv.innerHTML = `Compra finalizada com sucesso!<br>
                                    <strong>Pedido ID:</strong> ${data.id}<br>
                                    <strong>Código:</strong> ${data.codigo}<br>
                                    <strong>Total:</strong> R$ ${data.valorTotal.toFixed(2)}`;
                console.log('Pedido:', data);
            } else {
                msgDiv.style.color = 'red';
                msgDiv.textContent = `Erro: ${data.message || 'Falha ao finalizar compra'}`;
                if (data.details) {
                    console.error('Detalhes do erro:', data.details);
                }
            }
        } catch (error) {
            msgDiv.style.color = 'red';
            msgDiv.textContent = `Erro de rede: ${error.message}`;
        }
    });
});
