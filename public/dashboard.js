let loans = [];
let clients = [];
let paiements = [];

// Toutes les stats regroupées
let stats = {
    pretsActifs: 0,
    pretsRembourses: 0,
    pretsRetard: 0,
    montantTotalPrete: 0,
    montantTotalRembourse: 0,
    clientsEnRetard: []
};

let loansChart; // Chart.js instance

// =====================================================
// CHARGEMENT GLOBAL (clients + prêts + paiements)
// =====================================================
async function loadAllData() {
    try {
        const [resClients, resLoans, resPaiements] = await Promise.all([
            fetch("/allClients"),
            fetch("/allLoans"),
            fetch("/allPaiements")
        ]);

        if (!resClients.ok || !resLoans.ok || !resPaiements.ok) {
            return showError("Erreur de chargement des données");
        }

        clients = await resClients.json();
        loans = await resLoans.json();
        paiements = await resPaiements.json();

        calculateStats();
        renderDashboard();

    } catch (err) {
        console.error(err);
        showError("Impossible de charger le tableau de bord");
    }
}

// =====================================================
// CALCUL DES STATISTIQUES
// =====================================================
function calculateStats() {

    // Reset
    stats = {
        pretsActifs: 0,
        pretsRembourses: 0,
        pretsRetard: 0,
        montantTotalPrete: 0,
        montantTotalRembourse: 0,
        clientsEnRetard: []
    };

    const today = new Date();

    loans.forEach(loan => {

        const montantInitial = Number(loan.montant) || 0;
        const interets = Number(loan.interets) || 0;
        const solde = Number(loan.solde) || 0;

        // Montant total prêté
        stats.montantTotalPrete += montantInitial;

        // Statut
        switch (loan.statut) {

            case "ACTIF":
                stats.pretsActifs++;
                break;

            case "REMBOURSÉ":
                stats.pretsRembourses++;
                break;

            case "EN RETARD":
                stats.pretsRetard++;

                const client = clients.find(c => c.id === loan.client_id);

                // Calcul des jours de retard
                const dueDate = new Date(loan.date);
                dueDate.setMonth(dueDate.getMonth() + Number(loan.duree));

                const diffTime = today - dueDate;
                const joursRetard = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                stats.clientsEnRetard.push({
                    nom: client ? `${client.prenom} ${client.nom}` : "Client inconnu",
                    jours: joursRetard
                });
                break;
        }

        // Montant remboursé total = (montant + intérêts) - solde
        stats.montantTotalRembourse += (montantInitial + interets) - solde;
    });

    // Arrondis propres
    stats.montantTotalPrete = Number(stats.montantTotalPrete.toFixed(2));
    stats.montantTotalRembourse = Number(stats.montantTotalRembourse.toFixed(2));
}

// =====================================================
// AFFICHAGE DASHBOARD
// =====================================================
function renderDashboard() {

    // Cartes
    document.getElementById("pretsActifs").textContent = stats.pretsActifs;
    document.getElementById("pretsRembourses").textContent = stats.pretsRembourses;
    document.getElementById("pretsRetard").textContent = stats.pretsRetard;

    document.getElementById("montantTotalPrete").textContent =
        stats.montantTotalPrete.toFixed(2) + " $";

    document.getElementById("montantTotalRembourse").textContent =
        stats.montantTotalRembourse.toFixed(2) + " $";

    // ================================
    // Pastille rouge dans le menu
    // ================================
    const badge = document.getElementById("badgeRetard");
    if (badge) badge.textContent = stats.pretsRetard;

    // ================================
    // Graphique
    // ================================
    const canvas = document.getElementById("loansChart");

    if (canvas) {
        const ctx = canvas.getContext("2d");

        if (loansChart) loansChart.destroy();

        loansChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Actifs", "Remboursés", "En Retard"],
                datasets: [{
                    data: [
                        stats.pretsActifs,
                        stats.pretsRembourses,
                        stats.pretsRetard
                    ],
                    backgroundColor: ["#00d1b2", "#23d160", "#ff3860"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        });
    }

    // ================================
    // Liste des clients en retard
    // ================================
    const div = document.getElementById("clientsEnRetard");

    if (stats.clientsEnRetard.length === 0) {
        div.textContent = "Aucun client en retard 👍";
    } else {
        div.innerHTML = "";

        stats.clientsEnRetard.forEach(c => {
            const el = document.createElement("div");
            el.className = "client-retard";

            el.innerHTML = `
                <i class="fas fa-user-times has-text-danger"></i>
                ${c.nom} — <strong>${c.jours} jours de retard</strong>
            `;
            div.appendChild(el);
        });
    }
}

// =====================================================
// Notification simple
// =====================================================
function showError(msg) {
    const el = document.createElement("div");
    el.className = "notification is-danger";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// =====================================================
// Bouton “Rafraîchir”
// =====================================================
const refreshBtn = document.getElementById("refreshDashboard");
if (refreshBtn) {
    refreshBtn.addEventListener("click", loadAllData);
}

// =====================================================
// Lancement auto au chargement
// =====================================================
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAllData);
} else {
    loadAllData();
}
