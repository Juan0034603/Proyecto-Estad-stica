/* ── Estado actual del simulador ─────────────────────────────
   Un solo objeto con todos los parámetros. Cuando el usuario
   mueve un slider o elige una pill, actualizamos este objeto
   y llamamos a actualizar(). Todo parte de aquí.
─────────────────────────────────────────────────────────────── */
let estado = {
  mu0:   100,        // media hipotética (H₀)
  xbar:  104,        // media muestral observada
  sigma:  15,        // desviación estándar poblacional
  n:      36,        // tamaño de muestra
  alpha: 0.05,       // nivel de significancia
  tail:  'bilateral' // tipo de prueba
};

/* ── Configuración de cada slider ────────────────────────────
   En vez de escribir un addEventListener por cada slider,
   describimos los 4 sliders en un arreglo y los recorremos
   con un loop. Cada objeto conecta:
     - key:      la propiedad en `estado` que controla
     - sliderId: el id del <input type="range"> en el HTML
     - labelId:  el id del <span> que muestra el valor en vivo
─────────────────────────────────────────────────────────────── */
const SLIDERS = [
  { key: 'mu0',   sliderId: 'sl-mu0',   labelId: 'v-mu0'   },
  { key: 'xbar',  sliderId: 'sl-xbar',  labelId: 'v-xbar'  },
  { key: 'sigma', sliderId: 'sl-sigma', labelId: 'v-sigma' },
  { key: 'n',     sliderId: 'sl-n',     labelId: 'v-n'     },
];

/* Recorremos el arreglo y configuramos cada slider de una vez */
SLIDERS.forEach(({ key, sliderId, labelId }) => {
  const slider = document.getElementById(sliderId); /* busca en html*/
  const label  = document.getElementById(labelId);

  /* Poner el valor inicial del HTML igual al estado */
  slider.value      = estado[key];
  label.textContent = estado[key];

  /* Cada vez que el usuario mueve el slider:
     1. Actualiza el estado  2. Muestra el número  3. Recalcula */
  slider.addEventListener('input', () => {
    estado[key]       = +slider.value; // + convierte string → número
    label.textContent = slider.value;
    actualizar();
  });
});

/* ── Pills: alpha y tipo de prueba ───────────────────────────
   Mismo patrón: un loop para los dos grupos de pills.
   Cada grupo tiene un selector CSS y la propiedad del estado
   que modifica.
─────────────────────────────────────────────────────────────── */
const PILLS = [
  { selector: '.pill-alpha', key: 'alpha', parse: parseFloat }, /* todos con clase . pill**/
  { selector: '.pill-tail',  key: 'tail',  parse: String     },
];

PILLS.forEach(({ selector, key, parse }) => {
  document.querySelectorAll(selector).forEach(pill => {
    pill.addEventListener('click', () => {

      /* Quitar la clase activo de todas las pills del grupo */
      document.querySelectorAll(selector).forEach(p => p.classList.remove('activo')); 

      /* Marcar solo la que se clickeó */
      pill.classList.add('activo');

      /* Guardar el valor en el estado y recalcular */
      estado[key] = parse(pill.dataset.val);
      actualizar();
    });
  });
});

/* ── actualizar() — el corazón del simulador ─────────────────
   Lee el estado, hace todos los cálculos estadísticos,
   actualiza los números en pantalla, cambia el veredicto
   y redibuja la curva. Se llama cada vez que algo cambia.
─────────────────────────────────────────────────────────────── */
function actualizar() {
  const { mu0, xbar, sigma, n, alpha, tail } = estado;
  const E = window.Estadistica; // alias corto para no repetir

  /* Cálculos estadísticos */
  const z    = E.calcularZ(mu0, xbar, sigma, n);
  const se   = E.calcularSE(sigma, n);
  const pval = E.calcularPvalor(z, tail);
  const zc   = E.calcularZcritico(alpha, tail);
  const rech = E.tomarDecision(pval, alpha); // true = se rechaza H₀

  /* Mostrar las 4 métricas con 4 decimales */
  document.getElementById('m-z').textContent    = z.toFixed(4);
  document.getElementById('m-pval').textContent = pval.toFixed(4);
  document.getElementById('m-zc').textContent   = zc.toFixed(4);
  document.getElementById('m-se').textContent   = se.toFixed(4);

  /* Cambiar color y texto del veredicto según la decisión */
  const veredicto = document.getElementById('veredicto');
  veredicto.className = 'veredicto ' + (rech ? 'veredicto--rechaza' : 'veredicto--acepta');
  document.getElementById('veredicto-icono').textContent = rech ? '✗' : '✓';
  document.getElementById('veredicto-texto').textContent = rech
    ? 'Se rechaza H₀'
    : 'No se rechaza H₀';

  /* Redibujar la curva normal con los nuevos valores */
  window.dibujarCurva('curva-canvas', z, zc, tail, rech);

  /* Retornamos los resultados para poder usarlos al guardar */
  return { z, se, pval, zc, rech };
}

/* ── Guardar simulación en el historial ──────────────────────
   Toma el estado actual + los resultados, arma un objeto
   y lo guarda en localStorage como arreglo JSON.
   Máximo 10 entradas (elimina la más antigua si se excede).
─────────────────────────────────────────────────────────────── */
const CLAVE_HISTORIAL = 'historial-simulaciones';

document.getElementById('btn-guardar').addEventListener('click', () => {
  const { z, pval, rech } = actualizar();

  /* Armar el registro con fecha, parámetros y resultados */
  const registro = {
    fecha:    new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    mu0:      estado.mu0,
    xbar:     estado.xbar,
    sigma:    estado.sigma,
    n:        estado.n,
    alpha:    estado.alpha,
    tail:     estado.tail,
    z:        +z.toFixed(4),
    pval:     +pval.toFixed(4),
    decision: rech
  };

  /* Leer historial existente, agregar al inicio, recortar a 10 */
  const lista = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) || '[]');
  lista.unshift(registro);
  if (lista.length > 10) lista.pop();
  localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(lista));

  renderHistorial();
});

/* ── renderHistorial() — muestra el historial en pantalla ────
   Lee localStorage y construye el HTML de cada fila.
   Si no hay registros, muestra un mensaje vacío.
─────────────────────────────────────────────────────────────── */
function renderHistorial() {
  const lista      = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) || '[]');
  const contenedor = document.getElementById('historial-lista');

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="text-muted text-sm" style="text-align:center;padding:16px">Sin simulaciones guardadas aún</p>';
    return;
  }

  contenedor.innerHTML = lista.map(r => `
    <div class="historial__item">
      <span class="historial__fecha">${r.fecha}</span>
      <span class="historial__params">
        μ₀=${r.mu0} x̄=${r.xbar} σ=${r.sigma} n=${r.n} α=${r.alpha} ${r.tail}
      </span>
      <span class="historial__decision ${r.decision ? 'rechaza' : 'acepta'}">
        ${r.decision ? 'Rechaza H₀' : 'Acepta H₀'}
      </span>
    </div>
  `).join(''); /* une todo; se devuelve un array y se necesita un texto*/
}

/* ── Limpiar historial ────────────────────────────────────── */
document.getElementById('btn-limpiar').addEventListener('click', () => {
  localStorage.removeItem(CLAVE_HISTORIAL);
  renderHistorial();
});

/* ── Redibujar la curva si cambia el tamaño de la ventana ─── */
window.addEventListener('resize', actualizar); /*se actializa segun el tamaño de la pantalla*/

/* ── Arranque: dibujar estado inicial al cargar la página ─── */
renderHistorial();
actualizar();