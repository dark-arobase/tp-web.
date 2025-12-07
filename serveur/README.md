EN RETARD business rule
=======================

Résumé développeur
- Si le dernier paiement qui réalise le remboursement total est daté APRES la date d'échéance,
  alors le prêt doit rester *"EN RETARD"* (prioritaire sur *"REMBOURSÉ"*).
- Sinon si solde > 0 et date courante > échéance => *"EN RETARD"*.
- Sinon si solde > 0 => *"ACTIF"*.
- Sinon solde == 0 => *"REMBOURSÉ"*.

Fichiers concernés
- `api/gestionPaiements.js` : implémentation de la règle et recalculs après POST/PUT/DELETE paiements
- `tests/e2e_payments.ps1` : script PowerShell d'intégration pour vérifier les scénarios (overpay / on-time / late)

Lancer les tests (PowerShell, depuis la racine du projet) :

```powershell
cd "C:\Users\mchir\OneDrive - Collège de Maisonneuve\Applications Web 1\tp web"
# Démarrer le serveur (dans un terminal séparé) :
cd .\serveur; node app.js

# Dans un autre terminal PowerShell (racine du projet) :
.\serveur\tests\e2e_payments.ps1
```

Remarque: le script génère des numéros de téléphone valides 10 chiffres et crée un client + prêt + paiements pour tester les statuts.
