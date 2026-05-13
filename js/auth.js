/* ============================================================
   auth.js — Autenticación con Supabase
   Maneja: registro, login, logout y protección de páginas
   Se carga en: index.html (login), inicio.html, simulador.html,
                ejercicios.html
   ============================================================ */

const SUPABASE_URL = 'https://pidjkietkwddeqxpvonv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_khALbTOTOfNwZJGOi8AiGg_qOikqQW7';

const HEADERS = {
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json',
};

/* Modo actual del formulario: 'login' o 'registro' */
let modoActual = 'login';

/* ============================================================
   FUNCIONES DEL FORMULARIO
   ============================================================ */

/* ── cambiarModo(modo) ────────────────────────────────────────
   Muestra u oculta el campo nombre según el modo.
   Cambia el texto del botón y el toggle activo.
─────────────────────────────────────────────────────────────── */
function cambiarModo(modo) {
  modoActual = modo;

  const esRegistro = modo === 'registro';

  /* Solo el nombre es exclusivo del registro */
  document.getElementById('campo-nombre').style.display = esRegistro ? 'flex' : 'none';

  /* Texto del botón */
  document.getElementById('btn-submit').textContent = esRegistro
    ? 'Crear cuenta'
    : 'Iniciar sesión';

  /* Toggle visual */
  document.getElementById('btn-modo-login').classList.toggle('activo',    modo === 'login');
  document.getElementById('btn-modo-registro').classList.toggle('activo', modo === 'registro');

  ocultarMensajes();
}

/* ── submitFormulario() ───────────────────────────────────────
   Valida los campos y llama a registrar() o iniciarSesion()
─────────────────────────────────────────────────────────────── */
async function submitFormulario() {
  const email    = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value.trim();

  if (!email || !password) {
    mostrarError('Por favor completa todos los campos.');
    return;
  }

  if (modoActual === 'registro') {
    const nombre = document.getElementById('input-nombre').value.trim();

    if (!nombre) {
      mostrarError('Por favor escribe tu nombre completo.');
      return;
    }

    await registrar(nombre, email, password);

  } else {
    await iniciarSesion(email, password);
  }
}

/* ============================================================
   FUNCIONES DE AUTENTICACIÓN
   ============================================================ */

/* ── registrar(nombre, email, password) ───────────────────────
   Paso 1: crea el usuario en Supabase Auth
   Paso 2: guarda nombre en la tabla usuarios
   Paso 3: muestra éxito y cambia a modo login
─────────────────────────────────────────────────────────────── */
async function registrar(nombre, email, password) {
  setCargando(true);

  try {
    /* Paso 1 — Crear usuario en Supabase Auth */
    const resAuth = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:  'POST',
      headers: HEADERS,
      body:    JSON.stringify({ email, password }),
    });

    const dataAuth = await resAuth.json();

    if (dataAuth.error) {
      mostrarError(traducirError(dataAuth.error.message));
      return;
    }

    const usuarioId = dataAuth.user?.id;

    /* Paso 2 — Guardar nombre en la tabla usuarios */
    if (usuarioId) {
      await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
        method:  'POST',
        headers: { ...HEADERS, 'Prefer': 'return=minimal' },
        body:    JSON.stringify({ id: usuarioId, nombre, email }),
      });
    }

    /* Paso 3 — Éxito */
    mostrarExito('¡Cuenta creada! Ahora inicia sesión.');
    cambiarModo('login');

  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
  } finally {
    setCargando(false);
  }
}

/* ── iniciarSesion(email, password) ──────────────────────────
   Autentica con Supabase, guarda sesión en localStorage
   y redirige a inicio.html
─────────────────────────────────────────────────────────────── */
async function iniciarSesion(email, password) {
  setCargando(true);

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: HEADERS,
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.error) {
      mostrarError(traducirError(data.error_description || data.error));
      return;
    }

    /* Guardar sesión en localStorage */
    localStorage.setItem('sb_token',      data.access_token);
    localStorage.setItem('sb_usuario_id', data.user.id);
    localStorage.setItem('sb_email',      data.user.email);

    /* Redirigir a la página de las cards */
    window.location.href = 'inicio.html';

  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
  } finally {
    setCargando(false);
  }
}

/* ── cerrarSesion() ───────────────────────────────────────────
   Limpia localStorage y manda al login.
   Se llama desde el botón cerrar sesión en inicio.html
─────────────────────────────────────────────────────────────── */
function cerrarSesion() {
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_usuario_id');
  localStorage.removeItem('sb_email');
  window.location.href = 'index.html';
}

/* ── protegerPagina() ─────────────────────────────────────────
   Si no hay token en localStorage manda al login.
   Se llama al inicio de inicio.html, simulador.html, ejercicios.html
─────────────────────────────────────────────────────────────── */
function protegerPagina() {
  const token = localStorage.getItem('sb_token');
  if (!token) window.location.href = 'index.html';
}

/* ── obtenerUsuarioActual() ───────────────────────────────────
   Retorna id y email del usuario logueado.
   db.js la usa para guardar ejercicios con el usuario correcto.
─────────────────────────────────────────────────────────────── */
function obtenerUsuarioActual() {
  return {
    id:    localStorage.getItem('sb_usuario_id'),
    email: localStorage.getItem('sb_email'),
  };
}

/* ============================================================
   FUNCIONES DE APOYO (UI)
   ============================================================ */

function mostrarError(mensaje) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = mensaje;
  el.classList.add('visible');
  document.getElementById('login-exito')?.classList.remove('visible');
}

function mostrarExito(mensaje) {
  const el = document.getElementById('login-exito');
  if (!el) return;
  el.textContent = mensaje;
  el.classList.add('visible');
  document.getElementById('login-error')?.classList.remove('visible');
}

function ocultarMensajes() {
  document.getElementById('login-error')?.classList.remove('visible');
  document.getElementById('login-exito')?.classList.remove('visible');
}

function setCargando(activo) {
  const btn = document.getElementById('btn-submit');
  if (!btn) return;
  btn.classList.toggle('cargando', activo);
  btn.textContent = activo
    ? 'Cargando...'
    : (modoActual === 'registro' ? 'Crear cuenta' : 'Iniciar sesión');
}

/* Traduce errores de inglés de Supabase a español */
function traducirError(msg) {
  if (!msg) return 'Ocurrió un error. Intenta de nuevo.';
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Este correo ya tiene una cuenta registrada.';
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong'))
    return 'Correo o contraseña incorrectos.';
  if (m.includes('password') && m.includes('6'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('email'))
    return 'El correo electrónico no es válido.';
  return 'Ocurrió un error. Intenta de nuevo.';
}