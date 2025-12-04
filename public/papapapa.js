// =====================================================
// VARIABLES
// =====================================================
let loans = [];
let filteredLoans = [];
let clients = [];
let currentPage = 1;
let loansPerPage = 8;

// =====================================================
// SELECTEURS FORM
// =====================================================
const formPaiement = document.getElementById("paiement-form");
const paymentIdInput = document.getElementById("payment-id");

const montantInput = document.getElementById("montant");
const dateInput = document.getElementById("date");
const modeInput = document.getElementById("mode");
const noteInput = document.getElementById("note");
const loanSelect = document.getElementById("pretSelect");

const submitBtn = document.getElementById("submit-btn");
const cancelEdit = document.getElementById("cancel-edit");

const paymentsTableBody = document.querySelector("#payments-table tbody");

cancelEdit.style.display = "none";


// =====================================================
// 1. Load Clients
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
        showError("Impossible de charger les clients");
    }
}


// =====================================================
// 2. Load Loans
// =====================================================
async function loadLoans() {
    try {
        const res = await fetch('/allLoans');
        if (!res.ok) {
            alert('Erreur lors de la recuperation des prêts');
            return;
        }
        loans = await res.json();
        filteredLoans = [...loans];
        currentPage = 1;
        AffichageLoans();
        renderPagination();
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la recuperation des prêts');
    }
}


// =====================================================
// 3. Affichage paiements
// =====================================================
function AffichagePaiements() {
    paymentsTableBody.innerHTML = "";
    
    if (list.length === 0) {
        clientsTableBody.innerHTML =
            `<tr><td colspan="6" class="has-text-centered">Aucun Paiements trouvé</td></tr>`;
        return;
    }
    const start = (currentPage - 1) * loansPerPage;
    const end = start + loansPerPage;

    filteredLoans.slice(start, end).forEach(l => {
        const client = clients.find(c => String(c.id) === String(l.client_id));

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${client ? client.prenom + " " + client.nom : "—"}</td>
            <td>${l.montant}$</td>
            <td>${l.taux}%</td>
            <td>${l.duree} mois</td>
            <td>${l.date}</td>
            <td>${l.interets || 0}$</td>
            <td>${l.solde || 0}$</td>
            <td>${l.statut}</td>
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
// 4. Pagination
// =====================================================

function renderPagination() {
    const totalPages = Math.ceil(filteredLoans.length / loansPerPage);
    const pagination = document.getElementById("pagination");
    
    pagination.innerHTML = "";
    
    if (totalPages === 0) return;
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = `button ${i === currentPage ? "is-link" : ""}`;
        btn.textContent = i;

        btn.addEventListener("click", () => {
            currentPage = i;
            AffichageLoans();
            renderPagination();
        });
        pagination.appendChild(btn);
    }
}

// =====================================================
// 5. Gestion du formulaire
// =====================================================
formPaiement.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = paymentIdInput.value;
    const loan_id = loanSelect.value;
    //const clients_id = loanSelect.value;
    const montant = montantInput.value;
    const date = dateInput.value;
    const mode = modeInput.value;
    const note = noteInput.value;
    
    if (!loan_id) {
        showError("Veuillez sélectionner un prêt");
        return;
    }
    if (!montant || montant <= 0) {
        showError("Veuillez entrer un montant valide");
        return;
    }
    if (!date) {
        showError("Veuillez entrer une date valide");
        return;
    }
    if (!mode) {
        showError("Veuillez sélectionner un mode de paiement");
        return;
    }
    try {
        if (id) {
            // PUT
            const res = await fetch(`/editPaiement/${encodeURIComponent(id)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loan_id, montant, date, mode, note }),
            });
            if (!res.ok) {
                showError("Erreur lors de la modification du paiement");
                return;
            }
            formPaiement.reset();
            paymentIdInput.value = "";
            cancelEdit.style.display = "none";
            submitBtn.textContent = "Ajouter le paiement";
            await loadPayments();
        }
        else {
            // POST
            const res = await fetch("/addPaiement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loan_id, montant, date, mode, note }),
            });
            if (!res.ok) {
                showError("Erreur lors de la création du paiement");
                return;
            }
            showSuccess(id ? "Paiement modifié" : "Paiement créé !");
            formPaiement.reset();
            paymentIdInput.value = "";
            cancelEdit.style.display = "none";
            submitBtn.textContent = "Ajouter le paiement";
            await loadPayments();
        }
    } catch (error) {
        showError("Erreur lors de la soumission du formulaire");
        console.error(error);
    }
});

// =====================================================
// 6. Edition / Suppression
// =====================================================
paymentsTableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("button[data-edit]");
    const delBtn = e.target.closest("button[data-del]");

    // EDIT
    if (editBtn) {
        const id = editBtn.dataset.edit;
        const paiement = paiements.find(p => p.id == id);
        
        paymentIdInput.value = id;
        loanSelect.value = paiement.loan_id;
        montantInput.value = paiement.montant;
        dateInput.value = paiement.date;
        modeInput.value = paiement.mode;
        noteInput.value = paiement.note;
        
        submitBtn.textContent = "Modifier le paiement";
        cancelEdit.style.display = "inline-block";
        
    }

    // DELETE
    if (delBtn) {
        const id = delBtn.dataset.del;
        if (confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) {
            try {
                const res = await fetch(`/deletePaiement/${encodeURIComponent(id)}`, 
                 { method: "DELETE" });
                if (!res.ok) {
                    showError("Erreur lors de la suppression du paiement");
                    return;
                }
                showSuccess("Paiement supprimé");
                await loadPayments();
            } catch (error) {
                showError("Erreur lors de la suppression du paiement");
                console.error(error);
            }
        }
    }
});


// =====================================================
// 7. Recherche + Filtres
// =====================================================
document.getElementById("filter-status").addEventListener("change", applyFilters);
document.getElementById("filter-client").addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);

function applyFilters() {
    const status = document.getElementById("filter-status").value;
    const clientFilter = document.getElementById("filter-client").value;
    const q = searchInput.value.toLowerCase();
    filteredLoans = loans.filter(l => {
        const client = clients.find(c => String(c.id) === String(l.client_id));
        const name = client ? `${client.prenom} ${client.nom}`.toLowerCase() : "";
        return (!status || l.statut === status)
            && (!clientFilter || String(l.client_id) === String(clientFilter))
            && (name.includes(q) || String(l.id).includes(q));
    }
    );
    currentPage = 1;
    AffichageLoans();
    renderPagination();
}


// =====================================================
// 8. Annuler édition
// =====================================================
cancelEdit.addEventListener("click", () => {
    formPaiement.reset();
    paymentIdInput.value = "";
    submitBtn.textContent = "Ajouter le paiement";
    cancelEdit.style.display = "none";
});


// =====================================================
// 9. Notifications
// =====================================================
function showSuccess(msg) {
    const box = document.getElementById("success-message");
    box.textContent = msg;
    box.style.display = "block";
    setTimeout(() => box.style.display = "none", 2500);
}

function showError(msg) {
    const box = document.getElementById("error-message");
    box.textContent = msg;
    box.style.display = "block";
    setTimeout(() => box.style.display = "none", 2500);
}

async function init() {
    await loadClients();
    await loadLoans();
    await loadPayments();
}
init();