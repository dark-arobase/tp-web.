// =====================================================
// VARIABLES
// =====================================================
let loans = [];
let clients = [];
let filteredLoans = [];
let currentPage = 1;
const loansPerPage = 10;

// =====================================================
// SELECTEURS FORM
// =====================================================
const formLoans = document.getElementById("loan-form");
const loanId = document.getElementById("loan-id");

const loanClientSelect = document.getElementById("clientSelect");
const montantInput = document.getElementById("montant");
const tauxInput = document.getElementById("taux");
const dureeInput = document.getElementById("duree");
const dateInput = document.getElementById("date");

const errorClient = document.getElementById("client-error");
const errorMontant = document.getElementById("montant-error");
const errorTaux = document.getElementById("taux-error");
const errorDuree = document.getElementById("duree-error");
const errorDate = document.getElementById("date-error");

const submitBtn = document.getElementById("submit-btn");
const cancelEdit = document.getElementById("cancel-edit");
const loansTableBody = document.querySelector("#loans-table tbody");
const searchInput = document.getElementById("search-loan");
const paginationContainer = document.getElementById("pagination");

cancelEdit.style.display = "none";

// =====================================================
// ERREURS
// =====================================================
function showFieldError(input, errorElement, message) {
    input.classList.add("is-danger");
    errorElement.textContent = message;
    errorElement.style.display = "block";
}

function clearFieldError(input, errorElement) {
    input.classList.remove("is-danger");
    errorElement.style.display = "none";
}

loanClientSelect.addEventListener("change", () => clearFieldError(loanClientSelect, errorClient));
montantInput.addEventListener("input", () => clearFieldError(montantInput, errorMontant));
tauxInput.addEventListener("input", () => clearFieldError(tauxInput, errorTaux));
dureeInput.addEventListener("input", () => clearFieldError(dureeInput, errorDuree));
dateInput.addEventListener("input", () => clearFieldError(dateInput, errorDate));


// =====================================================
// LOAD CLIENTS
// =====================================================
async function loadClients() {
    try {
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

    } catch (err) {
        console.error(err);
        showError("Erreur chargement clients");
    }
}


// =====================================================
// LOAD LOANS
// =====================================================
async function loadLoans() {
    try {
        const res = await fetch("/allLoans");
        loans = await res.json();
        filteredLoans = [...loans];
        currentPage = 1;
        paginate();
    } catch (err) {
        console.error(err);
        showError("Erreur chargement prêts");
    }
}


// =====================================================
// AFFICHAGE LOANS (VERSION FIXÉE)
// =====================================================
function AffichageLoans(list = filteredLoans) {
    loansTableBody.innerHTML = "";

    const start = (currentPage - 1) * loansPerPage;
    const end = start + loansPerPage;
    const displayList = list.slice(start, end);

    if (displayList.length === 0) {
        loansTableBody.innerHTML = `
            <tr><td colspan="9" class="has-text-centered">Aucun prêt trouvé</td></tr>
        `;
        return;
    }

    displayList.forEach(l => {
        const client = clients.find(c => String(c.id) === String(l.client_id));

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${client ? `${client.prenom} ${client.nom}` : "—"}</td>
            <td>${Number(l.montant).toFixed(2)} $</td>
            <td>${l.taux}%</td>
            <td>${l.duree} mois</td>
            <td>${l.date}</td>
            <td>${Number(l.interets).toFixed(2)} $</td>
            <td>${Number(l.solde).toFixed(2)} $</td>

            <td>
                <span class="tag ${
                    l.statut === "EN RETARD" ? "is-danger" :
                    l.statut === "REMBOURSÉ" ? "is-success" :
                    "is-info"
                }">
                    ${l.statut}
                </span>
            </td>

            <td>
                <button class="button is-small is-primary" data-edit="${l.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="button is-small is-danger" data-del="${l.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        loansTableBody.appendChild(row);
    });
}


// =====================================================
// PAGINATION
// =====================================================
function paginate() {
    AffichageLoans(filteredLoans);
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredLoans.length / loansPerPage);
    paginationContainer.innerHTML = "";
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = "button is-small " + (i === currentPage ? "is-primary" : "");
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            paginate();
        };
        paginationContainer.appendChild(btn);
    }
}


// =====================================================
// FORMULAIRE AJOUT / MODIFICATION
// =====================================================
formLoans.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = loanId.value;
    const client_id = loanClientSelect.value;
    const montant = montantInput.value;
    const taux = tauxInput.value;
    const duree = dureeInput.value;
    const date = dateInput.value;

    let hasError = false;
    if (!client_id) { showFieldError(loanClientSelect, errorClient, "Client requis"); hasError = true; }
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) { showFieldError(montantInput, errorMontant, "Montant invalide (ex: 25.32)"); hasError = true; }
    if (!taux || isNaN(Number(taux)) || Number(taux) < 0) { showFieldError(tauxInput, errorTaux, "Taux invalide (ex: 5.25)"); hasError = true; }
    if (!duree || isNaN(Number(duree)) || Number(duree) <= 0 || !Number.isInteger(Number(duree))) { showFieldError(dureeInput, errorDuree, "Durée invalide (mois entiers)"); hasError = true; }
    if (!date) { showFieldError(dateInput, errorDate, "Date requise"); hasError = true; }

    if (hasError) return;

    const body = { client_id, montant, taux, duree, date };

    const url = id ? `/editLoan/${id}` : "/addLoan";
    const method = id ? "PUT" : "POST";

    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) return showError("Erreur sauvegarde prêt");

    showSuccess(id ? "Prêt modifié" : "Prêt créé");

    loanId.value = "";
    formLoans.reset();
    cancelEdit.style.display = "none";
    submitBtn.textContent = "Créer prêt";

    await loadLoans();
});


// =====================================================
// EDIT + DELETE
// =====================================================
loansTableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");

    if (editBtn) {
        const id = editBtn.dataset.edit;
        const l = loans.find(x => x.id == id);

        loanId.value = id;
        loanClientSelect.value = l.client_id;
        montantInput.value = Number(l.montant).toFixed(2);
        tauxInput.value = Number(l.taux).toFixed(2);
        dureeInput.value = l.duree;
        dateInput.value = l.date;

        submitBtn.textContent = "Enregistrer modification";
        cancelEdit.style.display = "inline-block";
        return;
    }

    if (delBtn) {
        const id = delBtn.dataset.del;
        if (!confirm("Supprimer ce prêt ?")) return;

        await fetch(`/deleteLoan/${id}`, { method: "DELETE" });
        await loadLoans();
    }
});


// =====================================================
// FILTRES
// =====================================================
document.getElementById("filter-status").addEventListener("change", applyFilters);
document.getElementById("filter-client").addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);

function applyFilters() {
    const status = document.getElementById("filter-status").value;
    const clientF = document.getElementById("filter-client").value;
    const q = searchInput.value.toLowerCase();

    filteredLoans = loans.filter(l => {
        const client = clients.find(c => c.id == l.client_id);
        const full = (client?.prenom + " " + client?.nom).toLowerCase();

        return (!status || l.statut === status)
            && (!clientF || l.client_id === clientF)
            && full.includes(q);
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
