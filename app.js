/* ═══════════════════════════════════════════════════════════════════════════
   MousePass — app.js
   Gradiant 2026 · Generador de contraseñas basado en entropía del ratón
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ─── Cambio de tema claro / oscuro ───────────────────────────────────────────
(function () {
  const btn  = document.getElementById('btn-theme');
  const icon = document.getElementById('theme-icon');

  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
  }

  btn.addEventListener('click', () => {
    icon.classList.remove('spinning');
    void icon.offsetWidth; 
    icon.classList.add('spinning');
    icon.addEventListener('animationend', () => icon.classList.remove('spinning'), { once: true });

    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
  });
})();

// ─── Brillo que sigue al cursor ──────────────────────────────────────────────
const cursorGlow = document.getElementById('cursor-glow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top  = e.clientY + 'px';
});

// ─── Navegación entre pestañas ───────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ─── Notificaciones emergentes ───────────────────────────────────────────────
function toast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOTOR DE ENTROPÍA
   ═══════════════════════════════════════════════════════════════════════════ */
const canvas    = document.getElementById('entropy-canvas');
const ctx       = canvas.getContext('2d');
const zone      = document.getElementById('entropy-zone');
const hintEl    = document.getElementById('entropy-hint');
const barEl     = document.getElementById('entropy-bar');
const pctEl     = document.getElementById('entropy-pct');

const TARGET_BITS = 100;

let entropyPool = new Uint8Array(256);
let entropyPos  = 0;
let entropyBits = 0;
let lastX = -1, lastY = -1, lastT = 0;
let isCollecting = false;
let isResetting  = false;

/* Ajusta el canvas al tamaño del recuadro de entropía */
function resizeCanvas() {
  canvas.width  = zone.clientWidth;
  canvas.height = zone.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

/* Mezcla el valor en el pool de entropía mediante XOR byte a byte */
function mixEntropy(val) {
  for (let i = 0; i < 4; i++) {
    entropyPool[entropyPos % 256] ^= (val >> (i * 8)) & 0xFF;
    entropyPos = (entropyPos + 1) % 256;
  }
}

/* Actualiza la barra de progreso y el texto de bits recopilados.
   Al alcanzar los 100 bits habilita el botón de generar */
function updateEntropyUI() {
  const progress = Math.min(100, Math.round(entropyBits / TARGET_BITS * 100));
  barEl.style.width = progress + '%';

  if (entropyBits >= TARGET_BITS) {
    pctEl.textContent = `Suficiente entropía (${TARGET_BITS}+ bits)`;
    pctEl.style.color = 'var(--neon)';
    document.getElementById('btn-generate').disabled = false;
  } else {
    pctEl.textContent = `${Math.round(entropyBits)} / ${TARGET_BITS} bits`;
    pctEl.style.color = '';
  }
}

/* Captura el movimiento del ratón dentro del recuadro y extrae entropía
   de la posición (x, y), el tiempo entre eventos y la velocidad de movimiento */
zone.addEventListener('mousemove', e => {
  if (isResetting) return;

  const rect = zone.getBoundingClientRect();
  const x    = e.clientX - rect.left;
  const y    = e.clientY - rect.top;
  const now  = performance.now();

  if (lastX < 0) { lastX = x; lastY = y; lastT = now; return; }

  const dx = x - lastX;
  const dy = y - lastY;
  const dt = now - lastT;
  if (dx === 0 && dy === 0) return;

  mixEntropy(Math.round(x  * 1000));
  mixEntropy(Math.round(y  * 1000));
  mixEntropy(Math.round(dt * 1000));
  mixEntropy((dx * 31337) ^ (dy * 7919));

  const added = Math.min(3, Math.log2(Math.abs(dx) + Math.abs(dy) + 1));
  entropyBits = Math.min(TARGET_BITS, entropyBits + added);

  lastX = x; lastY = y; lastT = now;

  if (!isCollecting) {
    isCollecting = true;
    zone.classList.add('collecting');
    hintEl.style.opacity = '0';
  }

  updateEntropyUI();
});

/* Botón "Recapturar entropía": reinicia el pool de entropía y la interfaz
   con una pequeña animación de transición en el borde del recuadro */
document.getElementById('btn-reset-entropy').addEventListener('click', () => {
  const btn = document.getElementById('btn-reset-entropy');
  if (isResetting) return;
  isResetting = true;

  btn.classList.add('spinning');
  barEl.classList.add('resetting');
  zone.classList.remove('collecting');
  zone.classList.add('resetting');

  setTimeout(() => {
    entropyPool = new Uint8Array(256);
    entropyPos  = 0;
    entropyBits = 0;
    lastX = -1; lastY = -1; lastT = 0;
    isCollecting = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    barEl.style.width = '0%';
    barEl.classList.remove('resetting');
    pctEl.textContent = '0 / 100 bits';
    pctEl.style.color = '';
    zone.classList.remove('resetting');
    hintEl.style.opacity = '1';

    document.getElementById('btn-generate').disabled = true;

    btn.classList.remove('spinning');
    isResetting = false;
    toast('Entropía borrada — mueve el ratón de nuevo');
  }, 300);
});

/* ═══════════════════════════════════════════════════════════════════════════
   GENERACIÓN DE CONTRASEÑAS
   ═══════════════════════════════════════════════════════════════════════════ */
const CHARS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  digits:  '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?'
};

