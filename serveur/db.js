const knex = require('knex');

const db = knex({
    client: 'sqlite3',
    connection: { 
       filename: "./basededonnees.sqlite3",
    },
    useNullAsDefault: true
});


async function createTable() {

    const existsUser = await db.schema.hasTable("User");
    if (!existsUser) {
        await db.schema.createTable("User", (table) => {
            table.string("id").primary();
            table.string("username").notNullable();
            table.string("password").notNullable();
            table.timestamp("created_at").defaultTo(db.fn.now());
        });
        console.log("Table 'User' créée.");
    }

    const hasClients = await db.schema.hasTable("clients");
    if (!hasClients) {
        await db.schema.createTable("clients", (table) => {
            table.string("id").primary();
            table.string("nom").notNullable();
            table.string("prenom").notNullable();
            table.string("telephone").notNullable();
            table.string("email").notNullable();
            table.string("adresse").notNullable();
            table.timestamp("creer_depuis").defaultTo(db.fn.now());
        });
        console.log("Table 'clients' créée.");
    }

    const hasLoans = await db.schema.hasTable("loans");
    if (!hasLoans) {
        await db.schema.createTable("loans", (table) => {
            table.string("id").primary();

            table.string("client_id").notNullable();
            table.foreign("client_id")
                .references("id")
                .inTable("clients")
                .onDelete("CASCADE");

            table.float("montant").notNullable();
            table.float("taux").notNullable();
            table.integer("duree").notNullable();
            table.string("date").notNullable();

            table.float("interets").defaultTo(0);
            table.float("solde").defaultTo(0);
            table.string("statut").defaultTo("ACTIF");

            table.timestamp("creer_depuis").defaultTo(db.fn.now());
        });

        console.log("Table 'loans' créée.");
    }

    const hasPaiements = await db.schema.hasTable("paiements");
    if (!hasPaiements) {
        await db.schema.createTable("paiements", (table) => {
            table.string("id").primary();

            table.string("loan_id").notNullable();
            table.foreign("loan_id")
                .references("id")
                .inTable("loans")
                .onDelete("CASCADE");

            table.float("montant").notNullable();
            table.string("date").notNullable();
            table.string("mode").notNullable();
            table.string("note");

            table.timestamp("creer_depuis").defaultTo(db.fn.now());
        });

        console.log("Table 'paiements' créée.");
    }

}

module.exports = { db, createTable };
