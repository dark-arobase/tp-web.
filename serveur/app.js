const express = require('express')
const path = require('path')
const crypto = require('crypto')

const {db, createTable} = require('./db')

const app = express()

app.use(express.json())

app.use(express.static(path.join(__dirname, '../public')))

app.get('/', (req, res)=>{
  res.sendFile(path.join(__dirname, "../public", "index.html"));
})

/* =========================
   ROUTE : AJOUT CLIENT
   ========================= */
app.post('/api/clients', async (req, res) => {
    try {
        const { nom, prenom, telephone, email, adresse } = req.body;

        const id = crypto.randomUUID();

        await db('clients').insert({
            id, nom, prenom, telephone, email, adresse
        });

        res.json({ success: true, id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

/* =========================
   ROUTE : LISTE CLIENTS
   ========================= */
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await db('clients').select('*');
        res.json(clients);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

createTable()
.then(()=>{
   app.listen(3000, ()=>{
    console.log("Serveur en cours d'execution sur le port 3000")
});
})
.catch((err)=>{
   console.error("Erreur au demarrage du schema", err);
   process.exit(1);
})
