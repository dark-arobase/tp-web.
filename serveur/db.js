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
    const hasLoans = await db.schema.hasTable("loans");
if (!hasLoans) {
    await db.schema.createTable("loans", (table) => {
        table.string("id").primary();
        table.string("client_id").notNullable();
        table.foreign("client_id").references("id").inTable("clients");
        table.float("montant").notNullable();  // Montant du prêt
        table.float("taux").notNullable();     // Taux d'intérêt annuel
        table.integer("duree").notNullable();  // Durée en mois
        table.string("date").notNullable();    // Date de début du prêt
        table.float("interets").defaultTo(0);  // Intérêts cumulés
        table.float("solde").defaultTo(0);     // Solde restant
        table.string("statut").defaultTo("ACTIF"); // ACTIF / REMBOURSÉ / EN RETARD

        table.timestamp("creer_depuis").defaultTo(db.fn.now());
    });

    console.log("Table 'loans' creee..");
}
    const hasPayments = await db.schema.hasTable("paiements");
if (!hasPayments) {
    await db.schema.createTable("paiements", (table) => {
        table.string("id").primary();
        table.string("loan_id").notNullable();
        table.foreign("loan_id").references("id").inTable("loans");
        table.float("montant").notNullable();
        table.string("date").notNullable();
        table.string("mode").notNullable();  // cash, virement, carte, etc.
        table.string("note");
        table.timestamp("creer_depuis").defaultTo(db.fn.now());
    });

    console.log("Table 'payments' creee..");
}



}

module.exports = {db, createTable};