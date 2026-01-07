console.log('--- Début du chargement de middleware/authenticate.js ---');

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Recommandation 1: Gérer l'absence de la clé secrète de manière plus robuste.
// Si JWT_SECRET est manquant, on arrête l'application au démarrage.
// Cela empêche un comportement inattendu en production.
if (!JWT_SECRET) {
    console.error('ERREUR GRAVE : JWT_SECRET manquant pour le middleware. Arrêt de l application.');
    process.exit(1);
}

function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    if (!token) {
        return res.status(401).json({ message: 'Token invalide' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Recommandation 2: Ne pas afficher les informations décodées en production.
        // Ce log est utile pour le développement, mais il est préférable de le désactiver
        // pour des raisons de sécurité des données.
        // console.log('✅ JWT valide pour:', decoded);

        req.user = decoded; // { sub, login, role }
        next();
    } catch (err) {
        // Recommandation 3: Maintenir le code de statut 401 pour toutes les erreurs d'authentification.
        // Cela inclut les tokens invalides ou expirés, ce qui est la bonne pratique.
        console.error('⚠️ JWT invalide ou expiré:', err.message);
        return res.status(401).json({ message: 'Accès refusé : token invalide ou expiré' });
    }
}

console.log('--- Fin du chargement de middleware/authenticate.js ---');
module.exports = authenticate;