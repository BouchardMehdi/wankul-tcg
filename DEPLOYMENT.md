# Wankul TCG - mise en production Hostinger

Ce document sert de checklist pour une mise en ligne propre sur Hostinger Node.js Web App / Cloud. Pour un VPS, les memes variables restent utiles, mais tu peux ajouter Docker plus tard.

## 1. Domaine et HTTPS

1. Pointer le domaine vers Hostinger.
2. Activer le certificat SSL/HTTPS dans hPanel.
3. Verifier que le site public repond en `https://`.
4. Utiliser uniquement l'URL HTTPS dans les variables ci-dessous.

La PWA, les push notifications et le service worker ont besoin de HTTPS en production.

## 2. Frontend

Créer `frontend/.env.production` a partir de `frontend/.env.production.example`.

```env
VITE_API_URL=https://ton-domaine.fr
```

Important: ne pas ajouter `/api` a la fin. Le code frontend ajoute `/api` tout seul.

Build:

```bash
cd frontend
npm install
npm run build
```

Le dossier a servir est `frontend/dist`.

## 3. Backend

Créer `backend/.env` a partir de `backend/.env.production.example`.

Variables critiques:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://ton-domaine.fr
CORS_ORIGINS=https://ton-domaine.fr,https://www.ton-domaine.fr
DB_SYNCHRONIZE=false
JWT_SECRET=...
ADMIN_JWT_SECRET=...
```

Build:

```bash
cd backend
npm install
npm run build
npm run start:prod
```

Sur Hostinger Node App, le script de demarrage doit pointer vers:

```bash
npm run start:prod
```

## 4. MySQL propre

1. Creer une base MySQL de production separee de la base locale.
2. Creer un utilisateur MySQL dedie a cette base.
3. Importer le schema/data initial si necessaire.
4. Garder `DB_SYNCHRONIZE=false` en production apres le premier setup.
5. Toujours faire un backup avant de seed, modifier l'economie ou deployer une grosse feature.

Si tu dois initialiser une nouvelle base sans migrations, tu peux temporairement mettre `DB_SYNCHRONIZE=true`, lancer l'API une fois, verifier les tables, puis repasser immediatement a `false`.

## 5. SMTP reel

Configurer un vrai SMTP dans `backend/.env`:

```env
SMTP_HOST=smtp.provider.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@ton-domaine.fr
SMTP_PASS=...
MAIL_FROM="Wankul TCG <no-reply@ton-domaine.fr>"
SUPPORT_EMAIL=support@ton-domaine.fr
```

Tester:

1. Creation de compte.
2. Verification email.
3. Mot de passe oublie.
4. Signalement support si tu l'utilises.

## 6. VAPID push

Generer les cles:

```bash
cd backend
npm run push:generate-vapid
```

Puis remplir:

```env
PUSH_VAPID_PUBLIC_KEY=...
PUSH_VAPID_PRIVATE_KEY=...
PUSH_VAPID_SUBJECT=mailto:support@ton-domaine.fr
```

Tester sur mobile:

1. Installer la PWA.
2. Autoriser les notifications.
3. Creer une watchlist.
4. Verifier qu'une notif systeme s'affiche quand une alerte est envoyee.

## 7. Service worker / PWA

Checklist:

1. `frontend/public/manifest.webmanifest` existe.
2. `frontend/public/sw.js` est bien servi a la racine du domaine.
3. `offline.html`, `pwa-192.png`, `pwa-512.png`, `favicon.png` sont accessibles.
4. Le site est en HTTPS.
5. Apres un deploy important, tester: charger le site, fermer, ouvrir hors ligne, puis revenir en ligne.

## 8. Sauvegarde economie

Backup complet DB:

```bash
cd backend
npm run db:backup
```

Le dump est cree dans `backend/backups` par defaut. Ce dossier est ignore par Git.

Export economie consultable:

```bash
cd backend
npm run economy:export -- --days=30
```

Dans l'admin, tu as aussi:

1. Export JSON economie.
2. Export CSV economie.
3. Logs anti-abus/economie pagines.

## 9. Rollback manuel en cas de bug economie

Procedure conseillee:

1. Couper temporairement les actions sensibles si le bug est actif.
2. Faire une copie du dump actuel avec `npm run db:backup`.
3. Identifier le dernier dump sain.
4. Restaurer uniquement si tu es sur de ton choix.

Commande:

```bash
cd backend
ALLOW_DB_RESTORE=YES npm run db:restore -- ./backups/nom-du-backup.sql
```

Le script refuse de restaurer sans `ALLOW_DB_RESTORE=YES` pour eviter un accident.

## 10. Verifications avant ouverture publique

1. Register / login / reset password.
2. Ouverture booster et display.
3. Collection et card details.
4. Achat / vente market.
5. Watchlist + push.
6. PWA install + offline.
7. Admin economie + export.
8. Backup DB manuel.
