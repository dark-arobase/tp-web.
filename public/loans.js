// =====================================================
// VARIABLES
// =====================================================
let loans = [];
let clients = [];
let filteredLoans = [];
let currentPage = 1;
const loansPerPage = 10;

// Selecteurs
const formLoans = document.getElementById("loan-form");
const loanId = document.getElementById("loan-id");

const loanClientSelect = document.getElementById("clientSelect");
const montantInput = document.getElementById("montant");
const tauxInput = document.getElementById("taux");
const dureeInput = document.getElementById("duree");
const dateInput = document.getElementById("date");

const loansTableBody = document.querySelector("#loans-table tbody");
const paginationContainer = document.getElementById("pagination");
const searchInput = document.getElementById("search-loan");

const errorClient = document.getElementById("client-error");
const errorMontant = document.getElementById("montant-error");
const errorTaux = document.getElementById("taux-error");
const errorDuree = document.getElementById("duree-error");
const errorDate = document.getElementById("date-error");

const submitBtn = document.getElementById("submit-btn");
const cancelEdit = document.getElementById("cancel-edit");

cancelEdit.style.display = "none";


async function calculateStatusWithPayments(loanId, solde, dueDate) {
// Client-side helper: compute a fallback status when needed.
// NOTE: the server is authoritative (it provides `loan.statut`).
function computeStatusLocal(solde, dueDate) {
    if (Number(solde) <= 0) return "REMBOURSÉ";
    const now = new Date();
    const due = new Date(dueDate);
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    return dueDay.getTime() < nowDay.getTime() ? "EN RETARD" : "ACTIF";
}



// =====================================================
// CLEAR + SHOW FIELD ERRORS
// =====================================================
function showFieldError(input, errorElement, message) {
    input.classList.add("is-danger");
    errorElement.textContent = message;
    errorElement.style.display = "block";
}

function clearFieldError(input, errorElement) {
    input.classList.remove("is-danger");
    errorElement.textContent = "";
    errorElement.style.display = "none";
}

loanClientSelect.addEventListener("change", () => clearFieldError(loanClientSelect, errorClient));
montantInput.addEventListener("input", () => clearFieldError(montantInput, errorMontant));
tauxInput.addEventListener("input", () => clearFieldError(tauxInput, errorTaux));
dureeInput.addEventListener("input", () => clearFieldError(dureeInput, errorDuree));
dateInput.addEventListener("input", () => clearFieldError(dateInput, errorDate));


// =====================================================
// 1) LOAD CLIENTS
// =====================================================
async function loadClients() {
    const res = await fetch("/allClients");
    clients = await res.json();

    loanClientSelect.innerHTML = `
        <option value="">Sélectionnez un client</option>
        ${clients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join("")}
    `;

    document.getElementById("filter-client").innerHTML = `
        <option value="">Tous les clients</option>
        ${clients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join("")}
    `;
}

// =====================================================
// 2) LOAD LOANS
// =====================================================
async function loadLoans() {
    const res = await fetch("/allLoans");
    loans = await res.json();
    filteredLoans = [...loans];
    currentPage = 1;
    paginate();
}

// =====================================================
// 3) AFFICHAGE PRÊTS
// =====================================================
function AffichageLoans(list) {
    loansTableBody.innerHTML = "";

    if (list.length === 0) {
        loansTableBody.innerHTML = `<tr><td colspan="9" class="has-text-centered">Aucun prêt trouvé</td></tr>`;
        return;
    }

    list.forEach(loan => {
        const client = clients.find(c => c.id === loan.client_id);
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${client ? client.prenom + " " + client.nom : "—"}</td>
            <td>${Number(loan.montant).toFixed(2)} $</td>
            <td>${loan.taux}%</td>
            <td>${loan.duree} mois</td>
            <td>${loan.date}</td>
            <td>${Number(loan.interets).toFixed(2)} $</td>
            <td>${Number(loan.solde).toFixed(2)} $</td>
            <td class="${loan.statut === "EN RETARD" ? "has-text-danger" : loan.statut === "REMBOURSÉ" ? "has-text-success" : "has-text-info"}">
                ${loan.statut}
            </td>
            <td>
                <button class="button is-small is-primary" data-edit="${loan.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="button is-small is-danger" data-del="${loan.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        loansTableBody.appendChild(row);
    });
}

// =====================================================
// 4) PAGINATION
// =====================================================
function paginate() {
    const start = (currentPage - 1) * loansPerPage;
    const end = start + loansPerPage;
    const pageLoans = filteredLoans.slice(start, end);

    AffichageLoans(pageLoans);
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredLoans.length / loansPerPage);
    paginationContainer.innerHTML = "";
    if (totalPages <= 1) return;

    const prev = document.createElement("button");
    prev.className = "button is-small";
    prev.textContent = "«";
    prev.disabled = currentPage === 1;
    prev.onclick = () => { currentPage--; paginate(); };
    paginationContainer.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = "button is-small" + (i === currentPage ? " is-primary" : "");
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; paginate(); };
        paginationContainer.appendChild(btn);
    }

    const next = document.createElement("button");
    next.className = "button is-small";
    next.textContent = "»";
    next.disabled = currentPage === totalPages;
    next.onclick = () => { currentPage++; paginate(); };
    paginationContainer.appendChild(next);
}

