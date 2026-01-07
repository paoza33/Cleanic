# Frontend

## script.js

| Mesure de sécurité                                  | Description                                                                               | Lignes clés dans `script.js` |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------- |
| **JWT pour authentification**                       | Empêche l’accès aux pages protégées sans login                                            | \~50‑55                      |
| **Header `Authorization` avec JWT**                 | Vérifie l’identité de l’utilisateur côté serveur                                          | \~83, \~150, \~200           |
| **Cache désactivé (`no-store`, `no-cache`)**        | Évite la mise en cache de données sensibles dans le navigateur                            | \~86‑87                      |
| **Gestion des erreurs / expiration de session**     | Supprime le token et redirige si session expirée                                          | \~88‑95                      |
| **Prévention CSRF (implémentation via JWT)**        | Les requêtes API nécessitent un token valide, évitant les requêtes malicieuses cross-site | \~83, \~150, \~200           |
| **Désactivation du bouton login pendant envoi**     | Empêche le spam ou attaques brute-force côté front                                        | \~19 et \~75                 |
| **Validation HTML5 `required` sur les formulaires** | Empêche l’envoi de champs vides                                                           | \~65‑67                      |

# Backend

## db.js

| Mesure de sécurité                             | Description                                                                                                                                                      | Lignes clés dans `db.js` |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Vérification des variables d’environnement** | L’application s’arrête si une variable critique (utilisateur, host, DB, mot de passe) est manquante → empêche un démarrage dans un état non sécurisé.            | \~7-14                   |
| **Externalisation des secrets**                | Les identifiants de connexion (user, password, host, DB) ne sont pas codés en dur mais récupérés via `process.env`, évitant leur exposition dans le code source. | \~16-22                  |


## app.js

| Mesure de sécurité                                      | Description                                                                                                                                       | Lignes clés dans `app.js`                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Chargement des variables d’environnement via dotenv** | Évite de stocker en clair les secrets (port, credentials DB, clés API éventuelles). Les valeurs sensibles sont externalisées.                     | `require('dotenv').config();` (ligne \~3)                 |
| **Parser JSON uniquement (express.json)**               | Le middleware limite le parsing aux corps JSON, ce qui réduit l’exposition aux payloads inattendus (par ex. form-urlencoded ou XML malveillants). | `app.use(express.json());` (ligne \~9)                    |
| **Gestion centralisée des erreurs 404**                 | Retourne une réponse claire si une route n’existe pas, évite de révéler la structure interne du serveur.                                          | `app.use((req, res) => { ... 404 ... });` (ligne \~28)    |
| **Gestion centralisée des erreurs serveur (500)**       | Capture les exceptions non prévues, log l’erreur côté serveur mais ne divulgue pas de détails sensibles au client.                                | `app.use((err, req, res, next) => { ... });` (ligne \~33) |


## authenticate.js

| Mesure de sécurité                                      | Description                                                                                                     | Lignes clés dans `authenticate.js` |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Vérification stricte de la présence de `JWT_SECRET`** | Le serveur s’arrête immédiatement si la clé secrète est absente → évite un fonctionnement en mode non sécurisé. | \~7-13                             |
| **Contrôle de l’en-tête Authorization**                 | Vérifie que l’appel inclut un header `Authorization: Bearer <token>` avant de poursuivre.                       | \~17-24                            |
| **Validation et décodage du JWT**                       | Le token est vérifié avec `jwt.verify` pour s’assurer qu’il est valide et signé avec le bon secret.             | \~27                               |
| **Stockage du payload décodé dans `req.user`**          | Permet aux routes suivantes d’identifier l’utilisateur (id, rôle, login) sans réexposer le token.               | \~31                               |
| **Gestion uniforme des erreurs JWT**                    | Si le token est invalide ou expiré, retour systématique en `401 Unauthorized` sans fuite d’infos sensibles.     | \~35-41                            |


## routes/auth.js

