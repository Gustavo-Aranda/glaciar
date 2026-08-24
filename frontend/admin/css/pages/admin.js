document.addEventListener("DOMContentLoaded", () => {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // Gráfico de Volume Financeiro (Mock)
    new Chart(ctx, {
        type: 'bar', // Tipo de gráfico (barras)
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Volume de Vendas (R$)',
                data: [1200, 1900, 800, 2400, 3100, 4500, 3800],
                backgroundColor: '#5DADE2', // Azul Gelo da Glaciar
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#EAEAEA' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
});