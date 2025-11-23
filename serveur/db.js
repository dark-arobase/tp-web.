const knex = require('knex');

const db = knex({
    client: 'sqlite3',
    connection: { 
       filename: "./basededonnees.sqlite3",
    },
    useNullAsDefault: true

});

/// Créer la table si elle n'existe pas a voir pour plus tard lol

async function createTable(){
    const hasClients = await db.schema.hasTable("clients");
    if(!hasClients){
       await db.schema.createTable("clients", (table)=>{
             table.string("id").primary();
             table.string("nom").notNullable();
             table.string("prenom").notNullable();
             table.string("telephone").notNullable();
             table.string("email").notNullable();
             table.string("adresse").notNullable();
             table.timestamp("creer_depuis").defaultTo(db.fn.now());
       });
       console.log("Table 'clients' creee..");

    }

    // yoooo





}

module.exports = {db, createTable};