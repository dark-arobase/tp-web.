const express = require('express')
const path = require('path')
const crypto = require('crypto')

const {db, createTable} = require('./db')

const app = express()

app.use(express.json())

/*app.use((req, res, next)=>{
   console.log(req.method, req.url);
   next();
});*/


app.use(express.static(path.join(__dirname, '../public')))

app.get('/', (req, res)=>{

  res.sendFile(path.join(__dirname, "../public", "index.html"));

})

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
