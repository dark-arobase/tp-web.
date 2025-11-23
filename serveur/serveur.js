const express = require('express');
const path = require('path');
const knexConfig = require('../knexfile').development;
const knex = require('knex')(knexConfig);

const clientsRoutes = require('./routes/clients')(knex);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// servir les fichiers frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// routes API
app.use('/api/clients', clientsRoutes);

app.listen(PORT, () => {
  console.log(`BES Loan Lite running at http://localhost:${PORT}`);
});
