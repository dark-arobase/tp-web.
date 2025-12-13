const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { db } = require("../db");

function calculateDueDate(startDate, dureeMois) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + Number(dureeMois));
    return d;
}

const round2 = n => Math.round(Number(n) * 100) / 100;

function determineStatus(totalDu, totalAvant, totalApres, dueDate, lastPaymentDate = null) {
    const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const today = new Date();
    const nowDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (totalApres >= totalDu) {
        if (lastPaymentDate) {
            const lp = new Date(lastPaymentDate);
            return lp > dueDay ? "EN RETARD" : "REMBOURSÉ";
        }
        return totalAvant >= totalDu ? "REMBOURSÉ" : "EN RETARD";
    }

    return nowDay > dueDay ? "EN RETARD" : "ACTIF";
}

function normalizeStatus(s) {
    if (!s) return s;
    if (s.includes("EN RETARD")) return "EN RETARD";
    if (s.includes("REMBOURSÉ")) return "REMBOURSÉ";
    if (s.includes("ACTIF")) return "ACTIF";
    return s;
}

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

router.get("/allLoans", async (req, res) => {
    try {
        const loans = await db("loans as l")
            .leftJoin("clients as c", "l.client_id", "c.id")
            .select(
                "l.*",
                "c.nom",
                "c.prenom",
                "c.telephone",
                "c.email"
            )
            .orderBy("l.creer_depuis", "desc");

        res.json(loans);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.post('/addLoan', async (req, res) => {
    try {
        const { client_id, montant, taux, duree, date } = req.body;

        if (!client_id || montant == null || taux == null || duree == null || !date)
            return res.status(400).json({ error: 'Champs manquants' });

        const client = await db('clients').where({ id: client_id }).first();
        if (!client) return res.status(404).json({ error: 'Client introuvable' });

        const montantNum = round2(montant);
        const tauxNum = Number(taux);
        const dureeNum = Number(duree);

        const interets = round2(montantNum * (tauxNum / 100) * (dureeNum / 12));
        const solde = round2(montantNum + interets);

        const newLoan = {
            id: crypto.randomUUID(),
            client_id,
            montant: montantNum,
            taux: tauxNum,
            duree: dureeNum,
            date,
            interets,
            solde,
            statut: solde <= 0 ? 'REMBOURSÉ' : 'ACTIF'
        };

        await db('loans').insert(newLoan);

        res.status(201).json(newLoan);

    } catch (err) {
        console.error('Erreur POST /addLoan', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.put('/editLoan/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { client_id, montant, taux, duree, date } = req.body;

        const loan = await db('loans').where({ id }).first();
        if (!loan) return res.status(404).json({ error: 'Prêt introuvable' });

        if (!client_id || montant == null || taux == null || duree == null || !date)
            return res.status(400).json({ error: 'Champs manquants' });

        const montantNum = round2(montant);
        const tauxNum = Number(taux);
        const dureeNum = Number(duree);

        const interets = round2(montantNum * (tauxNum / 100) * (dureeNum / 12));
        const solde = round2(montantNum + interets);

        await db('loans').where({ id }).update({ client_id, montant: montantNum, taux: tauxNum, duree: dureeNum, date, interets, solde, statut: solde <= 0 ? 'REMBOURSÉ' : 'ACTIF' });

        const updated = await db('loans').where({ id }).first();
        res.json(updated);

    } catch (err) {
        console.error('Erreur PUT /editLoan', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.delete('/deleteLoan/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const loan = await db('loans').where({ id }).first();
        if (!loan) return res.status(404).json({ error: 'Prêt introuvable' });

        await db('loans').where({ id }).del();
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur DELETE /deleteLoan', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get("/allPaiements", async (req, res) => {
    try {
        const paiements = await db("paiements").orderBy("date", "desc");
        res.json(paiements);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.post("/addPaiement", async (req, res) => {
    try {
        const { loan_id, montant, date, mode, note } = req.body;

        if (!loan_id || !montant || !date || !mode)
            return res.status(400).json({ error: "Champs manquants" });

        const montantNum = round2(montant);
        const loan = await db("loans").where({ id: loan_id }).first();
        if (!loan) return res.status(404).json({ error: "Prêt introuvable" });

        const totalDu = round2(loan.montant + loan.interets);

        const paiements = await db("paiements").where({ loan_id });
        const sommeAvant = paiements.reduce((s, p) => s + round2(p.montant), 0);

        if (round2(sommeAvant + montantNum) > totalDu)
            return res.status(400).json({ error: "Paiement dépasse le total dû" });

        await db("paiements").insert({
            id: crypto.randomUUID(),
            loan_id,
            montant: montantNum,
            date,
            mode,
            note
        });

        const updatedPays = await db("paiements").where({ loan_id });
        const totalApres = updatedPays.reduce((s, p) => s + round2(p.montant), 0);

        const dueDate = calculateDueDate(loan.date, loan.duree);

        const totalAvantEcheance = updatedPays
            .filter(p => p.date <= dueDate.toISOString().split("T")[0])
            .reduce((s, p) => s + round2(p.montant), 0);

        const lastPayment = updatedPays.length
            ? updatedPays.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b))
            : null;

        let statut = normalizeStatus(
            determineStatus(totalDu, totalAvantEcheance, totalApres, dueDate, lastPayment?.date)
        );

        const solde = round2(totalDu - totalApres);

        await db("loans").where({ id: loan_id }).update({ solde, statut });

        res.json({ success: true, solde, statut });

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.put("/editPaiement/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { montant, date, mode, note } = req.body;

        const montantNum = round2(montant);

        const oldPay = await db("paiements").where({ id }).first();
        if (!oldPay) return res.status(404).json({ error: "Paiement introuvable" });

        const loan = await db("loans").where({ id: oldPay.loan_id }).first();

        const totalDu = round2(loan.montant + loan.interets);

        const paiements = await db("paiements").where({ loan_id: loan.id });
        const totalSansAncien = paiements.reduce((s, p) => s + round2(p.montant), 0) - round2(oldPay.montant);

        if (round2(totalSansAncien + montantNum) > totalDu)
            return res.status(400).json({ error: "Paiement dépasse total dû" });

        await db("paiements").where({ id }).update({
            montant: montantNum,
            date,
            mode,
            note
        });

        const updatedPays = await db("paiements").where({ loan_id: loan.id });

        const totalApres = updatedPays.reduce((s, p) => s + round2(p.montant), 0);
        const dueDate = calculateDueDate(loan.date, loan.duree);

        const totalAvant = updatedPays
            .filter(p => p.date <= dueDate.toISOString().split("T")[0])
            .reduce((s, p) => s + round2(p.montant), 0);

        const lastPayment = updatedPays.length
            ? updatedPays.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b))
            : null;

        let statut = normalizeStatus(
            determineStatus(totalDu, totalAvant, totalApres, dueDate, lastPayment?.date)
        );

        const solde = round2(totalDu - totalApres);

        await db("loans").where({ id: loan.id }).update({ solde, statut });

        res.json({ success: true, solde, statut });

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.delete("/deletePaiement/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const pay = await db("paiements").where({ id }).first();
        if (!pay) return res.status(404).json({ error: "Paiement introuvable" });

        const loan = await db("loans").where({ id: pay.loan_id }).first();

        await db("paiements").where({ id }).del();

        const updatedPays = await db("paiements").where({ loan_id: loan.id });

        const totalDu = round2(loan.montant + loan.interets);
        const totalApres = updatedPays.reduce((s, p) => s + round2(p.montant), 0);
        const dueDate = calculateDueDate(loan.date, loan.duree);

        const totalAvant = updatedPays
            .filter(p => p.date <= dueDate.toISOString().split("T")[0])
            .reduce((s, p) => s + round2(p.montant), 0);

        const lastPayment = updatedPays.length
            ? updatedPays.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b))
            : null;

        let statut = normalizeStatus(
            determineStatus(totalDu, totalAvant, totalApres, dueDate, lastPayment?.date)
        );

        const solde = round2(totalDu - totalApres);

        await db("loans").where({ id: loan.id }).update({ solde, statut });

        res.json({ success: true, solde, statut });

    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;
