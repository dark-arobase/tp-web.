const express = require("express");

const router = express.Router();

const { db } = require("../db");

/* =========================
   ROUTE : AJOUT CLIENT
   ========================= */
router.post('/addClient', async (req, res) => {
    try {
        const { nom, prenom, telephone, email, adresse } = req.body;

        if (!nom) {
            return res.status(400).json({ success: false, error: "Le champ 'nom' est obligatoire." });
        }
        if (!prenom) {
            return res.status(400).json({ success: false, error: "Le champ 'prenom' est obligatoire." });
        }
        if (!telephone || !/^\+?\d{10}$/.test(telephone)) {
            return res.status(400).json({ success: false, error: "Le champ 'telephone' est obligatoire et doit être valide." });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: "Le champ 'email' est obligatoire et doit être valide." });
        }
        if (!adresse ) {
            return res.status(400).json({ success: false, error: "Le champ 'adresse' est obligatoire." });
        }
        /* revoir pour la validation plus tard */
        const clients = {
            id: crypto.randomUUID(),
            nom : nom,
            prenom : prenom,
            telephone : telephone,
            email : email,
            adresse : adresse
        };
        await db('clients').insert(clients);
        res.status(201).json(clients);
    } catch (err) {
        console.error("Erreur /addClient", err);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

router.get('/allClients', async (req, res)=>{
    try{
        const clients = await db('clients').select('*').orderBy('creer_depuis', 'desc');
        res.status(200).json(clients);
    }catch(err){
        console.error("Erreur /allClients", err);
        res.status(500).json({error: "Erreur serveur.." });
    }
});

/* =========================
     ROUTE : MODIFIER CLIENT
     ========================= */
router.put('/editClient/:id', async (req, res) => {
    try {
        const {id} = req.params;
        console.log('PUT /editClient', { id, body: req.body });
        const { nom, prenom, telephone, email, adresse } = req.body;

        const clientToUpdate = {};

        if (!nom) {
            return res.status(400).json({ success: false, error: "Le champ 'nom' est obligatoire." });
        }
        if (!prenom) {
            return res.status(400).json({ success: false, error: "Le champ 'prenom' est obligatoire." });
        }
        if (!telephone || !/^\+?\d{10}$/.test(telephone)) {
            return res.status(400).json({ success: false, error: "Le champ 'telephone' est obligatoire et doit être valide." });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: "Le champ 'email' est obligatoire et doit être valide." });
        }
        if (!adresse ) {
            return res.status(400).json({ success: false, error: "Le champ 'adresse' est obligatoire." });
        }
      clientToUpdate.nom = nom;

      clientToUpdate.prenom = prenom;
      
      clientToUpdate.telephone = telephone;
      
      clientToUpdate.email = email;
      
      clientToUpdate.adresse = adresse;

    const  updated = await db("clients").where({id}).update(clientToUpdate);
    if (updated == 0) {
     return res.status(404).json({error: "Client introuvable.."})
    }
    // Return the updated client
    const updatedClient = await db('clients').where({id}).first();
    res.status(200).json(updatedClient);


   }catch(err){
      console.error("Erreur /editClient", err);
      res.status(500).json({error: "Erreur serveur.." })

     }
      

});
/* =========================
     ROUTE : SUPPRIMER CLIENT
     ========================= */
router.delete('/deleteClient/:id', async (req, res) => {
     try{

      const {id} = req.params;
     console.log('DELETE /deleteClient', { id });
      const deleted = await db("clients").where({id}).del();
      
      if (deleted ==0){
      return res.status(404).json({error: "Client introuvable.."})
     }
    res.status(200).json({message: "Client supprime...", id});
    
     }catch(err){
      console.error("Erreur /deleteClient", err);
      res.status(500).json({error: "Erreur serveur.." })

     }

});

module.exports = router;