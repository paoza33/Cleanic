console.log('--- Début du chargement de routes/appointments.js ---');

const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticate = require('../authenticate');

// --- Liste de tous les rendez-vous ---
router.get('/', authenticate, async (req, res) => {
    try {
        if (!['medecins', 'infirmiers', 'IT', 'Directions'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Accès refusé' });
        }

        const result = await pool.query(`
            SELECT 
                a.id AS appointment_id,
                p.firstname || ' ' || p.lastname AS patient_name,
                d.firstname || ' ' || d.lastname AS personnel_name,
                a.start_time,
                a.end_time,
                a.status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN personnels d ON a.personnel_id = d.id
            ORDER BY a.start_time ASC
        `);

        res.json(result.rows);
    } catch (err) {
        console.error('Erreur récupération appointments:', err.message);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// --- Détails d’un rendez-vous ---
router.get('/:id', authenticate, async (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    if (isNaN(appointmentId)) {
        return res.status(400).json({ message: 'ID rendez-vous invalide.' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM appointments WHERE id=$1',
            [appointmentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé.' });
        }

        const appointment = result.rows[0];

        if (!['medecins', 'infirmiers', 'IT', 'Directions'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        res.json(appointment);
    } catch (err) {
        console.error('Erreur récupération rendez-vous:', err.message);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// --- Création d’un rendez-vous ---
router.post('/', authenticate, async (req, res) => {
    const { patient_id, personnel_id, start_time, end_time, status } = req.body;

    if (!patient_id || !personnel_id || !start_time || !end_time) {
        return res.status(400).json({ message: 'Champs manquants.' });
    }

    try {
        if (!['medecins', 'infirmiers'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        const result = await pool.query(
            'INSERT INTO appointments (patient_id, personnel_id, start_time, end_time, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [patient_id, personnel_id, start_time, end_time, status || 'planned']
        );

        res.status(201).json({ message: 'Rendez-vous créé.', appointment: result.rows[0] });
    } catch (err) {
        console.error('Erreur création rendez-vous:', err.message);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// --- Mise à jour d’un rendez-vous ---
router.put('/:id', authenticate, async (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    const { patient_id, personnel_id, start_time, end_time, status } = req.body;

    if (isNaN(appointmentId)) return res.status(400).json({ message: 'ID rendez-vous invalide.' });

    try {
        if (!['medecins', 'infirmiers'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        const result = await pool.query(
            'UPDATE appointments SET patient_id=$1, personnel_id=$2, start_time=$3, end_time=$4, status=$5 WHERE id=$6 RETURNING *',
            [patient_id, personnel_id, start_time, end_time, status, appointmentId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Rendez-vous non trouvé.' });

        res.json({ message: 'Rendez-vous mis à jour.', appointment: result.rows[0] });
    } catch (err) {
        console.error('Erreur mise à jour rendez-vous:', err.message);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// --- Suppression d’un rendez-vous ---
router.delete('/:id', authenticate, async (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    if (isNaN(appointmentId)) return res.status(400).json({ message: 'ID rendez-vous invalide.' });

    try {
        if (!['medecins', 'IT', 'Directions'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }

        const result = await pool.query('DELETE FROM appointments WHERE id=$1 RETURNING id', [appointmentId]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Rendez-vous non trouvé.' });

        res.json({ message: 'Rendez-vous supprimé.', appointmentId });
    } catch (err) {
        console.error('Erreur suppression rendez-vous:', err.message);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

console.log('--- Fin du chargement de routes/appointments.js ---');
module.exports = router;
