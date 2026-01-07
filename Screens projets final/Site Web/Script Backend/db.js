console.log('--- Début du chargement de db.js ---');

const { Pool } = require('pg');

// Vérification des variables d'environnement
const requiredEnv = ['PG_USER', 'PG_HOST', 'PG_DATABASE', 'PG_PASSWORD'];
requiredEnv.forEach((envVar) => {
    if (!process.env[envVar]) {
        console.error(`ERREUR: la variable d'environnement ${envVar} est manquante`);
        process.exit(1); // stoppe le serveur si une variable essentielle manque
    }
});

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT || 5432,
    max: 20,           // nombre maximum de connexions simultanées
    idleTimeoutMillis: 30000, // fermeture des connexions inactives après 30s
    connectionTimeoutMillis: 2000, // timeout de connexion après 2s
});

// Gestion des événements
pool.on('connect', () => {
    console.log('✅ Connexion à PostgreSQL établie');
});

pool.on('error', (err) => {
    console.error('❌ Erreur sur le pool PostgreSQL:', err);
});

// Test immédiat de connexion
pool.query('SELECT 1', (err) => {
    if (err) console.error('Erreur PostgreSQL', err);
    else console.log('✅ Connexion à PostgreSQL confirmée');
});

// Export du pool pour l’utiliser dans les routes
console.log('--- Fin du chargement de db.js ---');
module.exports = pool;