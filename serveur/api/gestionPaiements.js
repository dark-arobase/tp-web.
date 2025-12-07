const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

// Helpers
function calculateDueDate(startDate, dureeMois) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + parseInt(dureeMois));
    return d;
}

function determineStatus(totalDu, totalAvantEcheance, totalApresPaiements, dueDateObj, lastPaymentDate = null) {

    const dueDay = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());
    const today = new Date();
    const nowDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (Number(totalApresPaiements) >= Number(totalDu)) {
        if (lastPaymentDate) {
            const lp = new Date(lastPaymentDate);
            const lpDay = new Date(lp.getFullYear(), lp.getMonth(), lp.getDate());
            return lpDay.getTime() > dueDay.getTime() ? "EN RETARD" : "REMBOURSÉ";
        }
        return Number(totalAvantEcheance) >= Number(totalDu) ? "REMBOURSÉ" : "EN RETARD";
    }

    return nowDay.getTime() > dueDay.getTime() ? "EN RETARD" : "ACTIF";
}

// ----------------------------------------------------------
// GET paiements d’un prêt
// ----------------------------------------------------------
router.get("/paiements/:loan_id", async (req, res) => {
    try {
        const paiements = await db("paiements")
            .where({ loan_id: req.params.loan_id })
            .orderBy("date", "desc");

        res.json(paiements);

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ----------------------------------------------------------
// POST : ajouter un paiement
// ----------------------------------------------------------
router.post("/addPaiement", async (req, res) => {
    try {
        const { loan_id, montant, date, mode, note } = req.body;

        if (!loan_id || !montant || !date || !mode)
            return res.status(400).json({ error: "Champs manquants" });

        const loan = await db("loans").where({ id: loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable" });

        const totalDu = Number(loan.montant) + Number(loan.interets);

        // Paiements existants
        const paiements = await db("paiements").where({ loan_id });
        const totalApres = paiements.reduce((s, p) => s + Number(p.montant), 0);

        if (totalApres + Number(montant) > totalDu)
            return res.status(400).json({ error: "Paiement dépasse le total dû" });

        // Ajout
        await db("paiements").insert({
            id: crypto.randomUUID(),
            loan_id,
            montant,
            date,
            mode,
            note
        });

        // Recalcul
        const paiementsUpdated = await db("paiements").where({ loan_id });

        const totalApresPaiements = paiementsUpdated.reduce((s, p) => s + Number(p.montant), 0);
        const dueDate = calculateDueDate(loan.date, loan.duree);

        const totalAvant = paiementsUpdated
            .filter(p => p.date <= dueDate.toISOString().split("T")[0])
            .reduce((s, p) => s + Number(p.montant), 0);

        // dernier paiement
        const lastPayment = paiementsUpdated.length ? paiementsUpdated.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b)) : null;
        const lastPaymentDate = lastPayment ? lastPayment.date : null;

        const statut = determineStatus(totalDu, totalAvant, totalApresPaiements, dueDate, lastPaymentDate);

        const solde = Number((totalDu - totalApresPaiements).toFixed(2));

        await db("loans").where({ id: loan_id }).update({ solde, statut });

        res.json({ success: true, solde, statut });

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ----------------------------------------------------------
// PUT : modifier un paiement
// ----------------------------------------------------------
router.put("/editPaiement/:id", async (req, res) => {
    try {
        const { montant, date, mode, note } = req.body;
        const id = req.params.id;

        const oldPay = await db("paiements").where({ id }).first();
        if (!oldPay) return res.status(404).json({ error: "Paiement introuvable" });

        const loan = await db("loans").where({ id: oldPay.loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable" });

        const totalDu = Number(loan.montant) + Number(loan.interets);

        const paiements = await db("paiements").where({ loan_id: loan.id });

        const totalSansAncien = paiements.reduce((s, p) => s + Number(p.montant), 0) - Number(oldPay.montant);

        if (totalSansAncien + Number(montant) > totalDu)
            return res.status(400).json({ error: "Paiement dépasse total dû" });

        await db("paiements").where({ id }).update({ montant, date, mode, note });

        const paiementsUpdated = await db("paiements").where({ loan_id: loan.id });

        const totalApres = paiementsUpdated.reduce((s, p) => s + Number(p.montant), 0);

        const dueDate = calculateDueDate(loan.date, loan.duree);

        const totalAvant = paiementsUpdated
            .filter(p => p.date <= dueDate.toISOString().split("T")[0])
            .reduce((s, p) => s + Number(p.montant), 0);

        const lastPayment = paiementsUpdated.length ? paiementsUpdated.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b)) : null;
        const lastPaymentDate = lastPayment ? lastPayment.date : null;

        const statut = determineStatus(totalDu, totalAvant, totalApres, dueDate, lastPaymentDate);
        const solde = Number((totalDu - totalApres).toFixed(2));

        await db("loans").where({ id: loan.id }).update({ solde, statut });

        res.json({ success: true, solde, statut });

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ----------------------------------------------------------
// DELETE : supprimer un paiement
// ----------------------------------------------------------
router.delete("/deletePaiement/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const pay = await db("paiements").where({ id }).first();
        if (!pay) return res.status(404).json({ error: "Paiement introuvable" });

        const loan = await db("loans").where({ id: pay.loan_id }).first();

        await db("paiements").where({ id }).del();

        const paiementsUpdated = await db("paiements").where({ loan_id: loan.id });

        const totalDu = Number(loan.montant) + Number(loan.interets);
        const totalApres = paiementsUpdated.reduce((s, p) => s + Number(p.montant), 0);

        const dueDate = calculateDueDate(loan.date, loan.duree);

        const totalAvant = paiementsUpdated
            .filter(p => p.date <= dueDate.toISOString().split("T")[0])
            .reduce((s, p) => s + Number(p.montant), 0);

        const lastPayment = paiementsUpdated.length ? paiementsUpdated.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b)) : null;
        const lastPaymentDate = lastPayment ? lastPayment.date : null;

        const statut = determineStatus(totalDu, totalAvant, totalApres, dueDate, lastPaymentDate);
        const solde = Number((totalDu - totalApres).toFixed(2));

        await db("loans").where({ id: loan.id }).update({ solde, statut });

        res.json({ success: true, solde, statut });

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
