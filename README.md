# BES Loan - TP Web App

Application interne pour microcrédit (Node.js + Express + SQLite/Knex, UI Bulma).

## Fonctionnalités
- Clients: CRUD basique, listing avec nombre de prêts.
- Prêts: création, modification, calculs automatiques (payé, intérêts, solde, statut).
- Paiements: enregistrement et rafraîchissement dynamique.
- Dashboard: KPIs, clients en retard, pastille rouge.

## Démarrage rapide
1. Installer les dépendances
2. Exécuter les migrations et seeds
3. Lancer le serveur

### Pré-requis
- Node.js 18+

### Installation
```bash
npm install
```

### Base de données
```bash
npm run migrate
npm run seed
```

Un fichier `data.sqlite` est créé à la racine du projet.

### Lancer
```bash
npm start
```

Ouvrir http://localhost:3000

## Structure
- `src/server.js` serveur Express et routes API
- `src/db/knex.js` configuration Knex (SQLite)
- `migrations/` schéma BD
- `seeds/` données de test
- `public/` UI Bulma (SPA simple)

## Notes
- Le calcul d'intérêts est simplifié (intérêt simple mensuel). Vous pouvez l'ajuster selon les exigences.
- Suppression de client restreinte s'il a des prêts (clé étrangère RESTRICT).

## Pour le document Word
Inclure:
- Étapes d'installation (captures: terminal npm install, migration, seed)
- Lancement du serveur (capture: console et page d'accueil)
- Clients: ajout, liste, suppression (captures)
- Prêts: création, liste, filtre, statut (captures)
- Paiements: ajout et rafraîchissement (captures)
- Dashboard: KPIs, pastille retard, bouton "Mettre à jour"
