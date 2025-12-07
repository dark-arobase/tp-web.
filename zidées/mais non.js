// =====================================================
// VARIABLES
// =====================================================
let loans = [];
let clients = [];
let paiements = [];
//let filtered = [];
let currentPage = 1;
let loansPerPage = 8;   

// =====================================================
// SELECTEURS FORM
// =====================================================
const formPaiement = document.getElementById("paiement-form");
const paymentIdInput = document.getElementById("payment-id");

const loanClientSelect = document.getElementById("clientSelect");
const loanSelect = document.getElementById("pretSelect");
const montantInput = document.getElementById("montant");
const dateInput = document.getElementById("date");
const modeInput = document.getElementById("mode");
const noteInput = document.getElementById("note");


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
        if (!res.ok) {
            showError("Impossible de charger les clients");
            return;
        }
        clients = await res.json();
    }catch (err) {
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
        loans = await res.json();

        // Peupler le select avec les prêts
        loanClientSelect.innerHTML = `
            <option value="">Sélectionnez un client</option>
            ${clients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join("")}
        `;

        document.getElementById("filter-client").innerHTML = `
            <option value="">Tous les clients</option>
            ${clients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join("")}
        `;

        loanSelect.innerHTML = `<option value="">Sélectionnez un prêt</option>`;
        loans.forEach(loan => {
            const client = clients.find(c => c.id === loan.client_id);
            const clientName = client ? `${client.prenom} ${client.nom}` : "Client inconnu";
            const option = document.createElement('option');
            option.value = loan.id;
            option.textContent = `${clientName} - ${loan.montant}$ (Solde: ${loan.solde}$)`;
            loanSelect.appendChild(option);
        });
        
    } catch (err) {
        console.error(err);
        showError('Erreur lors de la recuperation des prêts');
    }
}


// =====================================================
// 3. Load Payments for selected loan
// =====================================================
async function loadPayments() {
    const loanId = loanSelect.value;
    
    if (!loanId) {
        paymentsTableBody.innerHTML = 
            `<tr><td colspan="6" class="has-text-centered">Sélectionnez un prêt pour voir les paiements</td></tr>`;
        return;
    }
    
    try {
        const res = await fetch(`/api/paiements/${loanId}`);
        if (!res.ok) throw new Error('Erreur chargement paiements');
        
        paiements = await res.json();
        affichagePaiements();
        
    } catch (err) {
        console.error(err);
        showError('Erreur lors du chargement des paiements');
    }
}

// =====================================================
// 4. Affichage des paiements
// =====================================================
function affichagePaiements() {
    paymentsTableBody.innerHTML = "";
    
    if (paiements.length === 0) {
        paymentsTableBody.innerHTML =
            `<tr><td colspan="6" class="has-text-centered">Aucun paiement trouvé pour ce prêt</td></tr>`;
        return;
    }

    paiements.forEach(p => {
        const loan = loans.find(l => l.id === p.loan_id);
        const client = loan ? clients.find(c => c.id === loan.client_id) : null;
        const clientName = client ? `${client.prenom} ${client.nom}` : "—";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${clientName}</td>
            <td>${p.montant}$</td>
            <td>${p.date}</td>
            <td>${p.mode}</td>
            <td>${p.note || "—"}</td>
            <td>
                <button class="button is-small is-danger" data-del="${p.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        paymentsTableBody.appendChild(row);
    });
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
/////////////////////////////////////
// GET payments by loan
router.get('/api/paiements/:loan_id', async (req, res) => {
    try {
        const { loan_id } = req.params;
        const payments = await db('paiements')
            .where({ loan_id })
            .orderBy('creer_depuis', 'desc');

        res.status(200).json(payments);
    } catch (err) {
        console.error("Erreur GET /paiements/:loan_id", err);
        res.status(500).json({ error: "Erreur serveur.." });
    }
});

// POST create a payment
router.post('/api/paiements', async (req, res) => {
    try {
        const { loan_id, montant, date, mode, note } = req.body;

        if (!loan_id || !montant || !date || !mode)
            return res.status(400).json({ error: "Champs manquants." });

        const id = crypto.randomUUID();
        await db('paiements').insert({ id, loan_id, montant, date, mode, note });
        // === UPDATE LOAN SOLDE ===
        const loan = await db('loans').where({ id: loan_id }).first();

        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        const nouveauSolde = loan.solde - montant;
        const nouveauStatut = nouveauSolde <= 0 ? "REMBOURSÉ" : "ACTIF";

        await db('loans')
            .where({ id: loan_id })
            .update({
                solde: nouveauSolde,
                statut: nouveauStatut
            });

        res.status(201).json({
            message: "Paiement ajouté",
            paiement_id: id,
            nouveauSolde,
            nouveauStatut
        });

    } catch (err) {
        console.error("Erreur POST /payments", err);
        res.status(500).json({ error: "Erreur serveur.." });
    }
});

// DELETE a payment by id
router.delete('/api/paiements/:payment_id', async (req, res) => {
    try {
        const { payment_id } = req.params;
        const paiement = await db('paiements').where({ id: payment_id }).first();
        if (!paiement) return res.status(404).json({ error: 'Paiement introuvable.' });

        // remove the payment
        await db('paiements').where({ id: payment_id }).del();

        // update the loan solde (add the montant back)
        const loan = await db('loans').where({ id: paiement.loan_id }).first();
        if (loan) {
            const montant = Number(paiement.montant) || 0;
            const nouveauSolde = Number(loan.solde) + montant;
            const nouveauStatut = nouveauSolde <= 0 ? "REMBOURSÉ" : "ACTIF";

            await db('loans').where({ id: paiement.loan_id }).update({
                solde: nouveauSolde,
                statut: nouveauStatut
            });
        }

        res.status(200).json({ message: 'Paiement supprimé' });
    } catch (err) {
        console.error('Erreur DELETE /paiements/:payment_id', err);
        res.status(500).json({ error: 'Erreur serveur..' });
    }
});

module.exports = router;