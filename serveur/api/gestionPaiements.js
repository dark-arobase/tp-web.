const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

/* =====================================================================================
    GET — Paiements d'un prêt spécifique
===================================================================================== */
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

/* =====================================================================================
    GET — Tous les paiements
===================================================================================== */
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

// Helper arrondi
function round2(n) {
    return Math.round(n * 100) / 100;
}

// Helper calcul date limite (date de prêt + durée en mois)
function calculateDueDate(startDate, dureeMois) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + parseInt(dureeMois));
    return d;
}

// Helper calcul statut selon règle: solde=0 → REMBOURSÉ, solde>0 et date dépassée → EN RETARD, sinon ACTIF
function calculateStatus(solde, dueDate) {
    if (solde <= 0) return "REMBOURSÉ";
    const today = new Date();
        if (!(dueDate instanceof Date)) dueDate = new Date(dueDate);
        const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const nowDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return dueDay.getTime() < nowDay.getTime() ? "EN RETARD" : "ACTIF";
}

/* =====================================================================================
    POST — Ajouter un paiement
===================================================================================== */

router.post("/addPaiement", async (req, res) => {
    try {
        const { loan_id, montant, date, mode, note } = req.body;

        if (!loan_id || !montant || !date || !mode)
            return res.status(400).json({ error: "Champs manquants." });

        const loan = await db("loans").where({ id: loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        // On ne prend en compte que les paiements déjà effectués jusqu'à aujourd'hui
        const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
        const paiements = await db("paiements")
            .where({ loan_id })
            .andWhere("date", "<=", today); // Paiements passés ou aujourd'hui

        const totalPayes = paiements.reduce((sum, p) => sum + parseFloat(p.montant), 0);

        // Vérifier que le paiement ne dépasse pas le solde restant actuel
            const totalDu = round2(Number(loan.montant) + Number(loan.interets));
            if (round2(totalPayes + parseFloat(montant)) > totalDu) {
                return res.status(400).json({ error: "Le montant dépasse le total dû pour ce prêt !" });
        }

        // Insérer le paiement
        await db("paiements").insert({
            id: crypto.randomUUID(),
            loan_id,
            montant,
            date,
            mode,
            note
        });

        // Recalcul du solde et du statut en fonction des paiements passés ou aujourd'hui
        const paiementsMaj = await db("paiements")
            .where({ loan_id })
            .andWhere("date", "<=", today);
        const totalMaj = paiementsMaj.reduce((sum, p) => sum + parseFloat(p.montant), 0);

            const nouveauSolde = round2(totalDu - totalMaj);
        const dueDate = calculateDueDate(loan.date, loan.duree);
        const nouveauStatut = calculateStatus(nouveauSolde, dueDate);

        await db("loans")
            .where({ id: loan_id })
            .update({ solde: nouveauSolde, statut: nouveauStatut });

        res.status(201).json({ message: "Paiement ajouté", nouveauSolde, nouveauStatut });

    } catch (err) {
        console.error("Erreur POST /addPaiement", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});
/* =====================================================================================
    PUT — Modifier un paiement
===================================================================================== */
router.put("/editPaiement/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { montant, date, mode, note } = req.body;

        const oldPay = await db("paiements").where({ id }).first();
        if (!oldPay) return res.status(404).json({ error: "Paiement introuvable." });

        const loan_id = oldPay.loan_id;
        const loan = await db("loans").where({ id: loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        // Total dû (principal + intérêts)
        const totalDu = round2(Number(loan.montant) + Number(loan.interets));

        const paiements = await db("paiements").where({ loan_id });
        const totalPayesSansAncien = paiements.reduce((sum, p) => sum + parseFloat(p.montant), 0) - parseFloat(oldPay.montant);

        // Empêcher dépassement du total dû
        if (round2(totalPayesSansAncien + parseFloat(montant)) > totalDu) {
            return res.status(400).json({ error: "Le montant dépasse le total dû !" });
        }

        await db("paiements").where({ id }).update({ montant, date, mode, note });

        // Recalculer à partir de tous les paiements
        const paiementsMaj = await db("paiements").where({ loan_id });
        const totalMaj = paiementsMaj.reduce((sum, p) => sum + parseFloat(p.montant), 0);

        const nouveauSolde = round2(totalDu - totalMaj);
        const dueDate = calculateDueDate(loan.date, loan.duree);
        const nouveauStatut = calculateStatus(nouveauSolde, dueDate);

        await db("loans").where({ id: loan_id }).update({ solde: nouveauSolde, statut: nouveauStatut });

        res.json({ message: "Paiement modifié", nouveauSolde, nouveauStatut });

    } catch (err) {
        console.error("Erreur PUT /editPaiement/:id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

/* =====================================================================================
    DELETE — Supprimer un paiement
===================================================================================== */
router.delete("/deletePaiement/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const pay = await db("paiements").where({ id }).first();
        if (!pay) return res.status(404).json({ error: "Paiement introuvable." });

        const loan = await db("loans").where({ id: pay.loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        // Total dû (principal + intérêts)
        const totalDu = round2(Number(loan.montant) + Number(loan.interets));

        await db("paiements").where({ id }).del();

        const paiements = await db("paiements").where({ loan_id: loan.id });
        const totalPayes = paiements.reduce((sum, p) => sum + parseFloat(p.montant), 0);

        const nouveauSolde = round2(totalDu - totalPayes);
        const dueDate = calculateDueDate(loan.date, loan.duree);
        const nouveauStatut = calculateStatus(nouveauSolde, dueDate);

        await db("loans")
            .where({ id: loan.id })
            .update({ solde: nouveauSolde, statut: nouveauStatut });

        res.json({ success: true, nouveauSolde, nouveauStatut });

    } catch (err) {
        console.error("Erreur DELETE /deletePaiement/:id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

module.exports = router;