/* Construye el alfabeto de caracteres según las opciones marcadas en la UI */
function deriveCharset() {
  let cs = '';
  if (document.getElementById('opt-upper').checked)   cs += CHARS.upper;
  if (document.getElementById('opt-lower').checked)   cs += CHARS.lower;
  if (document.getElementById('opt-digits').checked)  cs += CHARS.digits;
  if (document.getElementById('opt-symbols').checked) cs += CHARS.symbols;
  return cs || CHARS.lower;
}

/* Genera la contraseña mezclando bytes aleatorios del sistema con el pool
   de entropía del ratón mediante XOR para mayor imprevisibilidad */
function generatePassword() {
  const len = parseInt(document.getElementById('length').value);

  const random = new Uint8Array(256);
  crypto.getRandomValues(random);
  for (let i = 0; i < 256; i++) random[i] ^= entropyPool[i];

  let pwd = '';
  const cs = deriveCharset();
  for (let i = 0; i < len; i++) {
    pwd += cs[random[i % 256] % cs.length];
  }

  return pwd;
}

/* Calcula la fortaleza de la contraseña en una escala de 0 a 9
   según longitud, variedad de caracteres y entropía estimada */
function calcStrength(pwd) {
  let score = 0;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;
  if (pwd.length >= 20) score++;
  if (/[A-Z]/.test(pwd))        score++;
  if (/[a-z]/.test(pwd))        score++;
  if (/[0-9]/.test(pwd))        score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const entropy = Math.log2(Math.pow(new Set(pwd).size, pwd.length));
  if (entropy > 60) score++;
  if (entropy > 80) score++;
  return Math.min(score, 9);
}

/* Muestra la contraseña generada y actualiza la barra y etiqueta de fortaleza */
function showPassword(pwd) {
  document.getElementById('password-text').textContent = pwd;
  document.getElementById('result-panel').style.display = 'block';

  const s     = calcStrength(pwd);
  const fill  = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  fill.style.width = Math.round((s / 9) * 100) + '%';

  if      (s <= 2) { fill.style.background = '#ff4d6d'; label.style.color = '#ff4d6d'; label.textContent = 'MUY DÉBIL'; }
  else if (s <= 4) { fill.style.background = '#ff9a3c'; label.style.color = '#ff9a3c'; label.textContent = 'DÉBIL'; }
  else if (s <= 6) { fill.style.background = '#ffe066'; label.style.color = '#ffe066'; label.textContent = 'MODERADA'; }
  else if (s <= 7) { fill.style.background = '#00f5c4'; label.style.color = '#00f5c4'; label.textContent = 'FUERTE'; }
  else             { fill.style.background = '#00f5c4'; label.style.color = '#00f5c4'; label.textContent = 'MUY FUERTE'; }
}

/* Actualiza el número de caracteres mostrado al mover el slider de longitud */
document.getElementById('length').addEventListener('input', function () {
  document.getElementById('len-val').textContent = this.value;
});

document.getElementById('btn-generate').addEventListener('click', () => showPassword(generatePassword()));

/* Copia la contraseña generada al portapapeles */
document.getElementById('btn-copy').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('password-text').textContent)
    .then(() => toast('Contraseña copiada al portapapeles'));
});

/* Redirige a la pestaña Verificar con la contraseña generada precargada */
document.getElementById('btn-check-this').addEventListener('click', () => {
  document.querySelectorAll('.tab')[1].click();
  document.getElementById('check-input').value = document.getElementById('password-text').textContent;
  document.getElementById('btn-check').click();
});

/* Redirige a la pestaña Vault con la contraseña generada precargada en el formulario */
document.getElementById('btn-save-vault').addEventListener('click', () => {
  document.querySelectorAll('.tab')[2].click();
  document.getElementById('f-pass').value = document.getElementById('password-text').textContent;
  document.getElementById('f-site').focus();
});

