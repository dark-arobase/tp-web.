const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

router.post('/addUser', async (req, res)=>{
   
   try{

    const {username, password} = req.body;

    if (!username || !password){
        return res.status(400).json({ error: "Champs obligatoires" });
      }
    if(!username){
        return res.status(400).json({error: "Champ 'username' obligatoire.."})
     }

    if(!password){
        return res.status(400).json({error: "Champ 'password' obligatoire.."})
     }
     
     const existingUser = await db("User").where({ username }).first();

     if (existingUser) {
        return res.status(400).json({error: "Ce nom d'utilisateur est déjà utilisé."})
     }

     const User = {
        id: crypto.randomUUID(),
        username: username,
        password: password
     }

     await db("User").insert(User);     
     res.status(201).json(User)
    
     }catch(err){
      console.error("Erreur /addUser", err);
      res.status(500).json({error: "Erreur serveur.." })
     }    
});

router.get('/alluser', async (req, res)=>{
   try{
      const users = await db("User").select("*").orderBy("created_at", "desc");
      res.status(200).json(users)
   }catch(err){
      console.error("Erreur /alluser", err);
      res.status(500).json({error: "Erreur serveur.." })
   }
});



router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password){
            return res.status(400).json({ error: "Champs obligatoires" });
        }

        const user = await db("User").where({ username }).first();

        if (!user)
            return res.status(401).json({ error: "Utilisateur inconnu" });

        if (password !== user.password)
            return res.status(401).json({ error: "Mot de passe incorrect" });
        
        res.json({
            message: "Connexion réussie",
            id: user.id,
            username: user.username
        });

      } catch (err) {
         console.error("Erreur /login", err);
         res.status(500).json({ error: 'Erreur serveur' });
      }
});



module.exports = router;