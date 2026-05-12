/* ============================================================
   curva.js — Dibuja la distribución normal en un canvas
   Proyecto: Simulador de Estadística Inferencial
   Expone: window.dibujarCurva(canvasId, z, zc, tail, rechaza)

   Parámetros:
     canvasId — id del elemento <canvas> en el HTML
     z        — estadístico Z calculado (la línea verde/roja)
     zc       — Z crítico (delimita la región de rechazo)
     tail     — 'bilateral' | 'izquierda' | 'derecha'
     rechaza  — true si se rechaza H₀ (cambia color de la línea)
   ============================================================ */

window.dibujarCurva = function (canvasId, z, zc, tail, rechaza) {

  /* ── 1. Obtener el canvas y su contexto de dibujo ─────────── */
  const canvas = document.getElementById(canvasId);
  if (!canvas) return; // si no existe el canvas, no hacer nada

  const ctx = canvas.getContext('2d'); // contexto 2D para dibujar

  /* Leemos el tamaño visual del canvas (el que ve el usuario).
     offsetWidth/Height es el tamaño CSS real en pantalla. */
  const W = canvas.offsetWidth  || canvas.width;
  const H = canvas.offsetHeight || canvas.height;

  /* ── 2. Ajuste para pantallas de alta densidad (retina) ───────
     En pantallas retina, 1 píxel CSS = 2 píxeles físicos.
     Si no escalamos, la curva se ve borrosa.
     Solución: hacer el canvas internamente el doble de grande
     y luego escalar el contexto para que el código dibuje igual. */
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr); // a partir de aquí dibujamos en coordenadas CSS normales

  /* ── 3. Colores según modo claro u oscuro ─────────────────────
     matchMedia detecta si el sistema operativo está en modo oscuro.
     Así la curva se adapta automáticamente sin que el usuario haga nada. */
  const oscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const COLOR = {
    fondo:   oscuro ? '#1a1e2a'                : '#ffffff',
    curva:   oscuro ? '#4a8fff'                : '#2563eb',
    rechazo: 'rgba(242,101,101,0.35)',           // rojo semitransparente siempre
    critico: '#f26565',                          // borde de la región de rechazo
    zLinea:  rechaza ? '#f26565'               // rojo si rechaza H₀
                     : (oscuro ? '#3ecf8e' : '#16a34a'), // verde si no rechaza
    texto:   oscuro ? '#8b90a7'                : '#6b7280',
    grilla:  oscuro ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
  };

  /* ── 4. Definir márgenes y área útil de dibujo ────────────────
     No dibujamos hasta el borde del canvas. Dejamos margen
     para que las etiquetas del eje X no queden cortadas. */
  const margen = { top: 16, bottom: 28, left: 16, right: 16 };
  const areaW  = W - margen.left - margen.right; // ancho útil
  const areaH  = H - margen.top  - margen.bottom; // alto útil

  /* ── 5. Rango del eje X y funciones de conversión ─────────────
     El eje X va de -3.8 a +3.8 desviaciones estándar.
     Cubrimos casi toda la distribución (99.98% del área).

     xAPx: convierte un valor estadístico (ej: 1.96) a píxeles X
     yAPx: convierte una densidad (altura de la curva) a píxeles Y

     La fórmula de xAPx es interpolación lineal:
       proporción = (val - xMin) / (xMax - xMin)  → entre 0 y 1
       pixel = margen.left + proporción * areaW
  */
  const xMin = -3.8;
  const xMax =  3.8;

  function xAPx(val) {
    return margen.left + ((val - xMin) / (xMax - xMin)) * areaW;
  }

  /* La densidad máxima es nPDF(0) = 0.3989 (la cima de la campana).
     Multiplicamos por 1.15 para que la cima no quede pegada al borde. */
  const densidadMaxima = window.Estadistica.nPDF(0) * 1.15;

  function yAPx(densidad) {
    /* areaH - (...) invierte el eje: densidad alta = pixel arriba */
    return margen.top + areaH - (densidad / densidadMaxima) * areaH;
  }

  /* ── 6. Limpiar y pintar el fondo ─────────────────────────── */
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = COLOR.fondo;
  ctx.fillRect(0, 0, W, H);

  /* ── 7. Cuadrícula vertical y etiquetas del eje X ────────────
     Dibujamos ambas cosas en el mismo forEach para no recorrer
     el mismo arreglo dos veces. */
  const marcas = [-3, -2, -1, 0, 1, 2, 3];

  ctx.strokeStyle = COLOR.grilla;
  ctx.lineWidth   = 1;
  ctx.fillStyle   = COLOR.texto;
  ctx.font        = `11px 'DM Mono', monospace`;
  ctx.textAlign   = 'center';

  marcas.forEach(v => {
    const px = xAPx(v);

    /* Línea vertical de la cuadrícula */
    ctx.beginPath();
    ctx.moveTo(px, margen.top);
    ctx.lineTo(px, margen.top + areaH);
    ctx.stroke();

    /* Etiqueta numérica debajo */
    ctx.fillText(v, px, H - 6);
  });

  /* ── 8. Región de rechazo (área roja sombreada) ───────────────
     sombrear(a, b) rellena el área bajo la curva entre a y b.
     Traza: parte del eje X → sube por la curva → vuelve al eje X.

     Para bilateral: dos regiones (cola izquierda y cola derecha).
     Para una cola: solo una región del lado correspondiente. */
  ctx.fillStyle = COLOR.rechazo;

  function sombrear(xIni, xFin) {
    ctx.beginPath();
    ctx.moveTo(xAPx(xIni), yAPx(0)); // empieza en el eje X
    for (let xi = xIni; xi <= xFin; xi += 0.02) {
      ctx.lineTo(xAPx(xi), yAPx(window.Estadistica.nPDF(xi))); // sigue la curva
    }
    ctx.lineTo(xAPx(xFin), yAPx(0)); // baja al eje X
    ctx.closePath();
    ctx.fill();
  }

  if (tail === 'bilateral') {
    sombrear(xMin, -Math.abs(zc)); // cola izquierda
    sombrear(Math.abs(zc), xMax);  // cola derecha
  } else if (tail === 'derecha') {
    sombrear(zc, xMax);
  } else {
    sombrear(xMin, zc);
  }

  /* ── 9. Líneas punteadas en el Z crítico ──────────────────────
     Marcan visualmente el límite de la región de rechazo.
     setLineDash([4,4]) = 4px de línea, 4px de espacio, alternando. */
  ctx.strokeStyle = COLOR.critico;
  ctx.lineWidth   = 1.2;
  ctx.setLineDash([4, 4]);

  function lineaCritica(zcVal) {
    const px = xAPx(zcVal);
    ctx.beginPath();
    ctx.moveTo(px, yAPx(window.Estadistica.nPDF(zcVal))); // desde la curva
    ctx.lineTo(px, yAPx(0));                               // hasta el eje X
    ctx.stroke();
  }

  if (tail === 'bilateral') {
    lineaCritica( Math.abs(zc)); // lado derecho
    lineaCritica(-Math.abs(zc)); // lado izquierdo
  } else {
    lineaCritica(zc);
  }

  ctx.setLineDash([]); // restaurar línea sólida para lo que sigue

  /* ── 10. Curva normal (la campana) ────────────────────────────
     Recorremos el eje X de -3.8 a 3.8 en pasos pequeños (0.04),
     calculamos la densidad en cada punto con nPDF y trazamos.
     moveTo en el primero, lineTo en todos los demás. */
  ctx.strokeStyle = COLOR.curva;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();

  /* Generamos todos los puntos X del recorrido */
  const puntosX = [];
  for (let xi = xMin; xi <= xMax; xi += 0.04) puntosX.push(xi);

  /* El primero usa moveTo (levantar el lápiz), los demás lineTo */
  ctx.moveTo(xAPx(puntosX[0]), yAPx(window.Estadistica.nPDF(puntosX[0])));
  puntosX.slice(1).forEach(xi => {
    ctx.lineTo(xAPx(xi), yAPx(window.Estadistica.nPDF(xi)));
  });

  ctx.stroke();

  /* ── 11. Línea vertical del estadístico Z calculado ───────────
     Es la línea que muestra dónde cayó el Z del experimento.
     Verde si no rechaza H₀, roja si rechaza.

     zClamped: si Z está fuera del rango del canvas (-3.8 a 3.8)
     lo forzamos al borde para que siempre sea visible. */
  const zClamped = Math.max(xMin, Math.min(xMax, z));
  const zPx      = xAPx(zClamped);
  const zAltura  = yAPx(window.Estadistica.nPDF(zClamped));

  ctx.strokeStyle = COLOR.zLinea;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(zPx, zAltura);   // desde la curva
  ctx.lineTo(zPx, yAPx(0));   // hasta el eje X
  ctx.stroke();

  /* Etiqueta "Z=X.XX" al lado de la línea.
     Si Z es positivo la ponemos a la izquierda de la línea (y viceversa)
     para que no quede tapada por la región de rechazo. */
  ctx.font      = `bold 11px 'DM Mono', monospace`;
  ctx.fillStyle = COLOR.zLinea;
  ctx.textAlign = zClamped > 0 ? 'right' : 'left';
  ctx.fillText(
    `Z=${z.toFixed(2)}`,
    zPx + (zClamped > 0 ? -6 : 6),
    zAltura - 6
  );

};