const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

function calculateDueDate(startDate, dureeMois) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + parseInt(dureeMois));
    return d;
}

// Règle universelle des statuts
function determineStatus(totalDu, totalAvantEcheance, totalApresPaiements, dueDateObj, lastPaymentDate = null) {

    // normaliser jours
    const dueDay = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());
    const today = new Date();
    const nowDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Si remboursé
    if (Number(totalApresPaiements) >= Number(totalDu)) {
        // Si on connaît la date du dernier paiement, utiliser-la :
        // si le dernier paiement est après l'échéance => EN RETARD (prioritaire)
        if (lastPaymentDate) {
            const lp = new Date(lastPaymentDate);
            const lpDay = new Date(lp.getFullYear(), lp.getMonth(), lp.getDate());
            return lpDay.getTime() > dueDay.getTime() ? "EN RETARD" : "REMBOURSÉ";
        }

        // Sinon / fallback : si la somme payée avant échéance couvre le total => REMBOURSÉ
        return Number(totalAvantEcheance) >= Number(totalDu) ? "REMBOURSÉ" : "EN RETARD";
    }

    // Pas encore remboursé entièrement
    return nowDay.getTime() > dueDay.getTime() ? "EN RETARD" : "ACTIF";
}

function normalizeStatus(s) {
    if (!s || typeof s !== 'string') return s;
    if (s.includes('EN RETARD')) return 'EN RETARD';
    if (s.includes('REMBOURSÉ')) return 'REMBOURSÉ';
    if (s.includes('ACTIF')) return 'ACTIF';
    return s;
}

// -----------------------------------------------------
// GET : tous les prêts
// -----------------------------------------------------
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
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// -----------------------------------------------------
// POST : créer un prêt
// -----------------------------------------------------
router.post("/addLoan", async (req, res) => {
    try {
        const { client_id, montant, taux, duree, date } = req.body;

        if (!client_id || !montant || !taux || !duree || !date) {
            return res.status(400).json({ error: "Champs manquants" });
        }

        const m = Number(montant);
        const t = Number(taux) / 100;
        const d = Number(duree);

        const interets = Number((m * t * (d / 12)).toFixed(2));
        const totalDu = Number((m + interets).toFixed(2));

        const newLoan = {
            id: crypto.randomUUID(),
            client_id,
            montant: m,
            taux: Number(taux),
            duree: d,
            date,
            interets,
            solde: totalDu,
            statut: "ACTIF"
        };

        await db("loans").insert(newLoan);
        res.status(201).json(newLoan);

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// -----------------------------------------------------
// PUT : modifier un prêt
// -----------------------------------------------------
router.put("/editLoan/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { montant, taux, duree, date } = req.body;

        const oldLoan = await db("loans").where({ id }).first();
        if (!oldLoan) return res.status(404).json({ error: "Prêt introuvable" });

        const m = Number(montant);
        const t = Number(taux) / 100;
        const d = Number(duree);
        const interets = Number((m * t * (d / 12)).toFixed(2));
        const totalDu = Number((m + interets).toFixed(2));

        const paiements = await db("paiements").where({ loan_id: id });

        const totalApres = paiements.reduce((s, p) => s + Number(p.montant), 0);

        const dueDateObj = calculateDueDate(date, duree);

        const totalAvant = paiements
            .filter(p => p.date <= dueDateObj.toISOString().split("T")[0])
            .reduce((s, p) => s + Number(p.montant), 0);

        // récupérer la date du dernier paiement (s'il existe)
        const lastPayment = paiements.length ? paiements.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b)) : null;
        const lastPaymentDate = lastPayment ? lastPayment.date : null;

        let statut = determineStatus(totalDu, totalAvant, totalApres, dueDateObj, lastPaymentDate);

        const solde = Number((totalDu - totalApres).toFixed(2));

        statut = normalizeStatus(statut);

        await db("loans").where({ id }).update({
            montant: m,
            taux: Number(taux),
            duree: d,
            date,
            interets,
            solde,
            statut
        });

        const updated = await db("loans").where({ id }).first();
        res.json(updated);

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// -----------------------------------------------------
// DELETE : supprimer un prêt
// -----------------------------------------------------
router.delete("/deleteLoan/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await db("paiements").where({ loan_id: id }).del();
        await db("loans").where({ id }).del();

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
