let loans = [];
let clients = [];
let paiements = [];
let stats = {
    preetsActifs: 0,
    preetsRembourses: 0,
    preetsEnRetard: 0,
    montantTotalPrete: 0,
    montantTotalRembourse: 0,
    clientsEnRetard: []
};

let loansChart;

// =====================================================
// Charger toutes les données
// =====================================================
async function loadAllData() {
    try {
        const [resClients, resLoans, resPaiements] = await Promise.all([
            fetch('/allClients'),
            fetch('/allLoans'),
            fetch('/allPaiements')
        ]);

        clients = await resClients.json();
        loans = await resLoans.json();
        paiements = await resPaiements.json();

        calculateStats();
        renderDashboard();
    } catch(err) {
        console.error(err);
        showError('Erreur de chargement des données');
    }
}

// =====================================================
// Calcul des stats
// =====================================================
function calculateStats() {
    stats = {
        preetsActifs: 0,
        preetsRembourses: 0,
        preetsEnRetard: 0,
        montantTotalPrete: 0,
        montantTotalRembourse: 0,
        clientsEnRetard: []
    };

    const today = new Date();

    loans.forEach(loan => {
        stats.montantTotalPrete += Number(loan.montant) || 0;
        if(loan.statut === 'ACTIF') stats.preetsActifs++;
        else if(loan.statut === 'REMBOURSÉ') stats.preetsRembourses++;
        else if(loan.statut === 'EN RETARD') stats.preetsEnRetard++;

        if(loan.statut === 'EN RETARD') {
            const client = clients.find(c => c.id === loan.client_id);
            stats.clientsEnRetard.push({
                nom: client ? `${client.prenom} ${client.nom}` : 'Inconnu'
            });
        }
        stats.montantTotalRembourse += Number(loan.montant) - Number(loan.solde);
    });
}

// =====================================================
// Affichage dashboard
// =====================================================
function renderDashboard() {
    document.getElementById('pretsActifs').textContent = stats.preetsActifs;
    document.getElementById('pretsRembourses').textContent = stats.preetsRembourses;
    document.getElementById('pretsRetard').textContent = stats.preetsEnRetard;
    document.getElementById('montantTotalPrete').textContent = stats.montantTotalPrete.toFixed(2) + ' $';
    document.getElementById('montantTotalRembourse').textContent = stats.montantTotalRembourse.toFixed(2) + ' $';

    // Graphique
    const canvas = document.getElementById('loansChart');
    // ensure canvas exists
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (loansChart) loansChart.destroy();
        loansChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Actifs', 'Remboursés', 'En Retard'],
                datasets: [{
                    data: [stats.preetsActifs, stats.preetsRembourses, stats.preetsEnRetard],
                    backgroundColor: ['#00d1b2', '#23d160', '#ff3860']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // Clients en retard
    const div = document.getElementById('clientsEnRetard');
    if(stats.clientsEnRetard.length === 0) {
        div.textContent = 'Aucun client en retard';
    } else {
        div.innerHTML = '';
        stats.clientsEnRetard.forEach(c => {
            const el = document.createElement('div');
            el.className = 'client-retard';
            el.innerHTML = `<i class="fas fa-user-times has-text-danger"></i> ${c.nom}`;
            div.appendChild(el);
        });
    }
}

// =====================================================
// Notifications
// =====================================================
function showError(msg) {
    const notification = document.createElement('div');
    notification.className = 'notification is-danger';
    notification.textContent = msg;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// =====================================================
// Init
// =====================================================
if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadAllData);
} else {
    loadAllData();
}
