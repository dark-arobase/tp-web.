let products = []

const listProducts = document.getElementById("products");
const formProduct = document.getElementById("productForm");
const idProduct   = document.getElementById("productId");    // Champ caché pour savoir si on modifie
const nameProduct = document.getElementById("name");
const priceProduct = document.getElementById("price");
const imageProduct = document.getElementById("image");
const submitBtn = document.getElementById("submitBtn");
const cancelEdit  = document.getElementById("cancelEdit");   // Bouton "Annuler modification"

const genererImage = () => "https://picsum.photos/400/280?random=" + Math.floor(Math.random()* 1000);

function affichageProduit (){
   
    listProducts.innerHTML ="";

  // Parcours du tableau et création d'une carte pour chaque produit
  products.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product-card";

    // Génération du HTML interne de la carte
    card.innerHTML = `
      <img src="${p.image || genererImage()}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p class="price">${p.price} $</p>
      <div class="actions">
        <button class="button is-small is-warning" data-action="edit" data-id="${p.id}">
          <span class="icon is-small"><i class="fa-solid fa-pen"></i></span>
          <span>Modifier</span>
        </button>
        <button class="button is-small is-danger" data-action="delete" data-id="${p.id}">
          <span class="icon is-small"><i class="fa-solid fa-trash"></i></span>
          <span>Supprimer</span>
        </button>
      </div>
    `;
    listProducts.appendChild(card);
  });
}

async function loadProducts() {
try {

    const res = await fetch("/allProducts");
    if(!res.ok){
          alert("Erreur lors de la recuperation des produits")
          return;
    }
    products = await res.json();

    affichageProduit();
    

}catch(err){
    console.error.apply(err)
    alert("Erreur lors de la recuperation des produits")
}
    
}

formProduct.addEventListener('submit', async(event) =>{
     event.preventDefault(); // Empeche au navigateur de se rafraichir
    const id    = idProduct.value.trim();      // Si présent → mode modification
    const name = nameProduct.value;
    const price = parseFloat(priceProduct.value);
    const image= imageProduct.value;

      // Validation basique
  if (!name || isNaN(price)) return;
    try {

      if(id){
        //put
         const res = await fetch(`/editProduct/${encodeURIComponent(id)}`,{
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({name, price, image}),
        });
        
        if(!res.ok){
          alert("Erreur lors de la modification du produit")
          return;  
        }
        await loadProducts();

     submitBtn.textContent = "Ajouter";
      cancelEdit.style.display = "none";
        formProduct.reset();
        nameProduct.focus();



      }
      else{

        const res = await fetch("/addProduct",{
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({name, price, image}),
        });
        
        if(!res.ok){
          alert("Erreur lors de l ajout du produit")
          return;  
        }
        await loadProducts();

        formProduct.reset();
        nameProduct.focus();

      }



    }catch(err){
    console.error.apply(err)
    alert("Erreur lors de l ajout/modification des produits")
}

})

/* ============================================================
   5. ANNULER UNE MODIFICATION EN COURS
   ============================================================ */
cancelEdit.addEventListener("click", () => {
  idProduct.value = "";
  formProduct.reset();
  submitBtn.textContent = "Ajouter";
  cancelEdit.style.display = "none";
  nameProduct.focus();
});

/* ============================================================
   6. GESTION DES BOUTONS “MODIFIER” ET “SUPPRIMER”
   (Utilise la délégation d’événements sur le conteneur parent)
   ============================================================ */
listProducts.addEventListener("click", async(e) => {
  // Vérifie si le clic vient d’un bouton (edit/delete)
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action; // "edit" ou "delete"
  const id     = btn.dataset.id;

  if (action === "delete") {
    
    // Supprime le produit correspondant
    try{
          const res = await fetch(`/deleteProduct/${encodeURIComponent(id)}`,{
           method: "DELETE",
          });
          
          if(!res.ok){
            alert("Erreur lors de la suppression du produit")
            return;
          }
          await loadProducts()

     }catch(err){
    console.error.apply(err)
    alert("Erreur lors de la suppression du produit")
}
   
  }

  if (action === "edit") {
    // Récupère le produit à modifier
    const p = products.find((x) => x.id === id);
    if (!p) return;

    // Pré-remplit le formulaire
    idProduct.value       = p.id;
    nameProduct.value     = p.name;
    priceProduct.value    = p.price;
    imageProduct.value    = p.image;

    // Passe le bouton en mode “Enregistrer”
    submitBtn.textContent = "Enregistrer";
    cancelEdit.style.display = "inline-flex";
    nameProduct.focus();
  }
});
loadProducts();




