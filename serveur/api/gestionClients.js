const express = require("express");
const crypto = require('crypto');

const router = express.Router();

const { db } = require("../db");

/* =========================
   ROUTE : AJOUT CLIENT
   ========================= */
router.post('/addClient', async (req, res) => {
    try {
        const { nom, prenom, telephone, email, adresse } = req.body;

        if (!(nom)) {
            return res.status(400).json({ error: "Le champ 'nom' est obligatoire." });
        }
        if (!(prenom)) {
            return res.status(400).json({ error: "Le champ 'prenom' est obligatoire." });
        }
        if (!telephone ) {
            return res.status(400).json({ error: "Le champ 'telephone' est obligatoire." });
        }
        if (!/^\+?\d{10}$/.test(telephone)) {
            return res.status(400).json({ error: "Téléphone invalide (10 chiffres)." });
        }
        if (!(email)) {
            return res.status(400).json({ error: "Le champ 'email' est obligatoire." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Email invalide." });
        }
        if (!adresse ) {
            return res.status(400).json({ error: "Le champ 'adresse' est obligatoire." });
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
        // Récupérer tous les clients avec le nombre de prêts
        const clients = await db('clients')
            .leftJoin('loans', 'clients.id', 'loans.client_id')
            .select('clients.*')
            .count('loans.id as loan_count')
            .groupBy('clients.id')
            .orderBy('clients.creer_depuis', 'desc');
        
        res.status(200).json(clients);
    }catch(err){
        console.error("Erreur /allClients", err);
        res.status(500).json({error: "Erreur serveur.." });
    }
});

/* =========================
     ROUTE : MODIFIER CLIENT
     ========================= */
router.put('/updateClient/:id', async (req, res) => {
    try {
        const {id} = req.params;
        console.log('PUT /updateClient', { id, body: req.body });
        const { nom, prenom, telephone, email, adresse } = req.body;

        const clientToUpdate = {};

        if (!(nom)) {
            return res.status(400).json({ error: "Le champ 'nom' est obligatoire." });
        }
        if (!(prenom)) {
            return res.status(400).json({ error: "Le champ 'prenom' est obligatoire." });
        }
        if (!telephone ) {
            return res.status(400).json({ error: "Le champ 'telephone' est obligatoire." });
        }
        if (!/^\+?\d{10}$/.test(telephone)) {
            return res.status(400).json({ error: "Téléphone invalide (10 chiffres)." });
        }
        if (!(email)) {
            return res.status(400).json({ error: "Le champ 'email' est obligatoire." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Email invalide." });
        }
        if (!adresse ) {
            return res.status(400).json({ error: "Le champ 'adresse' est obligatoire." });
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
      console.error("Erreur /updateClient", err);
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
      
      // Supprimer d'abord les paiements liés aux prêts du client
      await db('paiements')
          .whereIn('loan_id', db('loans').select('id').where('client_id', id))
          .del();
      
      // Supprimer les prêts du client
      await db('loans').where('client_id', id).del();
      
      // Supprimer le client
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