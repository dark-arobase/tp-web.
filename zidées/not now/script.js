// ...existing code...
const form = document.getElementById('client-form')
const fields = {
  nom: document.getElementById('nom'),
  prenom: document.getElementById('prenom'),
  telephone: document.getElementById('telephone'),
  email: document.getElementById('email'),
  adresse: document.getElementById('adresse')
}
const errors = {
  nom: document.getElementById('nom-error'),
  prenom: document.getElementById('prenom-error'),
  telephone: document.getElementById('telephone-error'),
  email: document.getElementById('email-error'),
  adresse: document.getElementById('adresse-error')
}

const successMessage = document.getElementById('success-message')
const errorMessage = document.getElementById('error-message')
const clientsTableBody = document.querySelector('#clients-table tbody')
const clientIdInput = document.getElementById('client-id')
const cancelEditBtn = document.getElementById('cancel-edit')

// afficher erreur
function showError(fieldName, message){
  errors[fieldName].textContent = message
  errors[fieldName].style.display = message ? 'block' : 'none'
  fields[fieldName].classList.toggle('is-danger', !!message)
}

// validations simples
function validateName(value){ return /^[A-Za-zÀ-ÖØ-öø-ÿ '\-]{2,50}$/.test(value.trim()) }
function validatePhone(value){ return /^\+?[0-9\s\-]{7,20}$/.test(value.trim()) }
function validateAddress(value){ return value.trim().length > 0 && value.trim().length <= 200 }

// valider champ
function validateField(name){
  const v = fields[name].value || ''
  switch(name){
    case 'nom':
    case 'prenom':
      if(!validateName(v)) showError(name, 'Nom/prénom invalide (lettres, espaces, - et \')')
      else showError(name, '')
      break
    case 'telephone':
      if(!validatePhone(v)) showError('telephone', 'Téléphone invalide (ex: +33123456789)')
      else showError('telephone', '')
      break
    case 'email':
      if(!fields.email.checkValidity()) showError('email', 'Email invalide')
      else showError('email', '')
      break
    case 'adresse':
      if(!validateAddress(v)) showError('adresse', 'Adresse requise (max 200 caractères)')
      else showError('adresse', '')
      break
  }
}

// écoute champs
Object.keys(fields).forEach(name=>{
  fields[name].addEventListener('input', ()=> validateField(name))
  fields[name].addEventListener('blur', ()=> validateField(name))
})

// récupérer clients
async function fetchClients(){
  try{
    const res = await fetch('/api/clients')
    const clients = await res.json()
    renderClients(clients)
  }catch(err){ console.error(err) }
}

// afficher clients
function renderClients(clients){
  clientsTableBody.innerHTML = ''
  clients.forEach(client=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${client.id}</td>
      <td>${client.nom}</td>
      <td>${client.prenom}</td>
      <td>${client.telephone}</td>
      <td>${client.email}</td>
      <td>${client.adresse}</td>
      <td>0</td>
      <td>
        <button class="button is-small is-info edit-btn" data-id="${client.id}">Modifier</button>
        <button class="button is-small is-danger delete-btn" data-id="${client.id}">Supprimer</button>
      </td>
    `
    clientsTableBody.appendChild(tr)
  })

  // modifier
  document.querySelectorAll('.edit-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id
      const client = clients.find(clientItem => clientItem.id.toLowerCase() === id.toLowerCase())
      if(client){
        clientIdInput.value = client.id
        fields.nom.value = client.nom
        fields.prenom.value = client.prenom
        fields.telephone.value = client.telephone
        fields.email.value = client.email
        fields.adresse.value = client.adresse
        document.getElementById('submit-btn').textContent = 'Modifier le client'
      }
    })
  })

  // supprimer
  document.querySelectorAll('.delete-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(confirm('Voulez-vous vraiment supprimer ce client ?')){
        const id = btn.dataset.id
        try{
          const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
          const data = await res.json()
          if(data.success) fetchClients()
          else alert('Erreur suppression')
        }catch(err){ console.error(err) }
      }
    })
  })
}

// soumettre formulaire
form.addEventListener('submit', async (e)=>{
  e.preventDefault()
  Object.keys(fields).forEach(validateField)
  const hasError = Object.values(errors).some(el => el.style.display==='block')
  if(hasError) return

  const data = {
    nom: fields.nom.value.trim(),
    prenom: fields.prenom.value.trim(),
    telephone: fields.telephone.value.trim(),
    email: fields.email.value.trim(),
    adresse: fields.adresse.value.trim()
  }
  // ex. placeholder : appeler votre fonction existante pour POST
  // submitClient(data)
  console.log('Données validées :', data)
})
// ...existing code...