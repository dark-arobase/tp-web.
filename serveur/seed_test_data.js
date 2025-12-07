const { db } = require('./db');
const crypto = require('crypto');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function calculateInterests(montant, taux, duree) {
  return Number((Number(montant) * (Number(taux) / 100) * (Number(duree) / 12)).toFixed(2));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function seed() {
  console.log('Seeding test data: 20 clients with loans and payments...');

  for (let i = 1; i <= 20; i++) {
    const clientId = crypto.randomUUID();
    const client = {
      id: clientId,
      nom: `Client${i}`,
      prenom: `T${i}`,
      telephone: ("0" + randInt(100000000, 999999999)).slice(0, 10),
      email: `client${i}@example.com`,
      adresse: `Rue Test ${i}`
    };

    await db('clients').insert(client);

    const loansCount = randInt(1, 3);
    for (let j = 0; j < loansCount; j++) {
      const montant = randInt(50, 2000);
      const taux = [3, 5, 7, 10][randInt(0, 3)];
      const duree = [1, 3, 6, 12][randInt(0, 3)];

      // choose date: some in past (-3, -2, -1 months), some today, some future (+1)
      const choices = [-3, -2, -1, 0, 1];
      const monthsOffset = choices[randInt(0, choices.length - 1)];
      const date = new Date();
      date.setMonth(date.getMonth() + monthsOffset);
      const dateStr = formatDate(date);

      const interets = calculateInterests(montant, taux, duree);
      const totalDu = round2(Number(montant) + interets);

      const loan = {
        id: crypto.randomUUID(),
        client_id: clientId,
        montant: Number(Number(montant).toFixed(2)),
        taux,
        duree,
        date: dateStr,
        interets,
        solde: totalDu,
        statut: totalDu > 0 ? 'ACTIF' : 'REMBOURSÉ'
      };

      await db('loans').insert(loan);

      // Add payments: randomly 0..2 payments
      const paymentsCount = randInt(0, 2);
      let paid = 0;
      for (let p = 0; p < paymentsCount; p++) {
        // payment amount: between 10% and remaining
        const remaining = round2(totalDu - paid);
        if (remaining <= 0) break;
        const amount = round2(Math.min(remaining, Math.max(1, Math.round(remaining * (randInt(10, 90) / 100)))));
        const payDate = new Date(date);
        payDate.setDate(payDate.getDate() + randInt(1, 30));
        await db('paiements').insert({
          id: crypto.randomUUID(),
          loan_id: loan.id,
          montant: amount,
          date: formatDate(payDate),
          mode: ['cash','card','transfer'][randInt(0,2)],
          note: 'seed payment'
        });
        paid = round2(paid + amount);
      }

      // Update loan solde/statut based on payments
      const paiements = await db('paiements').where({ loan_id: loan.id });
      const totalPayes = paiements.reduce((s, r) => s + parseFloat(r.montant), 0);
      const nouveauSolde = round2(totalDu - totalPayes);
      // determine due date
      const dueDate = new Date(loan.date);
      dueDate.setMonth(dueDate.getMonth() + loan.duree);
      let statut = 'ACTIF';
      if (nouveauSolde <= 0) statut = 'REMBOURSÉ';
      else {
        const today = new Date();
        const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const nowDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        statut = dueDay.getTime() < nowDay.getTime() ? 'EN RETARD' : 'ACTIF';
      }
      await db('loans').where({ id: loan.id }).update({ solde: nouveauSolde, statut });
    }
  }

  console.log('Seeding finished.');
  // Print summary counts
  const c = await db('clients').count('id as cnt').first();
  const l = await db('loans').count('id as cnt').first();
  const p = await db('paiements').count('id as cnt').first();
  console.log(`Clients: ${c.cnt}, Loans: ${l.cnt}, Payments: ${p.cnt}`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
