const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

// ===============================================
// FONCTIONS UTILES
// ===============================================

// arrondi 2 décimales
function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

// Date d’échéance = date du prêt + durée (mois)
function calculateDueDate(startDate, dureeMois) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + parseInt(dureeMois));
    // Normaliser à minuit (comparaisons journée seulement)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Nouveau statut (prend en compte : solde, date limite, dernier paiement)
function calculateStatus(solde, dueDate, lastPaymentDate = null) {
    if (Number(solde) <= 0) return "REMBOURSÉ";

    // normalisation jour
    const now = new Date();
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = dueDate instanceof Date ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : new Date(new Date(dueDate).getFullYear(), new Date(dueDate).getMonth(), new Date(dueDate).getDate());

    // Paiement en retard : last payment date (si existe) après l'échéance
    if (lastPaymentDate) {
        const lp = new Date(lastPaymentDate);
        const lpDay = new Date(lp.getFullYear(), lp.getMonth(), lp.getDate());
        if (lpDay.getTime() > due.getTime()) return "EN RETARD";
    }

    // Si échéance passée
    if (due.getTime() < nowDay.getTime()) return "EN RETARD";

    return "ACTIF";
}

// =====================================================
//  GET : Lister tous les prêts
// =====================================================
router.get("/allLoans", async (req, res) => {
    try {
        let loans = await db("loans")
            .leftJoin("clients", "loans.client_id", "clients.id")
            .select(
                "loans.*",
                "clients.nom as client_nom",
                "clients.prenom as client_prenom"
            )
            .orderBy("loans.creer_depuis", "desc");

        // On recalcul le statut AVANT d’envoyer au frontend
        for (let loan of loans) {

            const dueDate = calculateDueDate(loan.date, loan.duree);

            // Récupérer le dernier paiement
            const lastPayment = await db("paiements")
                .where("loan_id", loan.id)
                .orderBy("date", "desc")
                .first();

            const lastPaymentDate = lastPayment ? lastPayment.date : null;

            // Recalcul du statut
            loan.statut = calculateStatus(loan.solde, dueDate, lastPaymentDate);
        }

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

        if (!client_id || !montant || !taux || !duree || !date)
            return res.status(400).json({ error: "Certains champs sont vides." });

        // Intérêt et solde restants (arrondis à 2 décimales)
        const interets = round2(Number(montant) * (Number(taux) / 100) * (Number(duree) / 12));
        const solde = round2(Number(montant) + interets);

        const dueDate = calculateDueDate(date, duree);
        const statut = calculateStatus(solde, dueDate);

        const loan = {
            id: crypto.randomUUID(),
            client_id,
            montant: Number(montant),
            taux: Number(taux),
            duree: Number(duree),
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

        const oldLoan = await db("loans").where({ id }).first();
        if (!oldLoan)
            return res.status(404).json({ error: "Prêt introuvable." });

        // Recalcul des intérêts
        const interets = round2(Number(montant) * (Number(taux) / 100) * (Number(duree) / 12));
        const montantTotal = round2(Number(montant) + interets);

        const ancienMontantTotal = Number(oldLoan.montant) + Number(oldLoan.interets);

        // Proportion déjà remboursée
        const proportionPayee = ancienMontantTotal > 0
            ? (ancienMontantTotal - Number(oldLoan.solde)) / ancienMontantTotal
            : 0;

        const nouveauSolde = Number((montantTotal * (1 - proportionPayee)).toFixed(2));

        const dueDate = calculateDueDate(date, duree);

        // Dernier paiement pour recalcul
        const lastPayment = await db("paiements")
            .where("loan_id", id)
            .orderBy("date", "desc")
            .first();

        const lastPaymentDate = lastPayment ? lastPayment.date : null;

        const statut = calculateStatus(nouveauSolde, dueDate, lastPaymentDate);

        await db("loans")
            .where({ id })
            .update({
                montant,
                taux,
                duree,
                date,
                interets,
                solde: nouveauSolde,
                statut
            });

        const updatedLoan = await db("loans").where({ id }).first();
        res.json(updatedLoan);

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

        // Supprimer d’abord ses paiements
        await db("paiements").where({ loan_id: id }).del();

        const deleted = await db("loans").where({ id }).del();
        if (!deleted)
            return res.status(404).json({ error: "Prêt introuvable." });

        res.json({ success: true });

    } catch (err) {
        console.error("Erreur DELETE /deleteLoan/:id", err);
        res.status(500).json({ error: "Erreur serveur." });
    }
});

module.exports = router;
