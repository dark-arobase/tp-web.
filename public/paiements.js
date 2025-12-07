// =====================================================
// VARIABLES
// =====================================================
let loans = [];
let clients = [];
let paiements = [];
let filteredPaiements = [];

let currentPage = 1;
const paymentsPerPage = 10;

const paginationContainer = document.getElementById("pagination");

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

// erreurs individuelles
const errorPret = document.getElementById('pret-error');
const errorMontant = document.getElementById('montant-error');
const errorDate = document.getElementById('date-error');
const errorMode = document.getElementById('mode-error');

// helpers
function showFieldError(input, errorElement, message) {
    input.classList.add('is-danger');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}
function clearFieldError(input, errorElement) {
    input.classList.remove('is-danger');
    errorElement.style.display = 'none';
}

// listeners pour retirer les erreurs en direct
loanSelect.addEventListener('change', () => clearFieldError(loanSelect, errorPret));
montantInput.addEventListener('input', () => clearFieldError(montantInput, errorMontant));
dateInput.addEventListener('input', () => clearFieldError(dateInput, errorDate));
modeInput.addEventListener('change', () => clearFieldError(modeInput, errorMode));


// =====================================================
// 1. Charger les clients
// =====================================================
async function loadClients() {
    try {
        const res = await fetch("/allClients");
        clients = await res.json();
    } catch (err) {
        console.error(err);
        showError("Erreur chargement clients");
    }
}


// =====================================================
// 2. Charger prêts + remplir select
// =====================================================
async function loadLoans() {
    try {
        const res = await fetch("/allLoans");
        loans = await res.json();

        loanSelect.innerHTML = `
            <option value="">Sélectionnez un prêt</option>
            ${loans.map(l => {
                const c = clients.find(x => x.id === l.client_id);
                const nom = c ? `${c.prenom} ${c.nom}` : "Client inconnu";

                return `<option value="${l.id}">
                    ${nom} - ${Number(l.montant).toFixed(2)} $ (Solde: ${Number(l.solde || 0).toFixed(2)} $)
                </option>`;
            }).join("")}
        `;
    } catch (err) {
        console.error(err);
        showError("Erreur chargement prêts");
    }
}


// =====================================================
// 3. Charger les paiements
// =====================================================
async function loadPayments() {
    const loanId = loanSelect.value;
    let res;

    try {
        res = loanId ? await fetch(`/paiements/${loanId}`) : await fetch(`/allPaiements`);
        paiements = await res.json();
        filteredPaiements = paiements;

        currentPage = 1;
        paginatePayments();

    } catch (err) {
        console.error(err);
        showError("Erreur chargement paiements");
    }
}


// =====================================================
// 4. Afficher paiements + pagination
// =====================================================
function renderPayments(list = paiements) {
    paymentsTableBody.innerHTML = "";

    if (list.length === 0) {
        paymentsTableBody.innerHTML =
            `<tr><td colspan="6" class="has-text-centered">Aucun paiement trouvé</td></tr>`;
        return;
    }

    list.forEach(p => {
        const loan = loans.find(l => l.id == p.loan_id);
        const client = loan ? clients.find(c => c.id == loan.client_id) : null;

        const name = client ? `${client.prenom} ${client.nom}` : "Client inconnu";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${name}</td>
            <td>${Number(p.montant).toFixed(2)} $</td>
            <td>${p.date}</td>
            <td>${p.mode}</td>
            <td>${p.note || "—"}</td>
            <td class="is-flex" style="gap:6px;">
                <button class="button is-small is-primary" data-edit="${p.id}">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="button is-small is-danger" data-del="${p.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        paymentsTableBody.appendChild(row);
    });
}


// =====================================================
// PAGINATION
// =====================================================
function paginatePayments() {
    const start = (currentPage - 1) * paymentsPerPage;
    const end = start + paymentsPerPage;

    const pageList = filteredPaiements.slice(start, end);

    renderPayments(pageList);
    renderPaymentsPagination();
}