/* ═══════════════════════════════════════════════════════════════════════════
   VERIFICACIÓN DE FILTRACIONES — HIBP con k-anonimato
   ═══════════════════════════════════════════════════════════════════════════ */

/* Calcula el hash SHA-1 de una cadena y lo devuelve en hexadecimal mayúsculas */
async function sha1(str) {
  const buf  = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/* Consulta la API de HaveIBeenPwned enviando solo los 5 primeros caracteres
   del hash SHA-1. La contraseña nunca sale del navegador (k-anonimato) */
document.getElementById('btn-check').addEventListener('click', async () => {
  const pwd = document.getElementById('check-input').value;
  const res = document.getElementById('check-result');
  if (!pwd) return;

  res.className     = '';
  res.style.display = 'block';
  res.textContent   = 'Calculando hash SHA-1 y consultando HIBP…';

  try {
    const hash   = await sha1(pwd);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { headers: { 'Add-Padding': 'true' } }
    );
    const text  = await response.text();
    const match = text.split('\n').find(l => l.startsWith(suffix));
    const count = match ? parseInt(match.split(':')[1]) : 0;

    const hibpUrl = 'https://haveibeenpwned.com/Passwords';

    if (count > 0) {
      res.className = 'pwned';
      res.innerHTML = `
        FILTRADA — Esta contraseña ha aparecido
        <strong>${count.toLocaleString('es')}</strong> veces en filtraciones públicas.<br><br>
        Fuente: <a href="${hibpUrl}" target="_blank" rel="noopener"
          style="color:var(--warn);text-decoration:underline;font-family:'Share Tech Mono',monospace">
          haveibeenpwned.com/Passwords
        </a> (más de 700 millones de contraseñas comprometidas)<br><br>
        <small style="opacity:0.7">
          K-anonimato: solo se envió el prefijo SHA-1 <strong>${prefix}…</strong>
          — tu contraseña nunca salió de tu navegador.
        </small>`;
    } else {
      res.className = 'safe';
      res.innerHTML = `
        NO ENCONTRADA — Esta contraseña no aparece en
        <a href="${hibpUrl}" target="_blank" rel="noopener"
          style="color:var(--neon);text-decoration:underline;font-family:'Share Tech Mono',monospace">
          haveibeenpwned.com/Passwords
        </a>.<br><br>
        <small style="opacity:0.7">
          K-anonimato: solo se envió el prefijo SHA-1 <strong>${prefix}…</strong>
          — tu contraseña nunca salió de tu navegador.
        </small>`;
    }
  } catch (e) {
    res.className = 'pwned';
    res.textContent = `Error al consultar HIBP: ${e.message}. Verifica tu conexión.`;
  }
});

/* Permite verificar pulsando Enter en el campo de contraseña */
document.getElementById('check-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-check').click();
});

/* ═══════════════════════════════════════════════════════════════════════════
   VAULT — AES-GCM 256 bits + PBKDF2 (600 000 iteraciones / SHA-256)
   ═══════════════════════════════════════════════════════════════════════════ */
let vaultKey  = null;
let vaultData = [];

/* Deriva una clave AES-GCM a partir de una contraseña maestra y un salt
   usando PBKDF2 con 600.000 iteraciones para dificultar ataques de fuerza bruta */
async function deriveKey(password, salt) {
  const raw = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/* Cifra los datos con AES-GCM usando un IV aleatorio de 12 bytes
   y devuelve el resultado codificado en base64 (IV + texto cifrado) */
async function encryptData(key, data) {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const ct  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(ct)));
}

/* Descifra un base64 que contiene IV (12 bytes) + texto cifrado AES-GCM */
async function decryptData(key, b64) {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const pt  = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, 12) },
    key,
    raw.slice(12)
  );
  return JSON.parse(new TextDecoder().decode(pt));
}

/* Cifra y persiste el vault en localStorage */
async function saveVault() {
  if (!vaultKey) return;
  localStorage.setItem('vaultData', await encryptData(vaultKey, vaultData));
}

/* Renderiza la lista de entradas del vault.
   Las contraseñas nunca se escriben en el DOM — se pintan en un <canvas>
   para que no sean accesibles desde el inspector del navegador */
