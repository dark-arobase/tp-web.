// =========================
// VARIABLES
// =========================
let clients = [];
let filteredClients = [];
let currentPage = 1;
let clientsPerPage = 10;
let sortColumn = "";
let sortDirection = "asc";

// =========================
// SELECTEURS FORM
// =========================
const formClient = document.getElementById("client-form");
const idClient = document.getElementById("client-id");

const nomClient = document.getElementById("nom");
const prenomClient = document.getElementById("prenom");
const telephoneClient = document.getElementById("telephone");
const emailClient = document.getElementById("email");
const adresseClient = document.getElementById("adresse");

// erreurs
const errorNomClient = document.getElementById("nom-error");
const errorPrenomClient = document.getElementById("prenom-error");
const errorTelephoneClient = document.getElementById("telephone-error");
const errorEmailClient = document.getElementById("email-error");
const errorAdresseClient = document.getElementById("adresse-error");

// Pagination
const paginationContainer = document.getElementById("client-pagination");

// Boutons
const submitClientBtn = document.getElementById("submit-btn");
const cancelClientEdit = document.getElementById("cancel-edit");

// Tableau
const clientsTableBody = document.querySelector("#clients-table tbody");

// Recherche
const searchInput = document.getElementById("search-client");
const clearSearchBtn = document.getElementById("clear-search");
cancelClientEdit.style.display = "none";

// =========================
// VALIDATION VISUELLE
// =========================
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

// =========================
// RENDU TABLEAU
// =========================
function renderClients(list = filteredClients) {
        clientsTableBody.innerHTML = "";

    if (list.length === 0) {
        clientsTableBody.innerHTML =
            `<tr><td colspan="6" class="has-text-centered">Aucun client trouvé</td></tr>`;
        return;
    }

    list.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${c.prenom} ${c.nom}</td>
            <td>${c.telephone}</td>
            <td>${c.email}</td>
            <td>${c.adresse}</td>
            <td><span class="tag is-info">${c.loan_count || 0}</span></td>
            <td>
                <button class="button is-small is-primary" data-edit="${c.id}">
                <i class="fas fa-edit"></i></button>
                <button class="button is-small is-danger" data-del="${c.id}">
                <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        clientsTableBody.appendChild(tr);
    });
}




// =========================
// TRI
// =========================
function sortClients(column) {
    if (sortColumn === column) {
        // si on clique deux fois -> on inverse le sens
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortColumn = column;
        sortDirection = "asc";
    }

    filteredClients.sort((a, b) => {
        let valA, valB;

        if (column === "nom") {
            // nom complet
            valA = (a.prenom + " " + a.nom).toLowerCase();
            valB = (b.prenom + " " + b.nom).toLowerCase();
        } else if (column === "loan_count") {
            valA = Number(a.loan_count || 0);
            valB = Number(b.loan_count || 0);
        } else {
            valA = String(a[column] || "").toLowerCase();
            valB = String(b[column] || "").toLowerCase();
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    currentPage = 1;
    paginate();
    updateSortIcons();
}

function updateSortIcons() {
    const headers = document.querySelectorAll(".sort-link");
    headers.forEach(th => {
        const col = th.dataset.column;
        const icon = th.querySelector(".sort-icon");
        if (!icon) return;

        if (col === sortColumn) {
            icon.textContent = sortDirection === "asc" ? "▲" : "▼";
        } else {
            icon.textContent = "";
        }
    });
}

// =========================
// PAGINATION
// =========================
function paginate() {
    const start = (currentPage - 1) * clientsPerPage;
    const end = start + clientsPerPage;
    const pageList = filteredClients.slice(start, end);
    renderClients(pageList);
    renderPagination();
}

function renderPagination() {
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";

    const totalPages = Math.ceil(filteredClients.length / clientsPerPage);
    if (totalPages <= 1) return;

    // bouton précédent
    const prevBtn = document.createElement("button");
    prevBtn.className = "button is-small";
    prevBtn.textContent = "« Précédent";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            paginate();
        }
    });
    paginationContainer.appendChild(prevBtn);

    // boutons numérotés
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "button is-small" + (i === currentPage ? " is-primary" : "");
        pageBtn.textContent = i;
        pageBtn.addEventListener("click", () => {
            currentPage = i;
            paginate();
        });
        paginationContainer.appendChild(pageBtn);
    }

    // bouton suivant
    const nextBtn = document.createElement("button");
    nextBtn.className = "button is-small";
    nextBtn.textContent = "Suivant »";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            paginate();
        }
    });
    paginationContainer.appendChild(nextBtn);
}

// Charger les clients depuis le serveur
async function loadClients() {
    try {
        const res = await fetch('/allClients');
        if (!res.ok) {
            showError('Erreur lors de la recuperation des clients');
            return;
        }
        clients = await res.json();
        filteredClients = [...clients];
        currentPage = 1;
        paginate();
    } catch (err) {
        console.error(err);
        showError('Erreur lors de la recuperation des clients');
    }
}


