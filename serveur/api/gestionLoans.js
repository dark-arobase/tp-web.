const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

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
        if (!client_id) 
            return res.status(400).json({ error: "client_id requis" });
        if (!montant) 
            return res.status(400).json({ error: "montant requis" });
        if (!taux) 
            return res.status(400).json({ error: "taux requis" });
        if (!duree) 
            return res.status(400).json({ error: "duree requise" });
        if (!date) 
            return res.status(400).json({ error: "date requise" });

        // CALCUL (arrondir à 2 décimales)
        const interets = Number((Number(montant) * (Number(taux) / 100) * (Number(duree) / 12)).toFixed(2));
        const solde = Number((Number(montant) + interets).toFixed(2));

        // Calculer date limite et statut initial
        const dueDate = calculateDueDate(date, duree);
        const statut = calculateStatus(solde, dueDate);

        const loan = {
            id: crypto.randomUUID(),
            client_id,
            montant: Number(Number(montant).toFixed(2)),
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
        console.log("ID à modifier :", id);
        const { montant, taux, duree, date } = req.body;

        // Récupérer le prêt actuel pour conserver le solde
        const oldLoan = await db("loans").where({ id }).first();
        if (!oldLoan)
            return res.status(404).json({ error: "Prêt introuvable." });

        // Recalculer les intérêts avec les nouvelles valeurs
        const interets = Number((Number(montant) * (Number(taux) / 100) * (Number(duree) / 12)).toFixed(2));

        // Calculer le nouveau montant total (montant + intérêts)
        const montantTotal = Number((Number(montant) + interets).toFixed(2));
        
        // Calculer le nouveau solde en gardant la même proportion de remboursement
        const ancienMontantTotal = Number(oldLoan.montant) + Number(oldLoan.interets);
        const proportionRemboursee = ancienMontantTotal > 0 
            ? (ancienMontantTotal - Number(oldLoan.solde)) / ancienMontantTotal 
            : 0;
        const nouveauSolde = Number((montantTotal * (1 - proportionRemboursee)).toFixed(2));

        // Déterminer le statut selon date limite
        const dueDate = calculateDueDate(date, duree);
        const statut = calculateStatus(nouveauSolde, dueDate);

        const updated = await db("loans").where({ id }).update({
            montant: Number(Number(montant).toFixed(2)),
            taux: Number(taux),
            duree: Number(duree),
            date,
            interets,
            solde: nouveauSolde,
            statut
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

        // Supprimer d'abord les paiements liés à ce prêt
        await db("paiements").where({ loan_id: id }).del();
        
        // Supprimer le prêt
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