function renderVault() {
  const list = document.getElementById('vault-list');
  if (vaultData.length === 0) {
    list.innerHTML = `
      <div class="empty-vault">
        <div class="empty-vault-title">Vault vacío</div>
        <div class="empty-vault-sub">
          Aún no hay entradas guardadas.<br>
          Usa el formulario de arriba para añadir tu primera <span>contraseña cifrada</span>.
        </div>
      </div>`;
    return;
  }

  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

  /* Sustituye cada carácter por uno aleatorio del mismo alfabeto */
  function scramble(str) {
    return str.split('').map(() =>
      SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
    ).join('');
  }

  /* Mapa en memoria que relaciona cada uid con la contraseña real y la mezclada.
     Nunca se escribe en atributos HTML */
  const passMap = new Map();

  /* Dibuja el texto de la contraseña en el canvas.
     Sin revelar: texto mezclado con blur
     Revelado (hover): contraseña real en color neon sin blur */
  function renderPassCanvas(cv, text, revealed) {
    const h = 28;
    /* Mide el texto primero para que el canvas sea exactamente del ancho necesario */
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = '13px "Share Tech Mono", monospace';
    const w = Math.max(measure.measureText(text).width + 8, 60);

    cv.width  = w;
    cv.height = h;
    cv.style.width  = w + 'px';
    cv.style.height = h + 'px';

    const ctx2 = cv.getContext('2d');
    ctx2.clearRect(0, 0, w, h);
    ctx2.font = '13px "Share Tech Mono", monospace';

    if (!revealed) {
      ctx2.filter    = 'blur(3px)';
      ctx2.fillStyle = 'rgba(0,245,196,0.7)';
    } else {
      ctx2.filter    = 'none';
      ctx2.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--neon').trim() || '#00f5c4';
    }
    ctx2.fillText(text, 0, 20);
    ctx2.filter = 'none';
  }

  list.innerHTML = '';
  vaultData.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'vault-item';
    const scrambled = scramble(entry.pass);
    const uid = 'pass-' + i;
    passMap.set(uid, { real: entry.pass, scrambled });

    div.innerHTML = `
      <div class="site">${entry.site}</div>
      <div class="user">${entry.user}</div>
      <div class="pass-canvas-wrap" title="Hover para revelar" data-uid="${uid}">
        <canvas class="pass-canvas"></canvas>
      </div>
      <div class="actions">
        <button class="icon-btn"     data-i="${i}" data-action="copy" title="Copiar">📋</button>
        <button class="icon-btn del" data-i="${i}" data-action="del"  title="Eliminar">✕</button>
      </div>`;
    list.appendChild(div);
  });

  /* Render inicial con texto mezclado y eventos hover para revelar / ocultar */
  list.querySelectorAll('.pass-canvas-wrap').forEach(wrap => {
    const uid  = wrap.dataset.uid;
    const cv   = wrap.querySelector('.pass-canvas');
    const data = passMap.get(uid);

    /* Primer render: texto mezclado con blur */
    requestAnimationFrame(() => renderPassCanvas(cv, data.scrambled, false));

    wrap.addEventListener('mouseenter', () => renderPassCanvas(cv, data.real,      true));
    wrap.addEventListener('mouseleave', () => renderPassCanvas(cv, data.scrambled, false));
  });

  /* Botones de copiar y eliminar de cada entrada */
  list.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const i = parseInt(btn.dataset.i);
      if (btn.dataset.action === 'copy') {
        navigator.clipboard.writeText(vaultData[i].pass)
          .then(() => toast('Contraseña copiada'));
      } else {
        confirmDelete(i);
      }
    });
  });
}

/* Botón "Desbloquear Vault": autentica con Windows Hello / TouchID (WebAuthn)
   y descifra los datos almacenados en localStorage */
