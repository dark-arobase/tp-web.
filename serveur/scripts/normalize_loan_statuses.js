const { db } = require('../db');

(async function normalize() {
  try {
    console.log('Recherche des prêts avec statut combiné...');
    const rows = await db('loans')
      .select('id', 'statut')
      .where('statut', 'like', '%EN RETARD%')
      .andWhere('statut', 'like', '%REMBOURSÉ%');

    if (!rows.length) {
      console.log('Aucun prêt avec statut combiné trouvé.');
      process.exit(0);
    }

    for (const r of rows) {
      console.log(`Mise à jour prêt ${r.id}: "${r.statut}" -> "EN RETARD"`);
      await db('loans').where({ id: r.id }).update({ statut: 'EN RETARD' });
    }

    console.log(`Terminé: ${rows.length} prêt(s) mis à jour.`);
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors de la normalisation:', err);
    process.exit(1);
  }
})();
