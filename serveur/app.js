const express = require('express')
const path = require('path')


const {db, createTable} = require('./db')


// import des routes
const clientsRoutes = require('./api/gestionClients.js')

const loansRoutes = require('./api/gestionLoans.js')

const paiementsRoutes = require('./api/gestionPaiements');


const app = express()

app.use(express.json())

app.use(express.static(path.join(__dirname, '../public')))

app.get('/', (req, res)=>{
  res.sendFile(path.join(__dirname, "../public", "index.html"));
})


app.use('/', clientsRoutes);

app.use('/', loansRoutes);

app.use('/', paiementsRoutes);

//app.use('/',

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
