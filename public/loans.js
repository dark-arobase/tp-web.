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
const filterStatus = document.getElementById("filter-status");
const filterClient = document.getElementById("filter-client");

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

function showSuccess(message = "Succès") {
    const box = document.getElementById("success-message");
    if (!box) return;
    box.textContent = message;
    box.style.display = "block";
    setTimeout(() => box.style.display = "none", 2500);
}

function showError(message = "Erreur") {
    const box = document.getElementById("error-message");
    if (!box) return;
    box.textContent = message;
    box.style.display = "block";
    setTimeout(() => box.style.display = "none", 2500);
}

[ 
    [loanClientSelect, errorClient],
    [montantInput, errorMontant],
    [tauxInput, errorTaux],
    [dureeInput, errorDuree],
    [dateInput, errorDate]
].forEach(([input, err]) => {
    input.addEventListener("input", () => clearFieldError(input, err));
});

// LOAD CLIENTS
// =====================================================
async function loadClients() {
    try {
        const res = await fetch("/allClients");
        if (!res.ok) {
            showError("Erreur lors du chargement des clients");
            return;
        }
        
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
        if (!res.ok) {
            showError("Erreur lors du chargement des prêts");
            return;
        }
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
function AffichageLoans(list) {

    loansTableBody.innerHTML = "";

    // Si aucun élément → message clair
    if (!list || list.length === 0) {
        loansTableBody.innerHTML =
            `<tr><td colspan="9" class="has-text-centered">Aucun prêt trouvé</td></tr>`;
        return;

    }

    // Affichage normal
    list.forEach(l => {

        const client = clients.find(c => c.id == l.client_id);
        const fullName = client ? `${client.prenom} ${client.nom}` : "—";

        // Choix couleur du statut
        const statusClass =
            l.statut === "EN RETARD"   ? "is-danger"  :
            l.statut === "REMBOURSÉ"  ? "is-success" :
                                          "is-info";

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${fullName}</td>
            <td>${Number(l.montant).toFixed(2)} $</td>
            <td>${l.taux}%</td>
            <td>${l.duree} mois</td>
            <td>${l.date}</td>
            <td>${Number(l.interets|| 0).toFixed(2)} $</td>
            <td>${Number(l.solde || 0).toFixed(2)} $</td>

            <td>
                <span class="tag ${statusClass}">
                    ${l.statut}
                </span>
            </td>

            <td>
                <button class="button is-small is-primary" data-edit="${l.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="button is-small is-danger" data-del="${l.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;

        loansTableBody.appendChild(tr);
    });
}

// =====================================================
// PAGINATION
// =====================================================
function paginate() {
    const start = (currentPage - 1) * loansPerPage;
    const end = start + loansPerPage;

    AffichageLoans(filteredLoans.slice(start, end));
    renderPagination();
}

function createPaginationButton(text, enabled, onClick) {
    const btn = document.createElement("button");
    btn.className = "button is-small";
    btn.textContent = text;
    btn.disabled = !enabled;

    if (enabled) btn.addEventListener("click", onClick);

    return btn;
}

function renderPagination() {

    paginationContainer.innerHTML = "";

    const totalPages = Math.ceil(filteredLoans.length / loansPerPage);
    if (totalPages <= 1) return;

    paginationContainer.appendChild(
        createPaginationButton("« Précédent", currentPage > 1, () => {
            currentPage--;
            paginate();
        })
    );

    for (let i = 1; i <= totalPages; i++) {
        const btn = createPaginationButton(i, true, () => {
            currentPage = i;
            paginate();
        });
        if (i === currentPage) btn.classList.add("is-primary");
        paginationContainer.appendChild(btn);
    }

    paginationContainer.appendChild(
        createPaginationButton("Suivant »", currentPage < totalPages, () => {
            currentPage++;
            paginate();
        })
    );
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

    if (!client_id) {
        showFieldError(loanClientSelect, errorClient, "Client requis");
        hasError = true;
    } else clearFieldError(loanClientSelect, errorClient);

    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
        showFieldError(montantInput, errorMontant, "Montant invalide (ex: 2500.50)");
        hasError = true;
    } else clearFieldError(montantInput, errorMontant);

    if (!taux || isNaN(Number(taux)) || Number(taux) < 0) {
        showFieldError(tauxInput, errorTaux, "Taux invalide (ex: 5.25)");
        hasError = true;
    } else clearFieldError(tauxInput, errorTaux);

    if (!duree || isNaN(Number(duree)) || Number(duree) <= 0 || !Number.isInteger(Number(duree))) {
        showFieldError(dureeInput, errorDuree, "Durée invalide (mois entiers)");
        hasError = true;
    } else clearFieldError(dureeInput, errorDuree);

    if (!date) {
        showFieldError(dateInput, errorDate, "Date requise");
        hasError = true;
    } else clearFieldError(dateInput, errorDate);

    if (hasError) return;

    try {
        if (id) {
            // ÉDITION
            const res = await fetch(`/editLoan/${encodeURIComponent(id)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ client_id, montant, taux, duree, date })
            });
            if (!res.ok) {
                showError("Erreur modification prêt");
                return;
            }

            showSuccess("Prêt modifié avec succès");
            loanId.value = "";
            formLoans.reset();
            cancelEdit.style.display = "none";
            submitBtn.textContent = "Créer prêt";
            await loadLoans();
        } else {
            const res = await fetch("/addLoan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ client_id, montant, taux, duree, date })
            }); 
            
            if (!res.ok) {
                showError("Erreur sauvegarde prêt");
            return; 
            }

            showSuccess("Prêt créé avec succès");
            loanId.value = "";
            formLoans.reset();
            cancelEdit.style.display = "none";
            submitBtn.textContent = "Créer prêt";

            await loadLoans();
        }
    } catch (error) {
        console.error(error);
        showError("Erreur lors de la sauvegarde du prêt");
    }
});

// Cancel: reset loan form and restore add mode
cancelEdit.addEventListener("click", (e) => {
        e.preventDefault();
        formLoans.reset();
        loanId.value = "";
        submitBtn.textContent = "Créer prêt";
        cancelEdit.style.display = "none";
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
        if (!l) {
            showError("Prêt introuvable");
            return;
        }

        loanId.value = id;
        loanClientSelect.value = l.client_id;
        montantInput.value = Number(l.montant).toFixed(2);
        tauxInput.value = Number(l.taux).toFixed(2);
        dureeInput.value = l.duree;
        dateInput.value = l.date;

        showSuccess("Prêt chargé pour modification");
        submitBtn.textContent = "Enregistrer modification";
        cancelEdit.style.display = "inline-block";
        return;
    }

    if (delBtn) {
        const id = delBtn.dataset.del;
        if (!confirm("Voulez-vous vraiment supprimer ce prêt ?")) 
            return;
        try {
            const res = await fetch(`/deleteLoan/${encodeURIComponent(id)}`, { method: "DELETE" });
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                console.error('Delete failed', res.status, errBody);
                showError("Erreur suppression prêt: " + errBody);
                return;
            }
            showSuccess("Prêt supprimé avec succès");
            await loadLoans();

        } catch (error) {
            console.error(error);
            showError("Erreur lors de la suppression du prêt");
        }

    }
});


// =====================================================
// FILTRES
// =====================================================
// =====================================================
// FILTRES — propre, robuste, lisible
// =====================================================
function applyFilters() {

    const status = filterStatus.value.trim();
    const selectedClient = filterClient.value.trim();
    const q = searchInput.value.trim().toLowerCase();

    filteredLoans = loans.filter(loan => {

        const client = clients.find(c => c.id == loan.client_id);
        const fullName = client ? `${client.prenom} ${client.nom}`.toLowerCase() : "";

        const okStatus = !status || loan.statut === status;
        const okClient = !selectedClient || loan.client_id == selectedClient;
        const okSearch =
            !q ||
            fullName.includes(q) ||
            String(loan.id).toLowerCase().includes(q);

        return okStatus && okClient && okSearch;
    });

    currentPage = 1;
    paginate();
}

filterStatus.addEventListener("change", applyFilters);
filterClient.addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);
// =====================================================
// INIT
// =====================================================
async function init() {
    await loadClients();
    await loadLoans();
}

init();
