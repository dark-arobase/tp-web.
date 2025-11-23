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

function showError(fieldName, message){
  errors[fieldName].textContent = message
  errors[fieldName].style.display = message ? 'block' : 'none'
  fields[fieldName].classList.toggle('is-danger', !!message)
}

function validateName(value){
  return /^[A-Za-zÀ-ÖØ-öø-ÿ '\-]{2,50}$/.test(value.trim())
}
function validatePhone(value){
  return /^\+?[0-9\s\-]{7,20}$/.test(value.trim())
}
function validateAddress(value){
  return value.trim().length > 0 && value.trim().length <= 200
}

function validateField(name){
  const v = fields[name].value || ''
  switch(name){
    case 'nom':
    case 'prenom':
      if(!validateName(v)) showError(name, 'Nom/prénom invalide (lettres, espaces, - et \')')
      else showError(name, '')
      break
    case 'telephone':
      if(!validatePhone(v)) showError(name, 'Téléphone invalide (ex: +33123456789)')
      else showError(name, '')
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

Object.keys(fields).forEach(name=>{
  fields[name].addEventListener('input', ()=> validateField(name))
  fields[name].addEventListener('blur', ()=> validateField(name))
})

form.addEventListener('submit', (e)=>{
  e.preventDefault()
  // validation complète
  Object.keys(fields).forEach(validateField)
  const hasError = Object.values(errors).some(el => el.style.display === 'block')
  if(hasError) return
  // ici : envoyer les données au serveur (fetch / AJAX)
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