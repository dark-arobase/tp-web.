const express = require('express');
const router = express.Router();

const { db } = require('../db');

// GET payments by loan
router.get('/paiements/:loan_id', async (req, res) => {
    try {
        const { loan_id } = req.params;
        const payments = await db('paiements')
            .where({ loan_id })
            .orderBy('creer_depuis', 'desc');

        res.status(200).json(payments);
    } catch (err) {
        console.error("Erreur GET /paiements/:loan_id", err);
        res.status(500).json({ error: "Erreur serveur.." });
    }
});

// POST create a payment
router.post('/paiements', async (req, res) => {
    try {
        const { loan_id, montant, date, mode, note } = req.body;

        if (!loan_id || !montant || !date || !mode)
            return res.status(400).json({ error: "Champs manquants." });

        const id = crypto.randomUUID();
        await db('paiements').insert({ id, loan_id, montant, date, mode, note });
        // === UPDATE LOAN SOLDE ===
        const loan = await db('loans').where({ id: loan_id }).first();

        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        const nouveauSolde = loan.solde - montant;
        const nouveauStatut = nouveauSolde <= 0 ? "REMBOURSÉ" : "ACTIF";

        await db('loans')
            .where({ id: loan_id })
            .update({
                solde: nouveauSolde,
                statut: nouveauStatut
            });

        res.status(201).json({
            message: "Paiement ajouté",
            paiement_id: id,
            nouveauSolde,
            nouveauStatut
        });

    } catch (err) {
        console.error("Erreur POST /payments", err);
        res.status(500).json({ error: "Erreur serveur.." });
    }
});

module.exports = router;
