/* ============================================================
   auth.js — Autenticación con Supabase
   Maneja: registro, login, logout y protección de páginas
   Se carga en: index.html (login), inicio.html, simulador.html,
                ejercicios.html
   ============================================================ */

/* ── Credenciales de Supabase ─────────────────────────────────
   URL: dirección de tu proyecto en Supabase
   KEY: clave pública (anon key), es segura en el frontend
─────────────────────────────────────────────────────────────── */
const SUPABASE_URL = 'https://pidjkietkwddeqxpvonv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_khALbTOTOfNwZJGOi8AiGg_qOikqQW7';

/* Cabeceras que van en cada petición a la API de Supabase */
const HEADERS = {
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json',
};

/* ── Modo actual del formulario ───────────────────────────────
   'login' o 'registro' — cambia con el toggle
─────────────────────────────────────────────────────────────── */
let modoActual = 'login';

/* ============================================================
   FUNCIONES DEL FORMULARIO (llamadas desde login.html)
   ============================================================ */

/* ── cambiarModo(modo) ────────────────────────────────────────
   Muestra u oculta los campos de nombre y código según el modo.
   Cambia el texto del botón y el toggle activo.
─────────────────────────────────────────────────────────────── */
function cambiarModo(modo) {
  modoActual = modo;

  /* Campos exclusivos del registro */
  const campoNombre = document.getElementById('campo-nombre');
  const campoCodigo = document.getElementById('campo-codigo');
  const esRegistro  = modo === 'registro';

  campoNombre.style.display = esRegistro ? 'flex' : 'none';
  campoCodigo.style.display = esRegistro ? 'flex' : 'none';

  /* Texto del botón principal */
  document.getElementById('btn-submit').textContent = esRegistro
    ? 'Crear cuenta'
    : 'Iniciar sesión';

  /* Toggle visual: marcar el botón activo */
  document.getElementById('btn-modo-login').classList.toggle('activo',    modo === 'login');
  document.getElementById('btn-modo-registro').classList.toggle('activo', modo === 'registro');

  /* Limpiar mensajes anteriores al cambiar de modo */
  ocultarMensajes();
}

/* ── submitFormulario() ───────────────────────────────────────
   Decide si llamar a registrar() o iniciarSesion()
   según el modo activo. Valida que los campos no estén vacíos.
─────────────────────────────────────────────────────────────── */
async function submitFormulario() {
  const email    = document.getElementById('input-email').value.trim();
  const password = document.getElementById('input-password').value.trim();

  /* Validación básica: campos obligatorios */
  if (!email || !password) {
    mostrarError('Por favor completa todos los campos.');
    return;
  }

  if (modoActual === 'registro') {
    const nombre = document.getElementById('input-nombre').value.trim();
    const codigo = document.getElementById('input-codigo').value.trim();

    if (!nombre || !codigo) {
      mostrarError('Por favor completa tu nombre y código estudiantil.');
      return;
    }

    await registrar(nombre, codigo, email, password);

  } else {
    await iniciarSesion(email, password);
  }
}

/* ============================================================
   FUNCIONES DE AUTENTICACIÓN
   ============================================================ */

/* ── registrar(nombre, codigo, email, password) ───────────────
   Paso 1: crea el usuario en Supabase Auth
   Paso 2: guarda nombre y código en la tabla usuarios
   Paso 3: muestra mensaje de éxito y cambia al modo login
─────────────────────────────────────────────────────────────── */
async function registrar(nombre, codigo, email, password) {
  setCargando(true);

  try {
    /* Paso 1 — Crear usuario en Supabase Auth */
    const resAuth = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:  'POST',
      headers: HEADERS,
      body:    JSON.stringify({ email, password }),
    });

    const dataAuth = await resAuth.json();

    /* Si Supabase devuelve error (ej: email ya existe) */
    if (dataAuth.error) {
      mostrarError(traducirError(dataAuth.error.message));
      return;
    }

    /* El id del usuario recién creado */
    const usuarioId = dataAuth.user?.id;

    /* Paso 2 — Guardar nombre y código en la tabla usuarios */
    if (usuarioId) {
      await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
        method:  'POST',
        headers: HEADERS,
        body:    JSON.stringify({ id: usuarioId, nombre, codigo, email }),
      });
    }

    /* Paso 3 — Éxito: pedir que inicie sesión */
    mostrarExito('¡Cuenta creada! Ahora inicia sesión.');
    cambiarModo('login');

  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
  } finally {
    setCargando(false);
  }
}

/* ── iniciarSesion(email, password) ──────────────────────────
   Autentica al usuario con Supabase Auth.
   Si es correcto, guarda la sesión en localStorage
   y redirige a inicio.html.
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

    /* Si las credenciales son incorrectas */
    if (data.error) {
      mostrarError(traducirError(data.error_description || data.error));
      return;
    }

    /* Guardar sesión en localStorage para proteger las otras páginas */
    localStorage.setItem('sb_token',      data.access_token);
    localStorage.setItem('sb_usuario_id', data.user.id);
    localStorage.setItem('sb_email',      data.user.email);

    /* Redirigir a la página principal (las dos cards) */
    window.location.href = 'inicio.html';

  } catch (err) {
    mostrarError('Error de conexión. Verifica tu internet.');
  } finally {
    setCargando(false);
  }
}

/* ── cerrarSesion() ───────────────────────────────────────────
   Elimina la sesión del localStorage y manda al login.
   Se llama desde el botón "Cerrar sesión" en inicio.html.
─────────────────────────────────────────────────────────────── */
function cerrarSesion() {
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_usuario_id');
  localStorage.removeItem('sb_email');
  window.location.href = 'index.html'; // index.html = el login
}

/* ── protegerPagina() ─────────────────────────────────────────
   Verifica si hay una sesión activa.
   Si no hay token en localStorage, manda al login.
   Se llama al inicio de inicio.html, simulador.html y ejercicios.html
─────────────────────────────────────────────────────────────── */
function protegerPagina() {
  const token = localStorage.getItem('sb_token');
  if (!token) {
    window.location.href = 'index.html'; // manda al login
  }
}

/* ── obtenerUsuarioActual() ───────────────────────────────────
   Retorna el id y email del usuario logueado.
   db.js la usa para saber a quién le guarda los ejercicios.
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

/* Muestra un mensaje de error en el formulario */
function mostrarError(mensaje) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = mensaje;
  el.classList.add('visible');
  document.getElementById('login-exito')?.classList.remove('visible');
}

/* Muestra un mensaje de éxito en el formulario */
function mostrarExito(mensaje) {
  const el = document.getElementById('login-exito');
  if (!el) return;
  el.textContent = mensaje;
  el.classList.add('visible');
  document.getElementById('login-error')?.classList.remove('visible');
}

/* Oculta ambos mensajes */
function ocultarMensajes() {
  document.getElementById('login-error')?.classList.remove('visible');
  document.getElementById('login-exito')?.classList.remove('visible');
}

/* Deshabilita el botón mientras espera respuesta de Supabase */
function setCargando(activo) {
  const btn = document.getElementById('btn-submit');
  if (!btn) return;
  btn.classList.toggle('cargando', activo);
  btn.textContent = activo
    ? 'Cargando...'
    : (modoActual === 'registro' ? 'Crear cuenta' : 'Iniciar sesión');
}

/* ── traducirError(msg) ───────────────────────────────────────
   Convierte los mensajes de error en inglés de Supabase
   a mensajes claros en español.
─────────────────────────────────────────────────────────────── */
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