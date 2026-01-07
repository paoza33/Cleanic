const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // --- LOGIN PAGE ---
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const spinner = document.getElementById('spinner');
    const messageBox = document.getElementById('messageBox');

    function showMessage(message, type = 'info', timeout = 3000) {
        if (!messageBox) return;
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.classList.remove('hidden');

        if (timeout) {
            setTimeout(() => {
                messageBox.classList.add('hidden');
            }, timeout);
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = usernameInput.value;
            const password = passwordInput.value;

            loginButton.disabled = true;
            spinner.classList.remove('hidden');
            messageBox.classList.add('hidden');

            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('jwtToken', data.token);
                    localStorage.setItem('username', username);

                    showMessage('Connexion réussie, redirection...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard-patients.html';
                    }, 1000);
                } else {
                    showMessage('Identifiants invalides', 'error');
                }
            } catch (error) {
                console.error('Erreur de connexion:', error);
                showMessage('Erreur réseau, veuillez réessayer.', 'error');
            } finally {
                loginButton.disabled = false;
                spinner.classList.add('hidden');
            }
        });
    }

    // --- DASHBOARD PAGE ---
    if (window.location.pathname.endsWith('dashboard-patients.html')) {
        const token = localStorage.getItem('jwtToken');
        const username = localStorage.getItem('username') || 'Utilisateur';
        const dashboardContent = document.getElementById('dashboardContent');

        if (!dashboardContent) return;

        if (!token) {
            dashboardContent.innerHTML = `<p class="text-red-600">Vous devez être connecté pour accéder à cette page.</p>`;
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            return;
        }

        // Contenu principal
        dashboardContent.innerHTML = `
            <h2 class="text-2xl font-bold text-blue-800">Bienvenue, ${username}!</h2>
            
            <!-- Formulaire ajout -->
            <div class="mt-6 p-4 bg-white shadow rounded">
                <h3 class="text-lg font-semibold mb-2">Ajouter un rendez-vous</h3>
                <form id="addAppointmentForm" class="flex flex-col gap-2">
                    <input type="text" id="patientName" placeholder="Nom du patient" class="border p-2 rounded" required>
                    <input type="datetime-local" id="appointmentDate" class="border p-2 rounded" required>
                    <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Ajouter</button>
                </form>
            </div>

            <!-- Liste -->
            <div id="patientsList" class="p-6 bg-white rounded-lg shadow-md mt-8"></div>
        `;

        // bouton logout
        const logoutBtn = document.getElementById('logoutButton');
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('username');
            window.location.href = 'login.html';
        });

        // charger patients
        async function loadPatients() {
            const patientsListDiv = document.getElementById('patientsList');

            try {
                // -- Ajout cache: 'no-store' pour éviter 304 --
                const response = await fetch(`${API_BASE}/appointments?ts=${Date.now()}`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    },
                    cache: 'no-store'
                });

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        patientsListDiv.innerHTML = `<p class="text-red-600">Votre session a expiré. Redirection...</p>`;
                        localStorage.removeItem('jwtToken');
                        localStorage.removeItem('username');
                        setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                        return;
                    }
                    throw new Error('Erreur serveur');
                }

                const appointments = await response.json();

                if (appointments.length === 0) {
                    patientsListDiv.innerHTML = '<p class="text-gray-600">Aucun rendez-vous trouvé.</p>';
                    return;
                }

                patientsListDiv.innerHTML = '<h3 class="text-xl font-semibold mb-4">Vos Rendez-vous Patients</h3>';
                const ul = document.createElement('ul');

                for (const appt of appointments) {
                    const label = appt.patient_name || '(Patient inconnu)';
                    const date = new Date(appt.start_time);
                    const formatted = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;

                    const li = document.createElement('li');
                    li.className = 'mb-2 text-gray-700 flex justify-between items-center';

                    li.innerHTML = `
                        <span>${label} - ${formatted}</span>
                        <div class="flex gap-2">
                            <button class="editBtn bg-blue-500 text-white px-2 py-1 rounded" data-id="${appt.appointment_id}">Modifier</button>
                            <button class="deleteBtn bg-red-500 text-white px-2 py-1 rounded" data-id="${appt.appointment_id}">Supprimer</button>
                        </div>
                    `;

                    ul.appendChild(li);
                }

                patientsListDiv.appendChild(ul);

                // attacher les events
                document.querySelectorAll('.deleteBtn').forEach(btn => {
                    btn.addEventListener('click', () => deleteAppointment(btn.dataset.id));
                });

                document.querySelectorAll('.editBtn').forEach(btn => {
                    btn.addEventListener('click', () => editAppointment(btn.dataset.id));
                });

            } catch (error) {
                console.error('Erreur lors du chargement des patients:', error);
                patientsListDiv.innerHTML = '<p class="text-red-600">Erreur réseau lors du chargement des rendez-vous.</p>';
            }
        }

        // Ajouter rendez-vous
        document.getElementById('addAppointmentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('patientName').value;
            const date = document.getElementById('appointmentDate').value;

            try {
                const res = await fetch(`${API_BASE}/appointments`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ patient_name: name, start_time: date })
                });

                if (res.ok) {
                    showMessage('Rendez-vous ajouté', 'success');
                    loadPatients();
                    e.target.reset();
                } else {
                    showMessage('Erreur lors de l’ajout', 'error');
                }
            } catch (err) {
                console.error(err);
                showMessage('Erreur réseau', 'error');
            }
        });

        // Supprimer rendez-vous
        async function deleteAppointment(id) {
            if (!confirm('Supprimer ce rendez-vous ?')) return;
            try {
                const res = await fetch(`${API_BASE}/appointments/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    showMessage('Rendez-vous supprimé', 'success');
                    loadPatients();
                } else {
                    showMessage('Erreur suppression', 'error');
                }
            } catch (err) {
                console.error(err);
                showMessage('Erreur réseau', 'error');
            }
        }

        // Modifier rendez-vous
        async function editAppointment(id) {
            try {
                // Récupérer le rendez-vous existant
                const resGet = await fetch(`${API_BASE}/appointments/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!resGet.ok) {
                    showMessage('Impossible de récupérer le rendez-vous', 'error');
                    return;
                }
                const appt = await resGet.json();

                // Demander les nouvelles valeurs
                const newName = prompt('Nouveau nom du patient :', appt.patient_name);
                const newDate = prompt('Nouvelle date (YYYY-MM-DD HH:MM) :', appt.start_time);

                if (!newName || !newDate) return;

                // Envoyer toutes les informations existantes + les modifications
                const resPut = await fetch(`${API_BASE}/appointments/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        patient_id: appt.patient_id,        // garder l’ID patient
                        personnel_id: appt.personnel_id,    // garder l’ID personnel
                        patient_name: newName,
                        start_time: newDate,
                        end_time: appt.end_time,            // conserver la fin si nécessaire
                        status: appt.status                  // conserver le status
                    })
                });

                if (resPut.ok) {
                    showMessage('Rendez-vous modifié', 'success');
                    loadPatients();
                } else {
                    showMessage('Erreur modification', 'error');
                }

            } catch (err) {
                console.error(err);
                showMessage('Erreur réseau', 'error');
            }
        }



        loadPatients();
    }
});
