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




app.post('/addProduct', async (req, res)=>{
   
   try{
    const {name, price, image} = req.body;
   
     if(!name){
        return res.status(400).json({error: "Champ 'name' obligatoire.."})
     }
     const numPrice = Number(price);
     if(numPrice < 0){
        return res.status(400).json({error: "Le champ 'price' doit etre un nombre >=0"})
     }

     const product = {
        id: crypto.randomUUID(),
        name: name,
        price: numPrice,
        image: String(image || "https://picsum.photos/400/280?random=" + Math.floor(Math.random()* 1000))
     }

     // je dois enregistrer ce produit dans la bd.. mais on va pour le moment l enregistrer dans un tableau..
   //  products.push(product)
      await db("products").insert(product);
     res.status(201).json(product)

     }catch(err){
      console.error("Erreur /addProduct", err);
      res.status(500).json({error: "Erreur serveur.." })

     }
      
});

app.get('/allProducts', async (req, res)=>{
   try{

       const products = await db("products").select("*").orderBy("created_at", "desc");
       res.status(200).json(products)
   }catch(err){
       console.error("Erreur /allProducts", err);
      res.status(500).json({error: "Erreur serveur.." })
   }
   
});