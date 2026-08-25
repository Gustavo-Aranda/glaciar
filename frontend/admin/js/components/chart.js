document.addEventListener("DOMContentLoaded", () => {
    const ctx = document.getElementById('financeChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['01/Ago', '05/Ago', '10/Ago', '15/Ago', '20/Ago', '25/Ago', '31/Ago'],
            datasets: [{
                label: 'Volume Financeiro (R$)',
                data: [15000, 22000, 18000, 35000, 29000, 42000, 48000],
                borderColor: '#E67E22',
                backgroundColor: 'rgba(230, 126, 34, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
});