/* ============================================================
   auth.js — Autenticación con Supabase
   Maneja: registro, login, logout y protección de páginas
   ============================================================ */

const SUPABASE_URL = 'https://pidjkietkwddeqxpvonv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_khALbTOTOfNwZJGOi8AiGg_qOikqQW7';

/* Cabeceras base — sin token de usuario */
const HEADERS_BASE = {
  'apikey':       SUPABASE_KEY,
  'Content-Type': 'application/json',
};

/* Cabeceras con token de usuario autenticado
   Se construyen dinámicamente con el token real */
function headersConToken(token) {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
}

/* Modo actual del formulario: 'login' o 'registro' */
let modoActual = 'login';

/* ============================================================
   FUNCIONES DEL FORMULARIO
   ============================================================ */

/* ── cambiarModo(modo) ────────────────────────────────────────
   Muestra u oculta el campo nombre según el modo.
─────────────────────────────────────────────────────────────── */
function cambiarModo(modo) {
  modoActual = modo;
  const esRegistro = modo === 'registro';

  document.getElementById('campo-nombre').style.display = esRegistro ? 'flex' : 'none';
  document.getElementById('btn-submit').textContent     = esRegistro ? 'Crear cuenta' : 'Iniciar sesión';

  document.getElementById('btn-modo-login').classList.toggle('activo',    modo === 'login');
  document.getElementById('btn-modo-registro').classList.toggle('activo', modo === 'registro');

  ocultarMensajes();
}

/* ── submitFormulario() ───────────────────────────────────────
   Valida campos y llama a registrar() o iniciarSesion()
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
   Paso 1: crear usuario en Supabase Auth
   Paso 2: iniciar sesión automáticamente para obtener token real
   Paso 3: con el token real, guardar nombre en tabla usuarios
   Paso 4: guardar sesión y redirigir a inicio.html
─────────────────────────────────────────────────────────────── */
async function registrar(nombre, email, password) {
  setCargando(true);

  try {
    /* Paso 1 — Crear usuario en Supabase Auth */
    const resSignup = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:  'POST',
      headers: HEADERS_BASE,
      body:    JSON.stringify({ email, password }),
    });

    const dataSignup = await resSignup.json();

    /* Si el correo ya existe u otro error */
    if (dataSignup.error) {
      mostrarError(traducirError(dataSignup.error.message));
      return;
    }

    /* Paso 2 — Iniciar sesión automáticamente para obtener token real */
    const resLogin = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: HEADERS_BASE,
      body:    JSON.stringify({ email, password }),
    });

    const dataLogin = await resLogin.json();

    if (dataLogin.error) {
      /* El usuario se creó pero no pudimos iniciar sesión
         Pedimos que lo haga manualmente */
      mostrarExito('¡Cuenta creada! Ahora inicia sesión.');
      cambiarModo('login');
      return;
    }

    const token      = dataLogin.access_token;
    const usuarioId  = dataLogin.user.id;

    /* Paso 3 — Guardar nombre en tabla usuarios con token real */
    await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
      method:  'POST',
      headers: headersConToken(token),
      body:    JSON.stringify({ id: usuarioId, nombre, email }),
    });

    /* Paso 4 — Guardar sesión y redirigir */
    localStorage.setItem('sb_token',      token);
    localStorage.setItem('sb_usuario_id', usuarioId);
    localStorage.setItem('sb_email',      email);
    localStorage.setItem('sb_nombre',     nombre);

    window.location.href = 'inicio.html';

  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
    console.error(err);
  } finally {
    setCargando(false);
  }
}

/* ── iniciarSesion(email, password) ──────────────────────────
   Autentica con Supabase, guarda sesión y redirige a inicio.html
─────────────────────────────────────────────────────────────── */
async function iniciarSesion(email, password) {
  setCargando(true);

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: HEADERS_BASE,
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.error) {
      mostrarError(traducirError(data.error_description || data.error));
      return;
    }

    /* Guardar sesión completa en localStorage */
    localStorage.setItem('sb_token',      data.access_token);
    localStorage.setItem('sb_usuario_id', data.user.id);
    localStorage.setItem('sb_email',      data.user.email);

    /* Obtener el nombre desde la tabla usuarios */
    const resUsuario = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${data.user.id}&select=nombre`,
      { headers: headersConToken(data.access_token) }
    );
    const [usuario] = await resUsuario.json();
    if (usuario?.nombre) {
      localStorage.setItem('sb_nombre', usuario.nombre);
    }

    window.location.href = 'inicio.html';

  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
    console.error(err);
  } finally {
    setCargando(false);
  }
}

/* ── cerrarSesion() ───────────────────────────────────────────
   Limpia localStorage y manda al login
─────────────────────────────────────────────────────────────── */
function cerrarSesion() {
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_usuario_id');
  localStorage.removeItem('sb_email');
  localStorage.removeItem('sb_nombre');
  window.location.href = 'index.html';
}

/* ── protegerPagina() ─────────────────────────────────────────
   Si no hay token manda al login.
   Va al inicio de inicio.html, simulador.html, ejercicios.html
─────────────────────────────────────────────────────────────── */
function protegerPagina() {
  const token = localStorage.getItem('sb_token');
  if (!token) window.location.href = 'index.html';
}

/* ── obtenerUsuarioActual() ───────────────────────────────────
   Retorna los datos del usuario logueado.
   db.js la usa para guardar ejercicios con el usuario correcto.
─────────────────────────────────────────────────────────────── */
function obtenerUsuarioActual() {
  return {
    id:     localStorage.getItem('sb_usuario_id'),
    email:  localStorage.getItem('sb_email'),
    nombre: localStorage.getItem('sb_nombre'),
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