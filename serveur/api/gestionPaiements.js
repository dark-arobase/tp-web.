const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { db } = require('../db');

// GET payments by loan
router.get('/api/paiements/:loan_id', async (req, res) => {
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
router.post('/api/paiements', async (req, res) => {
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

// DELETE a payment by id
router.delete('/api/paiements/:payment_id', async (req, res) => {
    try {
        const { payment_id } = req.params;
        const paiement = await db('paiements').where({ id: payment_id }).first();
        if (!paiement) return res.status(404).json({ error: 'Paiement introuvable.' });

        // remove the payment
        await db('paiements').where({ id: payment_id }).del();

        // update the loan solde (add the montant back)
        const loan = await db('loans').where({ id: paiement.loan_id }).first();
        if (loan) {
            const montant = Number(paiement.montant) || 0;
            const nouveauSolde = Number(loan.solde) + montant;
            const nouveauStatut = nouveauSolde <= 0 ? "REMBOURSÉ" : "ACTIF";

            await db('loans').where({ id: paiement.loan_id }).update({
                solde: nouveauSolde,
                statut: nouveauStatut
            });
        }

        res.status(200).json({ message: 'Paiement supprimé' });
    } catch (err) {
        console.error('Erreur DELETE /paiements/:payment_id', err);
        res.status(500).json({ error: 'Erreur serveur..' });
    }
});

module.exports = router;
