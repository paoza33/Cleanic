const express = require('express');
const ldap = require('ldapjs');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // adapte le chemin si besoin

const router = express.Router();
router.use(express.json());

// --- Helpers ---
function escapeLDAP(s = '') {
  return String(s).replace(/([*()\\])/g, '\\$1');
}

function normalizeLogin(s = '') {
  let x = String(s).trim();
  if (x.includes('\\')) x = x.split('\\').pop(); // DOMAIN\user -> user
  if (x.includes('@')) x = x.split('@')[0];     // user@domain -> user
  return x.toLowerCase();
}

function createLdapClient() {
  return ldap.createClient({
    url: process.env.LDAP_URL,
    timeout: 5000,
    connectTimeout: 5000,
    tlsOptions: {
      rejectUnauthorized: String(process.env.LDAP_REJECT_UNAUTHORIZED || 'false') === 'true'
    }
  });
}

async function bindService(client) {
  console.log('🔹 Bind service LDAP en cours...');
  return new Promise((resolve, reject) => {
    client.bind(process.env.LDAP_BIND_DN, process.env.LDAP_BIND_PASSWORD, (err) => {
      if (err) return reject(err);
      console.log('✅ Bind service réussi');
      return resolve();
    });
  });
}

async function searchUserDN(client, base, filter) {
  console.log(`🔹 Recherche du DN pour le filtre LDAP: ${filter}`);
  return new Promise((resolve, reject) => {
    const opts = { scope: 'sub', filter, attributes: ['dn', 'cn', 'mail', 'sAMAccountName'], paged: true, sizeLimit: 2 };
    let foundDN = null;

    client.search(base, opts, (err, res) => {
      if (err) return reject(err);

      res.on('searchEntry', (entry) => {
        foundDN = entry.objectName || (entry.dn && entry.dn.toString()) || (entry.object && entry.object.dn) || null;
        console.log(`🔹 DN trouvé: ${foundDN}`);
      });

      res.on('error', (e) => reject(e));
      res.on('end', () => resolve(foundDN));
    });
  });
}

async function bindUser(dn, password) {
  console.log(`🔹 Bind utilisateur en cours pour DN: ${dn}`);
  return new Promise((resolve, reject) => {
    const userClient = createLdapClient();
    userClient.bind(String(dn), String(password), (err) => {
      userClient.unbind();
      if (err) {
        const msg = (err.code === 49 || /invalid/i.test(String(err))) ? 'invalid-credentials' : 'ldap-bind-failed';
        console.warn(`⚠️ Bind utilisateur échoué: ${msg}`);
        return reject(new Error(msg));
      }
      console.log('✅ Utilisateur authentifié via LDAP');
      return resolve();
    });
  });
}

// --- Route ---
router.post('/login', async (req, res) => {
  const startedAt = Date.now();
  const schema = process.env.DB_SCHEMA || 'public';

  try {
    const rawUser = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!rawUser || !password) return res.status(400).json({ message: 'username/password required' });

    const loginNorm = normalizeLogin(rawUser);
    console.log(`🔹 Login normalisé: ${loginNorm}`);

    // Bind service + recherche DN
    const client = createLdapClient();
    await bindService(client);
    const searchBase = process.env.LDAP_USER_SEARCH_BASE || process.env.LDAP_BASE_DN;
    const filter = `(|(sAMAccountName=${escapeLDAP(loginNorm)})(userPrincipalName=${escapeLDAP(rawUser)}))`;
    let userDn = await searchUserDN(client, searchBase, filter);
    client.unbind();

    const userDnStr = userDn ? String(userDn).trim() : '';
    if (!userDnStr) {
      console.warn('⚠️ Utilisateur non trouvé dans AD');
      return res.status(403).json({ message: 'user not found in AD' });
    }

    // Bind utilisateur
    await bindUser(userDnStr, password);

    // Vérification/provisionnement en DB
    const { rows } = await pool.query(
      `SELECT id, login_ad, role, mail FROM ${schema}.personnels WHERE lower(login_ad) = $1 LIMIT 1`,
      [loginNorm]
    );

    if (rows.length === 0) return res.status(403).json({ message: 'user not provisioned' });

    const user = rows[0];
    if (String(user.role || '').toLowerCase() === 'pending') {
      return res.status(403).json({ message: 'account pending approval' });
    }

    // Génération JWT
    let token = null;
    if (process.env.JWT_SECRET) {
      token = jwt.sign(
        { sub: user.id, login: user.login_ad, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
    }

    return res.status(200).json({
      message: 'ok',
      user: { id: user.id, login: user.login_ad, role: user.role, mail: user.mail },
      token,
      ms: Date.now() - startedAt
    });

  } catch (err) {
    console.error('Erreur login:', err);
    if (err?.message === 'invalid-credentials') return res.status(401).json({ message: 'invalid credentials' });
    if (err?.message === 'ldap-bind-failed') return res.status(502).json({ message: 'ldap bind failed' });
    return res.status(500).json({ message: 'internal error' });
  }
});

module.exports = router;