document.getElementById('btn-unlock').addEventListener('click', async () => {
  try {
    /* Integración con el autenticador de plataforma (Windows Hello / TouchID) */
    if (window.PublicKeyCredential) {
      let credIdBase64 = localStorage.getItem('helloCredId');
      if (!credIdBase64) {
        toast('Configurando seguridad del sistema por primera vez...', 4000);
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: "MousePass Vault" },
            user: {
              id: crypto.getRandomValues(new Uint8Array(16)),
              name: "usuario-local",
              displayName: "Usuario Bóveda"
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },   // ES256
              { type: "public-key", alg: -257 }  // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform", // Obliga a usar Windows Hello / TouchID
              userVerification: "required"         // Obliga a pedir el PIN / biometría
            },
            timeout: 60000
          }
        });
        localStorage.setItem('helloCredId', btoa(String.fromCharCode(...new Uint8Array(cred.rawId))));
      } else {
        const credId = Uint8Array.from(atob(credIdBase64), c => c.charCodeAt(0));
        await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ type: "public-key", id: credId }],
            userVerification: "required",
            timeout: 60000
          }
        });
      }
    }

    /* Clave interna aleatoria guardada en localStorage que actúa como contraseña maestra.
       Nunca se muestra al usuario y se protege mediante la autenticación de plataforma */
    let internalMasterKey = localStorage.getItem('internalVaultKey');
    if (!internalMasterKey) {
      const randomKeyBytes = crypto.getRandomValues(new Uint8Array(32));
      internalMasterKey = btoa(String.fromCharCode(...randomKeyBytes));
      localStorage.setItem('internalVaultKey', internalMasterKey);
    }

    /* Salt único por dispositivo para la derivación PBKDF2 */
    let saltRaw = localStorage.getItem('vaultSalt');
    let salt;
    if (!saltRaw) {
      salt = crypto.getRandomValues(new Uint8Array(16));
      localStorage.setItem('vaultSalt', btoa(String.fromCharCode(...salt)));
    } else {
      salt = Uint8Array.from(atob(saltRaw), c => c.charCodeAt(0));
    }

    /* Deriva la clave de cifrado a partir de la clave interna invisible */
    vaultKey = await deriveKey(internalMasterKey, salt);

    const stored = localStorage.getItem('vaultData');
    if (stored) {
      try { 
        vaultData = await decryptData(vaultKey, stored); 
      } catch { 
        toast('Error al descifrar los datos de la bóveda', 3000); 
        vaultKey = null; 
        return; 
      }
    } else {
      vaultData = [];
    }

    document.getElementById('vault-locked-msg').style.display = 'none';
    document.getElementById('vault-content').style.display    = 'block';
    document.getElementById('btn-unlock').style.display       = 'none';
    document.getElementById('btn-lock').style.display         = 'inline-flex';
    document.getElementById('add-form').classList.add('visible');
    renderVault();
    toast('Vault desbloqueado');
  } catch (e) {
    if (e.name === "NotAllowedError" || e.name === "AbortError") {
      toast('Validación de seguridad cancelada o denegada', 3000);
    } else {
      toast('Error: ' + e.message, 3000);
    }
  }
});

/* Botón "Bloquear Vault": borra la clave y los datos de memoria */
document.getElementById('btn-lock').addEventListener('click', () => {
  vaultKey = null; vaultData = [];
  document.getElementById('vault-locked-msg').style.display = 'block';
  document.getElementById('vault-content').style.display    = 'none';
  document.getElementById('btn-unlock').style.display       = 'inline-flex';
  document.getElementById('btn-lock').style.display         = 'none';
  document.getElementById('add-form').classList.remove('visible');
  toast('Vault bloqueado');
});

/* Añade una nueva entrada al vault, la cifra y vuelve a renderizar la lista */
document.getElementById('btn-add-entry').addEventListener('click', async () => {
  const site = document.getElementById('f-site').value.trim();
  const user = document.getElementById('f-user').value.trim();
  const pass = document.getElementById('f-pass').value;
  if (!site || !pass) return toast('Sitio y contraseña son obligatorios');

  vaultData.push({ site, user, pass, added: Date.now() });
  await saveVault();
  renderVault();
  document.getElementById('f-site').value = '';
  document.getElementById('f-user').value = '';
  document.getElementById('f-pass').value = '';
  toast('Entrada guardada y cifrada');
});

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
   Pregunta al usuario antes de borrar una entrada del vault de forma irreversible
   ═══════════════════════════════════════════════════════════════════════════ */
let pendingDeleteIndex = null;

const confirmOverlay = document.getElementById('confirm-overlay');

/* Muestra el overlay con fondo semitransparente y el modal centrado */
function showConfirm() {
  confirmOverlay.style.display = 'flex';
}

/* Oculta el modal y limpia el índice pendiente de borrado */
function hideConfirm() {
  confirmOverlay.style.display = 'none';
  pendingDeleteIndex = null;
}

/* Abre el modal mostrando el nombre del sitio que se va a eliminar */
function confirmDelete(i) {
  pendingDeleteIndex = i;
  document.getElementById('confirm-site').textContent = vaultData[i].site || 'esta entrada';
  showConfirm();
}

/* Botón "Eliminar": confirma el borrado, guarda y re-renderiza */
document.getElementById('confirm-yes').addEventListener('click', async () => {
  if (pendingDeleteIndex === null) return;
  hideConfirm();
  vaultData.splice(pendingDeleteIndex, 1);
  await saveVault();
  renderVault();
  toast('Entrada eliminada');
});

/* Botón "Cancelar": cierra el modal sin hacer nada */
document.getElementById('confirm-no').addEventListener('click', () => hideConfirm());

/* Cierra el modal al hacer clic fuera del recuadro */
confirmOverlay.addEventListener('click', e => {
  if (e.target === confirmOverlay) hideConfirm();
});

/* Cierra el modal al pulsar Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && confirmOverlay.style.display === 'flex') hideConfirm();
});