| Mesure de sécurité                                 | Description                                                                                                                                | Lignes clés dans `routes/auth.js` |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **Échappement des caractères LDAP (`escapeLDAP`)** | Empêche les injections LDAP lors de la recherche utilisateur (protège la requête Active Directory).                                        | \~9-11                            |
| **Normalisation du login (`normalizeLogin`)**      | Uniformise le format du login (`DOMAIN\user`, `user@domain`) → limite les bypass d’auth par variation de format.                           | \~13-18                           |
| **TLS pour la connexion LDAP**                     | Le client LDAP peut être configuré avec `tlsOptions.rejectUnauthorized`.                                                                   | \~23-27                           |
| **Forcer `LDAP_REJECT_UNAUTHORIZED=true`**         | 🚧 Non appliqué volontairement (lab, certificat auto-signé). **OK en lab / Obligatoire en production** pour rejeter les certifs invalides. | N/A (config .env / code)          |
| **Timeouts de connexion LDAP**                     | Définit des limites (`timeout: 5000`, `connectTimeout: 5000`) pour éviter des attaques DoS par blocage de socket.                          | \~21-22                           |
| **Limite de taille du body**                       | `express.json({ limit: "1mb" })` empêche les payloads massifs pouvant causer un déni de service.                                           | \~6-7                             |
| **Comptes non trouvés → rejet explicite**          | Si l’utilisateur n’existe pas en AD, réponse 403 sans fuite d’infos sensibles.                                                             | \~92-95                           |
| **Bind utilisateur distinct du bind service**      | Vérifie le mot de passe réellement fourni par l’utilisateur, et déconnecte immédiatement après test.                                       | \~71-80                           |
| **Requêtes SQL paramétrées (`$1`)**                | Protège contre les injections SQL lors de la vérification/provisionnement dans la DB.                                                      | \~101-104                         |
| **Restriction des comptes “pending”**              | Bloque l’accès aux comptes qui ne sont pas encore approuvés.                                                                               | \~108-110                         |
| **JWT signé et expirant**                          | Génère un JWT avec `process.env.JWT_SECRET` et une durée de vie limitée (`expiresIn: '8h'`).                                               | \~114-119                         |
| **Gestion fine des erreurs**                       | Réponses HTTP adaptées (`401`, `403`, `502`, `500`) sans divulguer les détails internes.                                                   | \~124-128                         |


## routes/appointments.js

| Mesure de sécurité                                | Description                                                                                                            | Lignes clés dans `routes/appointments.js`                                                                                   |   |                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | - | -------------------------------------- |
| **Authentification obligatoire (`authenticate`)** | Toutes les routes sont protégées par le middleware JWT, qui vérifie la validité du token et l’identité utilisateur.    | Toutes les routes (`router.get`, `post`, `put`, `delete`)                                                                   |   |                                        |
| **Contrôle des rôles (RBAC)**                     | Vérifie que l’utilisateur a les droits suffisants selon son rôle avant chaque action (`medecins`, `infirmiers`, etc.). | `if (!['medecins', 'infirmiers', 'IT', 'Directions'].includes(req.user.role))` et variantes (\~11, \~26, \~52, \~75, \~103) |   |                                        |
| **Requêtes SQL paramétrées (`$1`, `$2`, …)**      | Toutes les requêtes SQL utilisent des paramètres pour éviter l’injection SQL.                                          | SELECT, INSERT, UPDATE, DELETE (\~14, \~33, \~54, \~76, \~104, \~130)                                                       |   |                                        |
| **Validation des inputs**                         | Vérifie les ID numériques (`parseInt`) et la présence des champs requis pour éviter des données invalides.             | `parseInt(req.params.id, 10)` et \`if (!patient\_id                                                                         |   | !personnel\_id …)\` (\~20, \~52, \~76) |
| **Limite de taille du body JSON**                 | `express.json({ limit: "1mb" })` empêche les payloads massifs pouvant causer un déni de service.                       | juste après `const router = express.Router();`                                                                              |   |                                        |
| **Gestion des erreurs uniforme**                  | Toutes les erreurs serveur renvoient un message générique sans divulguer d’informations sensibles.                     | `res.status(500).json({ message: 'Erreur interne du serveur.' })` (\~18, \~38, \~58, \~82, \~108)                           |   |                                        |
| **Protection contre les objets inexistants**      | Retourne 404 si le rendez-vous n’existe pas, empêchant la fuite d’infos.                                               | `if (result.rows.length === 0)` (\~35, \~84, \~111, \~136)                                                                  |   |                                        |
| **Limite des opérations sensibles par rôle**      | Seule une sélection spécifique de rôles peut créer, mettre à jour ou supprimer un rendez-vous.                         | Vérifications rôle dans POST/PUT/DELETE (\~52, \~76, \~104)                                                                 |   |                                        |
| **Logging minimal des erreurs**                   | Les erreurs sont loggées côté serveur (`console.error`) mais aucune donnée sensible n’est exposée aux clients.         | `console.error('Erreur …', err.message)` (\~18, \~38, \~58, \~82, \~108)                                                    |   |                                        |

