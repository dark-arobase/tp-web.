



/*let clients = [];

// Selecteurs (alignés avec clients.html)
const formClient = document.getElementById('client-form');
const idClient = document.getElementById('client-id');

var sortColumn = '';
var sortDirection = 'asc';

const nomClient = document.getElementById('nom');
const prenomClient = document.getElementById('prenom');
const telephoneClient = document.getElementById('telephone');
const emailClient = document.getElementById('email');
const adresseClient = document.getElementById('adresse');



const submitClientBtn = document.getElementById('submit-btn');
const cancelClientEdit = document.getElementById('cancel-edit');
const clientsTableBody = document.querySelector('#clients-table tbody');


/*const searchInput = document.getElementById('search');

if (searchInput) {
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredClients = clients.filter(c => 
            `${c.prenom} ${c.nom}`.toLowerCase().includes(searchTerm) ||
             c.telephone.toLowerCase().includes(searchTerm) ||
             c.email.toLowerCase().includes(searchTerm) ||
             c.adresse.toLowerCase().includes(searchTerm)
        );
        renderClients(filteredClients);
    });
}

// Clear search button
var clearSearch = document.getElementById('clear-search');
if (clearSearch) {
    clearSearch.addEventListener('click', function(){
        if (searchInput) searchInput.value = '';
        renderClients(clients);
    });
}

// Simple sorting function used by HTML headers
function sortClients(column) {
    if (!column) return;
    if (sortColumn === column) sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
    else { sortColumn = column; sortDirection = 'asc'; }
    clients.sort(function(a,b){
        var va = (a[column] || '').toString().toLowerCase();
        var vb = (b[column] || '').toString().toLowerCase();
        if (va < vb) return sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    renderClients(clients);
}


// Tri par Nom complet
const sortName = document.getElementById("sort-name");
let sortAsc = true;

if (sortName) {
    sortName.style.cursor = "pointer";

    sortName.addEventListener("click", () => {
        clients.sort((a, b) => {
            const fullA = `${a.prenom} ${a.nom}`.toLowerCase();
            const fullB = `${b.prenom} ${b.nom}`.toLowerCase();
            return sortAsc ? fullA.localeCompare(fullB) : fullB.localeCompare(fullA);
        });

        sortAsc = !sortAsc;
        renderClients();
    });
}



// Hide cancel button initially (will be shown in edit mode)
if (cancelClientEdit) cancelClientEdit.style.display = 'none';
function renderClients(list) {
    if (!clientsTableBody) return;
    clientsTableBody.innerHTML = '';
    var toShow = list || clients;
    toShow.forEach(c => {
        const tr = document.createElement('tr');
        //<td>${c.id}</td>
        tr.innerHTML = `    
            <td>${c.prenom} ${c.nom}</td>
            <td>${c.telephone}</td>
            <td>${c.email}</td>
            <td>${c.adresse}</td>
            <td>-</td>
            <td>
                <button class="button is-small is-primary" data-edit="${c.id}">Éditer</button>
                <button class="button is-small is-danger" data-del="${c.id}">Supprimer</button>
            </td>
        `;
        clientsTableBody.appendChild(tr);
        });
}

// === RECHERCHE SIMPLE (active) ===
var searchInput = document.getElementById('search-client');
if (searchInput) {
    searchInput.addEventListener('input', function(){
        var term = searchInput.value.trim().toLowerCase();
        if (!term) return renderClients();
        var filtered = clients.filter(function(c){
            return (c.nom && c.nom.toLowerCase().includes(term)) ||
                         (c.prenom && c.prenom.toLowerCase().includes(term)) ||
                         (c.email && c.email.toLowerCase().includes(term)) ||
                         (c.telephone && c.telephone.toLowerCase().includes(term)) ||
                         (c.adresse && c.adresse.toLowerCase().includes(term));
        });
        renderClients(filtered);
    });
}

// Clear search button
var clearSearch = document.getElementById('clear-search');
if (clearSearch) {
    clearSearch.addEventListener('click', function(){
        if (searchInput) searchInput.value = '';
        renderClients();
    });
}

// Simple sorting function used by HTML headers
function sortClients(column) {
    if (!column) return;
    if (sortColumn === column) sortDirection = (sortDirection === 'asc') ? 'desc' : 'asc';
    else { sortColumn = column; sortDirection = 'asc'; }
    clients.sort(function(a,b){
        var va = (a[column] || '').toString().toLowerCase();
        var vb = (b[column] || '').toString().toLowerCase();
        if (va < vb) return sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    renderClients();
}

// Charger les clients depuis le serveur
async function loadClients() {
    try {
        const res = await fetch('/allClients');
        if (!res.ok) {
            alert('Erreur lors de la recuperation des clients');
            return;
        }
        clients = await res.json();
        renderClients();
    } catch (err) {
        console.error(err);
        alert('Erreur lors de la recuperation des clients');
    }
}

// Formulaire ajout/modification client

    formClient.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = idClient.value.trim(); // Si présent → mode modification
        const nom = nomClient.value.trim();
        const prenom = prenomClient.value.trim();
        const telephone = telephoneClient.value.trim();
        const email = emailClient.value.trim();
        const adresse = adresseClient.value.trim();

        if (!nom ) {
        alert('Un nom valide est requis');
            return;
        }

        if (!prenom) {
        alert('Un prénom valide est requis');
            return;
        }

        if (!telephone || !/^\+?\d{10}$/.test(telephone)) {
            alert('Un téléphone valide est requis');
            return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Un email valide est requis');
            return;
        }
        if (!adresse ) {
        alert('L adresse est requise');
            return;
        }
        try {
            if (id) {
                // PUT update
                const res = await fetch(`/editClient/${encodeURIComponent(id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nom, prenom, telephone, email, adresse })
                });
                if (!res.ok) {
                    alert('Erreur lors de la modification du client');
                    return;
                }
                await loadClients();

                submitClientBtn.textContent = "Ajouter";
                cancelClientEdit.style.display = "none";
                formClient.reset();
                nomClient.focus();
                prenomClient.focus();
                telephoneClient.focus();
                emailClient.focus();
                adresseClient.focus();
            } else {
                // POST create
                const res = await fetch("/addClient", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nom, prenom, telephone, email, adresse })
                });

                if (!res.ok) {
                    alert("Erreur lors de l'ajout du client");
                    return;
                }
                await loadClients();
                formClient.reset();
                nomClient.focus();
                prenomClient.focus();
                telephoneClient.focus();
                emailClient.focus();
                adresseClient.focus();
            }
        } catch (err) {
            console.error(err);
            alert('Erreur lors de l ajout/modification du client');
        }
    });


    // Cancel: reset form and restore add mode
    cancelClientEdit.addEventListener("click", (e) => {
        e.preventDefault();
        idClient.value = '';
        formClient.reset();
        submitClientBtn.textContent = "Ajouter";
        cancelClientEdit.style.display = "none";
        nomClient.focus();
    });


// Event delegation for edit/delete buttons in the clients table
if (clientsTableBody) {
    clientsTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('button[data-edit]');
        const delBtn = e.target.closest('button[data-del]');

        if (editBtn) {
            const id = editBtn.dataset.edit;
            const client = clients.find(c => String(c.id) === String(id));
            if (!client) return;
            if (idClient) idClient.value = client.id;
            if (nomClient) nomClient.value = client.nom || '';
            if (prenomClient) prenomClient.value = client.prenom || '';
            if (telephoneClient) telephoneClient.value = client.telephone || '';
            if (emailClient) emailClient.value = client.email || '';
            if (adresseClient) adresseClient.value = client.adresse || '';
            if (submitClientBtn) submitClientBtn.textContent = 'Enregistrer';
            if (cancelClientEdit) cancelClientEdit.style.display = 'inline-flex';
            if (nomClient) nomClient.focus();
            return;
        }

        if (delBtn) {
            const id = delBtn.dataset.del;
            if (!confirm('Voulez-vous vraiment supprimer ce client ?')) return;
            try {
                const res = await fetch(`/deleteClient/${encodeURIComponent(id)}`, { method: 'DELETE' });
                if (!res.ok) {
                    const errBody = await res.text().catch(() => '');
                    console.error('Delete failed', res.status, errBody);
                    alert('Erreur lors de la suppression du client');
                    return;
                }
                await loadClients();
            } catch (err) {
                console.error(err);
                alert('Erreur lors de la suppression du client');
            }
            return;
        }
    });
}

//
function showSuccess(message = "Succès !") {
    const box = document.getElementById("success-message");
    if (!box) return;
    box.textContent = message;
    box.style.display = "block";
    setTimeout(() => { box.style.display = "none"; }, 2500);
}

// 
function showError(message = "Erreur.") {
    const box = document.getElementById("error-message");
    if (!box) return;
    box.textContent = message;
    box.style.display = "block";
    setTimeout(() => { box.style.display = "none"; }, 2500);
}

loadClients();*/