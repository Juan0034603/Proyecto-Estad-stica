/* ============================================================
   db.js — Comunicación con Supabase
   Maneja: guardar y leer ejercicios respondidos
   Depende de: auth.js (para obtener el token y usuario_id)
   ============================================================ */

const SUPABASE_URL_DB = 'https://pidjkietkwddeqxpvonv.supabase.co';
const SUPABASE_KEY_DB = 'sb_publishable_khALbTOTOfNwZJGOi8AiGg_qOikqQW7';

/* Cabeceras con el token del usuario autenticado
   El token viene de auth.js guardado en localStorage */
function headersDB() {
  const token = localStorage.getItem('sb_token');
  return {
    'apikey':        SUPABASE_KEY_DB,
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
}

/* ── guardarEjercicioDB(tema, correcto) ───────────────────────
   Inserta un ejercicio respondido en Supabase.
   Antes verifica el límite de 50 registros por usuario:
   si se supera, borra el más antiguo antes de insertar.
─────────────────────────────────────────────────────────────── */
async function guardarEjercicioDB(tema, correcto) {
  const usuario = obtenerUsuarioActual(); // viene de auth.js
  if (!usuario.id) return;               // si no hay sesión, no guardar

  try {
    /* Contar cuántos registros tiene este usuario */
    const resConteo = await fetch(
      `${SUPABASE_URL_DB}/rest/v1/ejercicios_respondidos?usuario_id=eq.${usuario.id}&select=id`,
      { headers: headersDB() }
    );
    const registros = await resConteo.json();

    /* Si ya tiene 50, borrar el más antiguo antes de insertar */
    if (registros.length >= 50) {
      const resMasAntiguo = await fetch(
        `${SUPABASE_URL_DB}/rest/v1/ejercicios_respondidos?usuario_id=eq.${usuario.id}&order=fecha.asc&limit=1&select=id`,
        { headers: headersDB() }
      );
      const [masAntiguo] = await resMasAntiguo.json();
      if (masAntiguo) {
        await fetch(
          `${SUPABASE_URL_DB}/rest/v1/ejercicios_respondidos?id=eq.${masAntiguo.id}`,
          { method: 'DELETE', headers: headersDB() }
        );
      }
    }

    /* Insertar el nuevo ejercicio */
    await fetch(`${SUPABASE_URL_DB}/rest/v1/ejercicios_respondidos`, {
      method:  'POST',
      headers: headersDB(),
      body:    JSON.stringify({
        usuario_id: usuario.id,
        tema,
        correcto,
        fecha: new Date().toISOString(),
      }),
    });

  } catch (err) {
    console.error('Error guardando ejercicio:', err);
  }
}

/* ── obtenerMisEjerciciosDB() ─────────────────────────────────
   Retorna los últimos 50 ejercicios del usuario actual,
   ordenados del más reciente al más antiguo.
─────────────────────────────────────────────────────────────── */
async function obtenerMisEjerciciosDB() {
  const usuario = obtenerUsuarioActual(); // viene de auth.js
  if (!usuario.id) return [];

  try {
    const res = await fetch(
      `${SUPABASE_URL_DB}/rest/v1/ejercicios_respondidos?usuario_id=eq.${usuario.id}&order=fecha.desc&limit=50`,
      { headers: headersDB() }
    );
    return await res.json();
  } catch (err) {
    console.error('Error leyendo ejercicios:', err);
    return [];
  }
}

/* ── obtenerTodosLosEjerciciosDB() ───────────────────────────
   Retorna TODOS los ejercicios de todos los usuarios.
   Solo se usa en la página de análisis grupal del profesor.
─────────────────────────────────────────────────────────────── */
async function obtenerTodosLosEjerciciosDB() {
  try {
    const res = await fetch(
      `${SUPABASE_URL_DB}/rest/v1/ejercicios_respondidos?order=fecha.desc`,
      { headers: headersDB() }
    );
    return await res.json();
  } catch (err) {
    console.error('Error leyendo todos los ejercicios:', err);
    return [];
  }
}