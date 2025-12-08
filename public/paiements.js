// =====================================================
// VARIABLES
// =====================================================
let loans = [];
let clients = [];
let paiements = [];
let filteredPaiements = [];

let currentPage = 1;
const paymentsPerPage = 10;

function round2(n) {
    const v = Number(n) || 0;
    return Math.round(v * 100) / 100;
}

const paymentsTableBody = document.querySelector("#payments-table tbody");
const paginationContainer = document.getElementById("pagination");

// =====================================================
// SELECTEURS FORM
// =====================================================
const formPaiement = document.getElementById("paiement-form");
const paymentIdInput = document.getElementById("payment-id");

const loanSelect = document.getElementById("pretSelect");
const montantInput = document.getElementById("montant");
const dateInput = document.getElementById("date");
const modeInput = document.getElementById("mode");
const noteInput = document.getElementById("note");

const submitBtn = document.getElementById("submit-btn");
const cancelEdit = document.getElementById("cancel-edit");
cancelEdit.style.display = "none";

let _skipLoanSelectChange = false;

loanSelect.addEventListener("change", async () => {
    if (_skipLoanSelectChange) return;
    await loadPayments();
});

// =====================================================
// NOTIFICATIONS
// =====================================================
function showSuccess(msg) {
    const box = document.getElementById("success-message");
    box.textContent = msg;
    box.style.display = "block";
    setTimeout(() => box.style.display = "none", 2200);
}

function showError(msg) {
    const box = document.getElementById("error-message");
    box.textContent = msg;
    box.style.display = "block";
    setTimeout(() => box.style.display = "none", 2200);
}

// =====================================================
// LOAD CLIENTS
// =====================================================
async function loadClients() {
    try {
        const res = await fetch("/allClients");
        clients = await res.json();
    } catch (err) {
        console.error(err);
    }
}

// =====================================================
// LOAD LOANS
// =====================================================
async function loadLoans() {
    try {
        const res = await fetch("/allLoans");
        loans = await res.json();

        loanSelect.innerHTML = `<option value="">Sélectionnez un prêt</option>`;

        loans.forEach(l => {
            const client = clients.find(c => c.id === l.client_id);
            const name = client ? `${client.prenom} ${client.nom}` : "Client inconnu";

            loanSelect.innerHTML += `
                <option value="${l.id}">
                    ${name} — ${Number(l.montant).toFixed(2)} $
                    (Solde: ${Number(l.solde).toFixed(2)} $)
                </option>
            `;
        });

    } catch (err) {
        console.error("Erreur loadLoans()", err);
    }
}

// =====================================================
// LOAD PAYMENTS — VERSION FIXÉE
// forceAll = true → recharge la liste complète
// =====================================================
async function loadPayments(forceAll = false) {
    try {
        let res;

        // Si forceAll → ignorer le select et charger TOUT
        if (forceAll) {
            res = await fetch("/allPaiements");
        } else {
            const loanId = loanSelect.value;

            if (loanId) {
                res = await fetch(`/paiements/${loanId}`);
            } else {
                res = await fetch("/allPaiements");
            }
        }

        if (!res.ok) {
            showError("Erreur chargement paiements");
            return;
        }

        paiements = await res.json();
        filteredPaiements = [...paiements];

        currentPage = 1;
        paginatePayments();

    } catch (err) {
        console.error(err);
        showError("Erreur serveur paiements");
    }
}

