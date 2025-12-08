const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

/* ============================================================
    GET — Paiements d'un prêt spécifique
    Route : /paiements/:loan_id
============================================================ */
router.get("/paiements/:loan_id", async (req, res) => {
    try {
        const { loan_id } = req.params;

        const paiements = await db("paiements")
            .where({ loan_id })
            .orderBy("date", "desc");

        res.status(200).json(paiements);

    } catch (err) {
        console.error("Erreur GET /paiements/:loan_id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


/* ============================================================
    GET — Tous les paiements (clients + prêts)
    Route : /allPaiements
============================================================ */
router.get("/allPaiements", async (req, res) => {
    try {
        const paiements = await db("paiements as p")
            .leftJoin("loans as l", "p.loan_id", "l.id")
            .leftJoin("clients as c", "l.client_id", "c.id")
            .select(
                "p.*",
                "c.prenom",
                "c.nom",
                "l.solde as soldePret"
            )
            .orderBy("p.date", "desc");

        res.status(200).json(paiements);

    } catch (err) {
        console.error("Erreur GET /allPaiements", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


/* ============================================================
    POST — Ajouter un paiement
    Route : /addPaiement
============================================================ */
router.post("/addPaiement", async (req, res) => {
    try {
        const { loan_id, montant, date, mode, note } = req.body;

        if (!loan_id || !montant || !date || !mode)
            return res.status(400).json({ error: "Champs manquants." });

        await db("paiements").insert({
            id: crypto.randomUUID(),
            loan_id,
            montant,
            date,
            mode,
            note
        });

        // Mettre à jour solde
        const loan = await db("loans").where({ id: loan_id }).first();

        const nouveauSolde = parseFloat(loan.solde) - parseFloat(montant);
        const nouveauStatut = nouveauSolde <= 0 ? "REMBOURSÉ" : "ACTIF";

        await db("loans")
            .where({ id: loan_id })
            .update({ solde: nouveauSolde, statut: nouveauStatut });

        res.status(201).json({ message: "Paiement ajouté", nouveauSolde, nouveauStatut });

    } catch (err) {
        console.error("Erreur POST /addPaiement", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


/* ============================================================
    PUT — Modifier un paiement
    Route : /editPaiement/:id
============================================================ */
router.put("/editPaiement/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { montant, date, mode, note, loan_id } = req.body;

        // ancien paiement
        const oldPay = await db("paiements").where({ id }).first();
        if (!oldPay) return res.status(404).json({ error: "Paiement introuvable." });

        // prêt lié
        const loan = await db("loans").where({ id: loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        // Recalcul solde
        const soldeRecalcule =
            parseFloat(loan.solde) +
            parseFloat(oldPay.montant) -
            parseFloat(montant);

        const nouveauStatut = soldeRecalcule <= 0 ? "REMBOURSÉ" : "ACTIF";

        // update paiement
        await db("paiements")
            .where({ id })
            .update({ montant, date, mode, note });

        // update loan
        await db("loans")
            .where({ id: loan_id })
            .update({ solde: soldeRecalcule, statut: nouveauStatut });

        res.json({ message: "Paiement modifié", soldeRecalcule, nouveauStatut });

    } catch (err) {
        console.error("Erreur PUT /editPaiement/:id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});


/* ============================================================
    DELETE — Supprimer un paiement
    Route : /deletePaiement/:id
============================================================ */
router.delete("/deletePaiement/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const pay = await db("paiements").where({ id }).first();
        if (!pay) return res.status(404).json({ error: "Paiement introuvable." });

        const loan = await db("loans").where({ id: pay.loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        // Supprimer paiement
        await db("paiements").where({ id }).del();

        // Recalcul solde
        const nouveauSolde = (parseFloat(loan.solde) || 0) + (parseFloat(pay.montant) || 0);
        const nouveauStatut = nouveauSolde <= 0 ? "REMBOURSÉ" : "ACTIF";

        await db("loans")
            .where({ id: loan.id })
            .update({
                solde: nouveauSolde,
                statut: nouveauStatut
            });

        res.json({ success: true, nouveauSolde });

    } catch (err) {
        console.error("Erreur DELETE /deletePaiement/:id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

module.exports = router;