// =========================
// RECHERCHE LIVE
// =========================
searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    filteredClients = clients.filter(c =>
        `${String(c.prenom || "")} ${String(c.nom || "")}`.toLowerCase().includes(term) ||
        String(c.email || "").toLowerCase().includes(term) ||
        String(c.telephone || "").toLowerCase().includes(term) ||
        String(c.adresse || "").toLowerCase().includes(term)
    );
    currentPage = 1;
    paginate();
});

clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    filteredClients = [...clients];
    paginate();
});

// =========================
// SUBMIT FORM
// =========================
formClient.addEventListener('submit', async (event) => {
        event.preventDefault();

        const id = idClient.value.trim(); // Si présent → mode modification
        const nom = nomClient.value.trim();
        const prenom = prenomClient.value.trim();
        const telephone = telephoneClient.value.trim();
        const email = emailClient.value.trim();
        const adresse = adresseClient.value.trim();
        
        let hasError = false;

        if (!nom) {
            showFieldError(nomClient, errorNomClient, "Un nom valide est requis");
            hasError = true;
        } else clearFieldError(nomClient, errorNomClient);

        if (!prenom) {
            showFieldError(prenomClient, errorPrenomClient, "Un prénom valide est requis");
            hasError = true;
        } else clearFieldError(prenomClient, errorPrenomClient);

        if (!telephone || !/^\+?\d{10}$/.test(telephone)) {
            showFieldError(telephoneClient, errorTelephoneClient, "Téléphone invalide (10 chiffres)");
            hasError = true;
        } else clearFieldError(telephoneClient, errorTelephoneClient);

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError(emailClient, errorEmailClient, "Email invalide");
            hasError = true;
        } else clearFieldError(emailClient, errorEmailClient);

        if (!adresse) {
            showFieldError(adresseClient, errorAdresseClient, "Adresse requise");
            hasError = true;
        } else clearFieldError(adresseClient, errorAdresseClient);

        if (hasError) return;

        try {
            if (id) {
                // PUT update
                const res = await fetch(`/editClient/${encodeURIComponent(id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nom, prenom, telephone, email, adresse })
                });
                if (!res.ok) {
                    showError('Erreur lors de la modification du client');
                    return;
                }
                showSuccess("Client modifié avec succès");
                formClient.reset();
                idClient.value = "";
                cancelClientEdit.style.display = "none";
                submitClientBtn.textContent = "Ajouter le client";
                
                await loadClients();

            } else {
                // POST create
                const res = await fetch(`/addClient`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nom, prenom, telephone, email, adresse })
                });

                if (!res.ok) {
                    showError("Erreur lors de l'ajout du client");
                    return;
                }
                showSuccess("Client ajouté avec succès");
                formClient.reset();
                idClient.value = "";
                cancelClientEdit.style.display = "none";
                submitClientBtn.textContent = "Ajouter le client";
                
                await loadClients();
            }
        } catch (err) {
            console.error(err);
            showError('Erreur lors de l ajout/modification du client');
    }
});


    // Cancel: reset form and restore add mode
cancelClientEdit.addEventListener("click", (e) => {
        e.preventDefault();
        formClient.reset();
        idClient.value = "";
        submitClientBtn.textContent = "Ajouter le client";
        cancelClientEdit.style.display = "none";
});


// Event delegation for edit/delete buttons in the clients table
clientsTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('button[data-edit]');
        const delBtn = e.target.closest('button[data-del]');

        if (editBtn) {
            const id = editBtn.dataset.edit;
            const client = clients.find(c => String(c.id) === String(id));
            if (!client) return;

            idClient.value = client.id;
            nomClient.value = client.nom;
            prenomClient.value = client.prenom;
            telephoneClient.value = client.telephone;
            emailClient.value = client.email;
            adresseClient.value = client.adresse;
            
            showSuccess("Client chargé pour modification");
            submitClientBtn.textContent = 'Enregistrer';
            cancelClientEdit.style.display = 'inline-flex';
            
            return;
        }

        if (delBtn) {
            const id = delBtn.dataset.del;
            if (!confirm('Voulez-vous vraiment supprimer ce client ?')) 
                return;
            try {
                const res = await fetch(`/deleteClient/${encodeURIComponent(id)}`, { method: 'DELETE' });
                if (!res.ok) {
                    const errBody = await res.text().catch(() => '');
                    console.error('Delete failed', res.status, errBody);
                    showError('Erreur lors de la suppression du client');
                    return;
                }
                showSuccess("Client supprimé avec succès");
                await loadClients();
            } catch (err) {
                console.error(err);
                showError('Erreur lors de la suppression du client');
            }
            return;
        }
});

function showSuccess(message = "Succès !") {
    const box = document.getElementById("success-message");
    if (!box) return;
    box.textContent = message;
    box.style.display = "block";
    setTimeout(() => { box.style.display = "none"; }, 2500);
}

function showError(message = "Erreur.") {
    const box = document.getElementById("error-message");
    if (!box) return;
    box.textContent = message;
    box.style.display = "block";
    setTimeout(() => { box.style.display = "none"; }, 2500);
}


loadClients();