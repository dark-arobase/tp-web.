const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

router.post('/addUser', async (req, res)=>{
   
   try{

    const {username, password} = req.body;

    if(!username){
        return res.status(400).json({error: "Champ 'username' obligatoire.."})
     }

    if(!password){
        return res.status(400).json({error: "Champ 'password' obligatoire.."})
     }

     const User = {
        id: crypto.randomUUID(),
        username: username,
        password: password
     }

     await db("User").insert(User);

     // create session for the new user (if sessions are available)
     if (req) {
       if (!req.session) req.session = {};
       req.session.userId = User.id;
       req.session.username = User.username;
     }

     // Always set cookies as a fallback so frontend can rely on them
     if (res && res.cookie) {
       const maxAge = 24 * 60 * 60 * 1000; // 1 day
       res.cookie('userid', User.id, { httpOnly: true, maxAge });
       res.cookie('username', User.username, { maxAge });
     }

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


// rendre information pis ping username et password comme teste pour 
// que les information soient correctes dans indentification.html

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password)
            return res.status(400).json({ error: "Champs obligatoires" });

        const user = await db("User").where({ username }).first();

        if (!user)
            return res.status(401).json({ error: "Utilisateur inconnu" });

        // Vérifier le mot de passe (comparaison directe car pas de hash pour l'instant)
        if (password !== user.password)
            return res.status(401).json({ error: "Mot de passe incorrect" });
        
        // store session info
        if (req) {
          if (!req.session) req.session = {};
          req.session.username = user.username;
          req.session.userId = user.id;
        }

        // also set cookies for the client (fallback)
        if (res && res.cookie) {
          const maxAge = 24 * 60 * 60 * 1000;
          res.cookie('userid', user.id, { httpOnly: true, maxAge });
          res.cookie('username', user.username, { maxAge });
        }

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

router.get('/me', (req, res) => {
  // prefer session, fall back to cookies
  if (req.session && req.session.userId) {
    return res.json({ id: req.session.userId, username: req.session.username });
  }
  if (req.cookies && req.cookies.userid) {
    return res.json({ id: req.cookies.userid, username: req.cookies.username });
  }
  res.status(401).json({ error: 'Non authentifié' });
});

router.get('/toutPosts', async (req, res) => {
  try {
    // Charger tous les posts
    const posts = await db("Post").orderBy("created_at", "desc");

    // Pour chaque post → chercher les commentaires
    for (let post of posts) {
      const comments = await db("Comments")
        .where("post_id", post.id)
        .select("username", "content", "created_at");

    }

    res.json(posts);

  } catch (err) {
    console.error("Erreur /toutPosts :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;