function renderPaymentsPagination() {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(filteredPaiements.length / paymentsPerPage);

    if (totalPages <= 1) return;

    // prev
    const prevBtn = document.createElement("button");
    prevBtn.className = "button is-small";
    prevBtn.textContent = "« Précédent";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; paginatePayments(); };
    paginationContainer.appendChild(prevBtn);

    // numbered pages
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "button is-small" + (i === currentPage ? " is-primary" : "");
        pageBtn.textContent = i;
        pageBtn.onclick = () => { currentPage = i; paginatePayments(); };
        paginationContainer.appendChild(pageBtn);
    }

    // next
    const nextBtn = document.createElement("button");
    nextBtn.className = "button is-small";
    nextBtn.textContent = "Suivant »";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; paginatePayments(); };
    paginationContainer.appendChild(nextBtn);
}


// =====================================================
// 5. AJOUT / MODIFICATION
// =====================================================
formPaiement.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = paymentIdInput.value;
    const loan_id = loanSelect.value;
    const montant = montantInput.value;
    const date = dateInput.value;
    const mode = modeInput.value;
    const note = noteInput.value;

    let hasError = false;

    if (!loan_id) { showFieldError(loanSelect, errorPret, "Sélectionnez un prêt"); hasError = true; }
    if (!montant || Number(montant) <= 0) { showFieldError(montantInput, errorMontant, "Montant invalide"); hasError = true; }
    if (!date) { showFieldError(dateInput, errorDate, "Date invalide"); hasError = true; }
    if (!mode) { showFieldError(modeInput, errorMode, "Mode invalide"); hasError = true; }

    if (hasError) return;

    // ----------------------------
    // 🚨 NOUVELLE VALIDATION SOLDE
    // ----------------------------
    const option = loanSelect.options[loanSelect.selectedIndex];
    const match = option.textContent.match(/Solde:\s*([0-9.,]+)/);

    let soldeAffiche = match ? Number(match[1].replace(",", ".")) : 0;
    const montantNum = Number(parseFloat(montant).toFixed(2));

    if (!id) {
        if (montantNum > soldeAffiche) {
            showFieldError(montantInput, errorMontant, "Le montant dépasse le solde restant du prêt.");
            return;
        }
    }
    // en modification : tu peux AUSSI me demander de l'activer plus tard 😉


    try {
        let res;

        if (id) {
            res = await fetch(`/editPaiement/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loan_id, montant, date, mode, note })
            });
        } else {
            res = await fetch(`/addPaiement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loan_id, montant, date, mode, note })
            });
        }

        if (!res.ok) return showError("Erreur lors de la sauvegarde");

        showSuccess(id ? "Paiement modifié" : "Paiement ajouté");

        formPaiement.reset();
        paymentIdInput.value = "";
        cancelEdit.style.display = "none";
        submitBtn.textContent = "Ajouter paiement";

        await loadLoans();
        loanSelect.value = loan_id;
        await loadPayments();

    } catch (err) {
        console.error(err);
        showError("Erreur");
    }
});


// =====================================================
// 6. ÉDITION / SUPPRESSION
// =====================================================
paymentsTableBody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");

    if (editBtn) {
        const id = editBtn.dataset.edit;
        const p = paiements.find(x => x.id == id);

        paymentIdInput.value = id;
        loanSelect.value = p.loan_id;
        montantInput.value = Number(p.montant).toFixed(2);
        dateInput.value = p.date;
        modeInput.value = p.mode;
        noteInput.value = p.note;

        submitBtn.textContent = "Modifier";
        cancelEdit.style.display = "inline-block";
        return;
    }

    if (delBtn) {
        if (!confirm("Supprimer ce paiement ?")) return;

        try {
            const res = await fetch(`/deletePaiement/${delBtn.dataset.del}`, {
                method: "DELETE"
            });

            if (!res.ok) return showError("Erreur suppression");

            showSuccess("Paiement supprimé");

            await loadLoans();
            await loadPayments();

        } catch (err) {
            console.error(err);
        }
    }
});


// =====================================================
// Notifications
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


// =====================================================
// INIT
// =====================================================
async function init() {
    await loadClients();
    await loadLoans();
    await loadPayments();
}

init();