// =====================================================
// 5) AJOUT / MODIFICATION PRÊT
// =====================================================
formLoans.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = loanId.value.trim();
    const payload = {
        client_id: loanClientSelect.value,
        montant: montantInput.value,
        taux: tauxInput.value,
        duree: dureeInput.value,
        date: dateInput.value
    };

    // Validation simple
    if (!payload.client_id) return showFieldError(loanClientSelect, errorClient, "Sélectionnez un client");
    if (payload.montant <= 0) return showFieldError(montantInput, errorMontant, "Montant invalide");
    if (payload.taux <= 0) return showFieldError(tauxInput, errorTaux, "Taux invalide");
    if (payload.duree <= 0) return showFieldError(dureeInput, errorDuree, "Durée invalide");
    if (!payload.date) return showFieldError(dateInput, errorDate, "Date requise");

    const url = id ? `/editLoan/${id}` : "/addLoan";
    const method = id ? "PUT" : "POST";

    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!res.ok) return alert("Erreur serveur");

    await loadLoans();
    formLoans.reset();
    loanId.value = "";
    submitBtn.textContent = "Créer le prêt";
    cancelEdit.style.display = "none";
});

// =====================================================
// 6) BOUTONS EDIT / DELETE
// =====================================================
loansTableBody.addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");

    if (edit) {
        const id = edit.dataset.edit;
        const loan = loans.find(l => l.id === id);

        loanId.value = loan.id;
        loanClientSelect.value = loan.client_id;
        montantInput.value = loan.montant;
        tauxInput.value = loan.taux;
        dureeInput.value = loan.duree;
        dateInput.value = loan.date;

        submitBtn.textContent = "Modifier";
        cancelEdit.style.display = "";
        return;
    }

    if (del) {
        if (!confirm("Supprimer ce prêt ?")) return;
        await fetch(`/deleteLoan/${del.dataset.del}`, { method: "DELETE" });
        await loadLoans();
    }
});

// =====================================================
// 7) ANNULER EDITION
// =====================================================
cancelEdit.addEventListener("click", () => {
    formLoans.reset();
    loanId.value = "";
    cancelEdit.style.display = "none";
    submitBtn.textContent = "Créer le prêt";
});

// =====================================================
// 8) RECHERCHE / FILTRE
// =====================================================
document.getElementById("filter-status").addEventListener("change", applyFilters);
document.getElementById("filter-client").addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);

function applyFilters() {
    const status = document.getElementById("filter-status").value;
    const clientFilter = document.getElementById("filter-client").value;
    const q = searchInput.value.toLowerCase();

    filteredLoans = loans.filter(l => {
        const client = clients.find(c => c.id === l.client_id);
        const fullName = client ? `${client.prenom} ${client.nom}`.toLowerCase() : "";

        return (!status || l.statut === status)
            && (!clientFilter || l.client_id === clientFilter)
            && (fullName.includes(q) || String(l.id).includes(q));
    });

    currentPage = 1;
    paginate();
}

// =====================================================
// INIT
// =====================================================
async function init() {
    await loadClients();
    await loadLoans();
}
init();
