const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

// =====================================================
// Helpers
// =====================================================

// arrondi
function round2(n) {
    return Math.round(n * 100) / 100;
}

// due date = date + durée en mois
function calculateDueDate(startDate, dureeMois) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + parseInt(dureeMois));
    return d;
}

// -------------------------------------------------------------------
// NOUVEAU : Calcul PRO du statut final
// -------------------------------------------------------------------
/*
    Règle métier appliquée pour le statut d'un prêt après paiement :
    - Calculer la date d'échéance = date_prêt + durée (mois)
    - Récupérer la date du dernier paiement (fourni dans la requête)
    - Si la date du dernier paiement > date d'échéance => statut = "EN RETARD"
        (PRIORITAIRE, même si le prêt est remboursé ensuite)
    - Sinon si solde > 0 => statut = "ACTIF"
    - Sinon solde == 0 => statut = "REMBOURSÉ"
    Cette fonction centralise la logique pour POST/PUT/DELETE paiements.
*/
async function calculateFinalStatus(loanId, solde, dueDate) {

    // récupérer dernier paiement
    const lastPayment = await db("paiements")
        .where({ loan_id: loanId })
        .orderBy("date", "desc")
        .first();

    // cas sans paiement (rare)
    if (!lastPayment) {
        return solde > 0 ? "ACTIF" : "REMBOURSÉ";
    }

    const lastPayDate = new Date(lastPayment.date);

    // si pas encore remboursé
    if (solde > 0) {
        return lastPayDate > dueDate ? "EN RETARD" : "ACTIF";
    }

    // si remboursé, vérifier si en retard — nous voulons conserver le statut EN RETARD
    // même si le prêt est payé intégralement après la date d'échéance
    return lastPayDate > dueDate ? "EN RETARD" : "REMBOURSÉ";
}

// =====================================================
//  GET — Paiements d'un prêt spécifique
// =====================================================
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

// =====================================================
//  GET — Tous les paiements
// =====================================================
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

// =====================================================
// POST — Ajouter un paiement
// =====================================================
router.post("/addPaiement", async (req, res) => {
    try {
        const { loan_id, montant, date, mode, note } = req.body;

        if (!loan_id || !montant || !date || !mode)
            return res.status(400).json({ error: "Champs manquants." });

        const loan = await db("loans").where({ id: loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        // total dû
        const totalDu = round2(Number(loan.montant) + Number(loan.interets));

        // anciens paiements
        const paiementsTout = await db("paiements").where({ loan_id });
        const totalPayes = paiementsTout.reduce((s, p) => s + parseFloat(p.montant), 0);

        // empêcher dépassement
        if (round2(totalPayes + parseFloat(montant)) > totalDu)
            return res.status(400).json({ error: "Montant dépasse le total dû !" });

        // insertion
        await db("paiements").insert({
            id: crypto.randomUUID(),
            loan_id,
            montant,
            date,
            mode,
            note
        });

        // recalcul
        const paiementsMaj = await db("paiements").where({ loan_id });
        const totalMaj = paiementsMaj.reduce((s, p) => s + parseFloat(p.montant), 0);
        const nouveauSolde = round2(totalDu - totalMaj);

        // calcul échéance & statut pro
        const dueDate = calculateDueDate(loan.date, loan.duree);
        const nouveauStatut = await calculateFinalStatus(loan_id, nouveauSolde, dueDate);

        await db("loans").where({ id: loan_id }).update({
            solde: nouveauSolde,
            statut: nouveauStatut
        });

        res.status(201).json({ message: "Paiement ajouté", nouveauSolde, nouveauStatut });

    } catch (err) {
        console.error("Erreur POST /addPaiement", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// =====================================================
// PUT — Modifier un paiement
// =====================================================
router.put("/editPaiement/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { montant, date, mode, note } = req.body;

        const old = await db("paiements").where({ id }).first();
        if (!old) return res.status(404).json({ error: "Paiement introuvable." });

        const loan = await db("loans").where({ id: old.loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable." });

        const totalDu = round2(Number(loan.montant) + Number(loan.interets));

        const pai = await db("paiements").where({ loan_id: loan.id });
        const totalSansAncien = pai.reduce((s, p) => s + parseFloat(p.montant), 0) - parseFloat(old.montant);

        if (round2(totalSansAncien + parseFloat(montant)) > totalDu)
            return res.status(400).json({ error: "Montant dépasse le total dû !" });

        // maj paiement
        await db("paiements").where({ id }).update({ montant, date, mode, note });

        const paiementsMaj = await db("paiements").where({ loan_id: loan.id });
        const totalMaj = paiementsMaj.reduce((s, p) => s + parseFloat(p.montant), 0);
        const nouveauSolde = round2(totalDu - totalMaj);

        const dueDate = calculateDueDate(loan.date, loan.duree);
        const nouveauStatut = await calculateFinalStatus(loan.id, nouveauSolde, dueDate);

        await db("loans").where({ id: loan.id }).update({
            solde: nouveauSolde,
            statut: nouveauStatut
        });

        res.json({ message: "Paiement modifié", nouveauSolde, nouveauStatut });

    } catch (err) {
        console.error("Erreur PUT /editPaiement/:id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

// =====================================================
// DELETE — Supprimer un paiement
// =====================================================
router.delete("/deletePaiement/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const pay = await db("paiements").where({ id }).first();
        if (!pay) return res.status(404).json({ error: "Paiement introuvable." });

        const loan = await db("loans").where({ id: pay.loan_id }).first();

        const totalDu = round2(Number(loan.montant) + Number(loan.interets));
        await db("paiements").where({ id }).del();

        const paiementsMaj = await db("paiements").where({ loan_id: loan.id });
        const totalPaye = paiementsMaj.reduce((s, p) => s + parseFloat(p.montant), 0);
        const nouveauSolde = round2(totalDu - totalPaye);

        const dueDate = calculateDueDate(loan.date, loan.duree);
        const nouveauStatut = await calculateFinalStatus(loan.id, nouveauSolde, dueDate);

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
