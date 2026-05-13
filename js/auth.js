/* ============================================================
   auth.js — Autenticación con Supabase
   ============================================================ */

const SUPABASE_URL = 'https://pidjkietkwddeqxpvonv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_khALbTOTOfNwZJGOi8AiGg_qOikqQW7';

const HEADERS_BASE = {
  'apikey':       SUPABASE_KEY,
  'Content-Type': 'application/json',
};

function headersConToken(token) {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
}

/* Detecta si estamos dentro de html/ o en la raíz */
const EN_SUBCARPETA = window.location.pathname.includes('/html/');
const RUTA_INICIO   = EN_SUBCARPETA ? '../html/inicio.html' : 'html/inicio.html';
const RUTA_LOGIN    = EN_SUBCARPETA ? '../index.html'       : 'index.html';

let modoActual = 'login';

/* ============================================================
   FORMULARIO
   ============================================================ */

function cambiarModo(modo) {
  modoActual = modo;
  const esRegistro = modo === 'registro';

  document.getElementById('campo-nombre').style.display = esRegistro ? 'flex' : 'none';
  document.getElementById('btn-submit').textContent     = esRegistro ? 'Crear cuenta' : 'Iniciar sesión';

  document.getElementById('btn-modo-login').classList.toggle('activo',    modo === 'login');
  document.getElementById('btn-modo-registro').classList.toggle('activo', modo === 'registro');

  ocultarMensajes();
  limpiarCampos();
}

async function submitFormulario() {
  const email    = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value.trim();

  if (!email || !password) {
    mostrarError('Por favor completa todos los campos.');
    return;
  }

  if (modoActual === 'registro') {
    const nombre = document.getElementById('input-nombre').value.trim();
    if (!nombre) { mostrarError('Por favor escribe tu nombre completo.'); return; }
    await registrar(nombre, email, password);
  } else {
    await iniciarSesion(email, password);
  }
}

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */

async function registrar(nombre, email, password) {
  setCargando(true);
  try {
    /* 1 — Crear usuario en Supabase Auth */
    const resSignup = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:  'POST',
      headers: HEADERS_BASE,
      body:    JSON.stringify({ email, password }),
    });
    const dataSignup = await resSignup.json();

    if (!resSignup.ok || dataSignup.error) {
      mostrarError(traducirError(dataSignup.error?.message || dataSignup.error));
      return;
    }

    /* 2 — Login automático para obtener token real */
    const resLogin = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: HEADERS_BASE,
      body:    JSON.stringify({ email, password }),
    });
    const dataLogin = await resLogin.json();

    if (!resLogin.ok || dataLogin.error) {
      mostrarExito('¡Cuenta creada! Ahora inicia sesión.');
      cambiarModo('login');
      return;
    }

    const token     = dataLogin.access_token;
    const usuarioId = dataLogin.user.id;

    /* 3 — Guardar datos en tabla usuarios */
    await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
      method:  'POST',
      headers: headersConToken(token),
      body:    JSON.stringify({ id: usuarioId, nombre, email }),
    });

    /* 4 — Guardar sesión */
    guardarSesion({ token, usuarioId, email, nombre });

    /* 5 — Limpiar y redirigir */
    limpiarCampos();
    window.location.href = RUTA_INICIO;

  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
    console.error(err);
  } finally {
    setCargando(false);
  }
}

async function iniciarSesion(email, password) {
  setCargando(true);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: HEADERS_BASE,
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    /* Verificar error ANTES de tocar data.user */
    if (!res.ok || data.error) {
      mostrarError(traducirError(data.error_description || data.error?.message || data.error));
      return;
    }

    /* Obtener nombre desde tabla usuarios */
    const resUsuario = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${data.user.id}&select=nombre`,
      { headers: headersConToken(data.access_token) }
    );
    const [usuario] = await resUsuario.json();

    guardarSesion({
      token:     data.access_token,
      usuarioId: data.user.id,
      email:     data.user.email,
      nombre:    usuario?.nombre ?? '',
    });

    limpiarCampos();
    window.location.href = RUTA_INICIO;

  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
    console.error(err);
  } finally {
    setCargando(false);
  }
}

function cerrarSesion() {
  ['sb_token','sb_usuario_id','sb_email','sb_nombre'].forEach(k => localStorage.removeItem(k));
  window.location.href = RUTA_LOGIN;
}

function protegerPagina() {
  if (!localStorage.getItem('sb_token')) window.location.href = RUTA_LOGIN;
}

function obtenerUsuarioActual() {
  return {
    id:     localStorage.getItem('sb_usuario_id'),
    email:  localStorage.getItem('sb_email'),
    nombre: localStorage.getItem('sb_nombre'),
  };
}

/* ============================================================
   HELPERS INTERNOS
   ============================================================ */

function guardarSesion({ token, usuarioId, email, nombre }) {
  localStorage.setItem('sb_token',      token);
  localStorage.setItem('sb_usuario_id', usuarioId);
  localStorage.setItem('sb_email',      email);
  localStorage.setItem('sb_nombre',     nombre);
}

function limpiarCampos() {
  ['input-nombre','input-email','input-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/* ── UI ───────────────────────────────────────────────────── */

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
  btn.disabled    = activo;
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