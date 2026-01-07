console.log('--- Début du chargement de app.js ---');

require('dotenv').config(); // Charger les variables d'environnement

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// --- Middleware global ---
app.use(express.json()); // Pour parser les JSON dans les requêtes

// --- Import routes ---
const authRoutes = require('./routes/auth');
const patientsRoutes = require('./routes/patients');
const appointmentsRouter = require('./routes/appointments');

// --- Mount routes ---
app.use('/auth', authRoutes);
app.use('/patients', patientsRoutes);
app.use('/appointments', appointmentsRouter);

// --- Route test simple ---
app.get('/', (req, res) => {
    res.send('API Cleanic opérationnelle !');
});

// --- Gestion des erreurs 404 ---
app.use((req, res) => {
    res.status(404).json({ message: 'Route non trouvée.' });
});

// --- Gestion des erreurs serveur ---
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err.stack);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
});

// --- Démarrage du serveur ---
app.listen(port, () => {
    console.log(`✅ Serveur démarré sur le port ${port}`);
});

console.log('--- Fin du chargement de app.js ---');