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
cancelEdit.style.display = "none";

const paymentsTableBody = document.querySelector("#payments-table tbody");

// =====================================================
// ERREURS
// =====================================================
const errorPret = document.getElementById("pret-error");
const errorMontant = document.getElementById("montant-error");
const errorDate = document.getElementById("date-error");
const errorMode = document.getElementById("mode-error");

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

// enlever erreur en tapant / change
loanSelect.addEventListener("change", () =>
  clearFieldError(loanSelect, errorPret)
);
montantInput.addEventListener("input", () =>
  clearFieldError(montantInput, errorMontant)
);
dateInput.addEventListener("input", () =>
  clearFieldError(dateInput, errorDate)
);
modeInput.addEventListener("change", () =>
  clearFieldError(modeInput, errorMode)
);

// =====================================================
// 1. Charger les clients
// =====================================================
async function loadClients() {
  try {
    const res = await fetch("/allClients");
    if (!res.ok) throw new Error("HTTP " + res.status);
    clients = await res.json();
  } catch (err) {
    console.error(err);
    showError("Erreur lors du chargement des clients");
  }
}

// =====================================================
// 2. Charger prêts + remplir SELECT
// =====================================================
async function loadLoans() {
  try {
    const res = await fetch("/allLoans");
    if (!res.ok) throw new Error("HTTP " + res.status);
    loans = await res.json();

    loanSelect.innerHTML =
      `<option value="">Sélectionnez un prêt</option>` +
      loans
        .map((l) => {
          const c = clients.find((x) => x.id === l.client_id);
          const nom = c ? `${c.prenom} ${c.nom}` : "Client inconnu";

          return `<option value="${l.id}">
                    ${nom} - ${Number(l.montant).toFixed(2)} $ (Solde: ${Number(
            l.solde || 0
          ).toFixed(2)} $)
                </option>`;
        })
        .join("");
  } catch (err) {
    console.error(err);
    showError("Erreur chargement prêts");
  }
}

// =====================================================
// 3. Charger paiements (tous ou par prêt)
// =====================================================
async function loadPayments() {
  const loanId = loanSelect.value;

  try {
    const res = loanId
      ? await fetch(`/paiements/${loanId}`)
      : await fetch(`/allPaiements`);

    if (!res.ok) throw new Error("HTTP " + res.status);

    paiements = await res.json();
    filteredPaiements = paiements;

    currentPage = 1;
    paginatePayments();
  } catch (err) {
    console.error(err);
    showError("Erreur chargement paiements");
  }
}

// Quand on change de prêt dans le select, on recharge la liste
loanSelect.addEventListener("change", () => {
  loadPayments();
});

// =====================================================
// 4. Afficher le tableau
// =====================================================
function renderPayments(list = paiements) {
  paymentsTableBody.innerHTML = "";

  if (list.length === 0) {
    paymentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="has-text-centered">Aucun paiement trouvé</td>
      </tr>`;
    return;
  }

  list.forEach((p) => {
    const loan = loans.find((l) => l.id == p.loan_id);
    const client = loan ? clients.find((c) => c.id == loan.client_id) : null;

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
// 5. Pagination
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
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      paginatePayments();
    }
  };
  paginationContainer.appendChild(prevBtn);

  // pages
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className =
      "button is-small" + (i === currentPage ? " is-primary" : "");
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      paginatePayments();
    };
    paginationContainer.appendChild(btn);
  }

  // next
  const nextBtn = document.createElement("button");
  nextBtn.className = "button is-small";
  nextBtn.textContent = "Suivant »";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      paginatePayments();
    }
  };
  paginationContainer.appendChild(nextBtn);
}

// =====================================================
// 6. FORMULAIRE AJOUT / MODIF
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

  if (!loan_id) {
    showFieldError(loanSelect, errorPret, "Sélectionnez un prêt");
    hasError = true;
  }
  if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
    showFieldError(montantInput, errorMontant, "Montant invalide (ex : 25.32)");
    hasError = true;
  }
  if (!date) {
    showFieldError(dateInput, errorDate, "Date requise");
    hasError = true;
  }
  if (!mode) {
    showFieldError(modeInput, errorMode, "Choisissez un mode");
    hasError = true;
  }

  if (hasError) return;

  // VALIDATION SOLDE (création uniquement)
    if (!id) {
    const text = loanSelect.options[loanSelect.selectedIndex].textContent;
    const match = text.match(/Solde:\s*([0-9.,]+)/);
    const solde = match ? Number(match[1].replace(",", ".")) : 0;

    if (Number(montant) > solde) {
      showFieldError(
        montantInput,
        errorMontant,
        "Montant > solde restant sur ce prêt"
      );
      return;
    }
  }

  try {
    let res;
    if (id) {
      // modification
      res = await fetch(`/editPaiement/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loan_id, montant, date, mode, note }),
      });
    } else {
      // ajout
      res = await fetch(`/addPaiement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loan_id, montant, date, mode, note }),
      });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(data.error || "Erreur lors de l'enregistrement");
      return;
    }

    showSuccess(id ? "Paiement modifié" : "Paiement ajouté");

    formPaiement.reset();
    paymentIdInput.value = "";
    cancelEdit.style.display = "none";
    submitBtn.textContent = "Ajouter paiement";

    // Recharger les prêts (solde mis à jour + statut) puis les paiements
    await loadLoans();
    loanSelect.value = loan_id;
    await loadPayments();
  } catch (err) {
    console.error(err);
    showError("Erreur serveur");
  }
});

// =====================================================
// 7. ÉDITION / SUPPRESSION
// =====================================================
paymentsTableBody.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-edit]");
  const delBtn = e.target.closest("[data-del]");

  if (editBtn) {
    const id = editBtn.dataset.edit;
    const p = paiements.find((x) => x.id == id);
    if (!p) return;

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
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data.error || "Erreur suppression");
        return;
      }

      showSuccess("Paiement supprimé");
      await loadLoans();
      await loadPayments();
    } catch (err) {
      console.error(err);
      showError("Erreur serveur");
    }
  }
});

// =====================================================
// Notifications
// =====================================================
function showSuccess(msg) {
  const box = document.getElementById("success-message");
  if (!box) return;
  box.textContent = msg;
  box.style.display = "block";
  setTimeout(() => (box.style.display = "none"), 2000);
}

function showError(msg) {
  const box = document.getElementById("error-message");
  if (!box) return;
  box.textContent = msg;
  box.style.display = "block";
  setTimeout(() => (box.style.display = "none"), 2000);
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