// =====================================================
// DISPLAY TABLE
// =====================================================
function renderPayments(list) {
    paymentsTableBody.innerHTML = "";

    if (!list.length) {
        paymentsTableBody.innerHTML =
            `<tr><td colspan="6" class="has-text-centered">Aucun paiement</td></tr>`;
        return;
    }

    list.forEach(p => {
        const loan = loans.find(l => l.id == p.loan_id);
        const client = loan ? clients.find(c => c.id == loan.client_id) : null;
        const name = client ? `${client.prenom} ${client.nom}` : "Client inconnu";

        const tr = document.createElement("tr");
        tr.innerHTML = `
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
        paymentsTableBody.appendChild(tr);
    });
}

// =====================================================
// PAGINATION
// =====================================================
function paginatePayments() {
    const start = (currentPage - 1) * paymentsPerPage;
    const end = start + paymentsPerPage;

    renderPayments(filteredPaiements.slice(start, end));
    renderPaymentsPagination();
}

function createPaginationButton(label, disabled, cb) {
    const btn = document.createElement("button");
    btn.className = "button is-small";
    btn.textContent = label;
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener("click", cb);
    return btn;
}

function renderPaymentsPagination() {
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(filteredPaiements.length / paymentsPerPage);
    if (totalPages <= 1) return;

    paginationContainer.appendChild(
        createPaginationButton("« Précédent", currentPage === 1, () => {
            currentPage--;
            paginatePayments();
        })
    );

    for (let i = 1; i <= totalPages; i++) {
        const btn = createPaginationButton(i, false, () => {
            currentPage = i;
            paginatePayments();
        });
        if (i === currentPage) btn.classList.add("is-primary");
        paginationContainer.appendChild(btn);
    }

    paginationContainer.appendChild(
        createPaginationButton("Suivant »", currentPage === totalPages, () => {
            currentPage++;
            paginatePayments();
        })
    );
}

// =====================================================
// SUBMIT FORM
// =====================================================
formPaiement.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = paymentIdInput.value;
    const loan_id = loanSelect.value;

    const montantRaw = (montantInput.value || "").replace(",", ".");
    const montant = round2(parseFloat(montantRaw));

    const date = dateInput.value;
    const mode = modeInput.value;
    const note = noteInput.value;

    if (!loan_id) return showError("Sélectionnez un prêt");
    if (!montant || montant <= 0) return showError("Montant invalide");
    if (!date) return showError("Date requise");
    if (!mode) return showError("Mode requis");

    try {
        let res;

        if (id) {
            res = await fetch(`/editPaiement/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ montant, date, mode, note })
            });
        } else {
            res = await fetch("/addPaiement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loan_id, montant, date, mode, note })
            });
        }

        if (!res.ok) return showError("Erreur serveur");

        showSuccess(id ? "Paiement modifié" : "Paiement ajouté");

        formPaiement.reset();
        paymentIdInput.value = "";
        cancelEdit.style.display = "none";
        submitBtn.textContent = "Ajouter paiement";

        // Recharge PROPRE : forceAll = true
        await loadLoans();
        await loadPayments(true);

    } catch (err) {
        console.error(err);
        showError("Erreur serveur");
    }
});

// =====================================================
// EDIT + DELETE
// =====================================================
paymentsTableBody.addEventListener("click", async e => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");

    if (edit) {
        const id = edit.dataset.edit;
        const p = paiements.find(x => x.id == id);

        paymentIdInput.value = id;

        _skipLoanSelectChange = true;
        loanSelect.value = p.loan_id;
        _skipLoanSelectChange = false;

        montantInput.value = Number(p.montant).toFixed(2);
        dateInput.value = p.date;
        modeInput.value = p.mode;
        noteInput.value = p.note;

        submitBtn.textContent = "Modifier";
        cancelEdit.style.display = "inline-block";
        showSuccess("Mode édition");

        return;
    }

    if (del) {
        if (!confirm("Supprimer ce paiement ?")) return;

        const id = del.dataset.del;

        try {
            const res = await fetch(`/deletePaiement/${id}`, { method: "DELETE" });
            if (!res.ok) return showError("Erreur suppression");

            showSuccess("Paiement supprimé");

            await loadLoans();
            await loadPayments(true);

        } catch (err) {
            console.error(err);
            showError("Erreur serveur");
        }
    }
});

// =====================================================
// INIT
// =====================================================
async function init() {
    await loadClients();
    await loadLoans();
    await loadPayments(true); // charge tout au lancement
}
init();
