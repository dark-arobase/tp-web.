const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

// =====================================================
//  GET : Lister tous les prêts
// =====================================================
router.get("/allLoans", async (req, res) => {
    try {
        const loans = await db("loans")
            .leftJoin("clients", "loans.client_id", "clients.id")
            .select(
                "loans.*",
                "clients.nom as client_nom",
                "clients.prenom as client_prenom"
            )
            .orderBy("loans.creer_depuis", "desc");

        res.json(loans);
    } catch (err) {
        console.error("Erreur GET /allLoans", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// =====================================================
//  POST : Ajouter un prêt
// =====================================================
router.post("/addLoan", async (req, res) => {
    try {
        const { client_id, montant, taux, duree, date } = req.body;

        // VALIDATION
        if (!client_id) return res.status(400).json({ error: "client_id requis" });
        if (!montant) return res.status(400).json({ error: "montant requis" });
        if (!taux) return res.status(400).json({ error: "taux requis" });
        if (!duree) return res.status(400).json({ error: "duree requise" });
        if (!date) return res.status(400).json({ error: "date requise" });

        // CALCUL
        const interets = (montant * (taux / 100) * (duree / 12)).toFixed(2);
        const solde = (Number(montant) + Number(interets)).toFixed(2);

        // Statut initial
        const statut = "ACTIF";

        const loan = {
            id: crypto.randomUUID(),
            client_id,
            montant,
            taux,
            duree,
            date,
            interets,
            solde,
            statut
        };

        await db("loans").insert(loan);

        res.status(201).json(loan);

    } catch (err) {
        console.error("Erreur POST /addLoan", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// =====================================================
//  PUT : Modifier un prêt
// =====================================================
router.put("/editLoan/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { montant, taux, duree, date } = req.body;

        const updated = await db("loans").where({ id }).update({
            montant,
            taux,
            duree,
            date
        });

        if (updated === 0)
            return res.status(404).json({ error: "Prêt introuvable." });

        const loan = await db("loans").where({ id }).first();
        res.json(loan);

    } catch (err) {
        console.error("Erreur PUT /editLoan/:id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// =====================================================
//  DELETE : Supprimer un prêt
// =====================================================
router.delete("/deleteLoan/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await db("loans").where({ id }).del();

        if (deleted === 0)
            return res.status(404).json({ error: "Prêt introuvable." });

        res.json({ success: true, id });

    } catch (err) {
        console.error("Erreur DELETE /deleteLoan/:id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

module.exports = router;
