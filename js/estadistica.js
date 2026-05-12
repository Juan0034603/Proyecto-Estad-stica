window.Estadistica = (function () {

  /* ── erf(x) — función error ─────────────────────────────────
     Aproximación de Horner. Necesaria para calcular la CDF normal.
     Error máximo: 1.5e-7 (suficiente para estadística aplicada)
  ──────────────────────────────────────────────────────────── */
  function erf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const poly =
      t * (0.254829592 +
      t * (-0.284496736 +
      t * (1.421413741 +
      t * (-1.453152027 +
      t * 1.061405429))));
    const resultado = 1 - poly * Math.exp(-x * x);
    return x >= 0 ? resultado : -resultado;  /* simulacion de la tabla z para calcularla despues*/
  }

  /* ── nCDF(x) — distribución normal acumulada ────────────────
     P(Z ≤ x) para Z ~ N(0,1)
     Usa erf: Φ(x) = (1 + erf(x / √2)) / 2
  ──────────────────────────────────────────────────────────── */
  function nCDF(x) {
    return (1 + erf(x / Math.SQRT2)) / 2;
  }

  /* ── nPDF(x) — densidad normal estándar ─────────────────────
     f(x) = (1 / √(2π)) * e^(-x²/2)
     Se usa para dibujar la curva en el canvas
  ──────────────────────────────────────────────────────────── */
  function nPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  /* ── invNorm(p) — cuantil normal (inversa de CDF) ───────────
     Dado p, retorna z tal que P(Z ≤ z) = p
     Algoritmo de Beasley-Springer-Moro (aproximación racional)
     Se usa para calcular Z crítico dado alpha
  ──────────────────────────────────────────────────────────── */
  function invNorm(p) {
    if (p <= 0) return -Infinity;         /* permite calcular z critico */
    if (p >= 1) return  Infinity;

    const a = [
      -3.969683028665376e+01,  2.209460984245205e+02,  /* es como bucsar en la tabla */
      -2.759285104469687e+02,  1.383577518672690e+02,
      -3.066479806614716e+01,  2.506628277459239e+00
    ];
    const b = [
      -5.447609879822406e+01,  1.615858368580409e+02,
      -1.556989798598866e+02,  6.680131188771972e+01,
      -1.328068155288572e+01
    ];
    const c = [
      -7.784894002430293e-03, -3.223964580411365e-01,
      -2.400758277161838e+00, -2.549732539343734e+00,
       4.374664141464968e+00,  2.938163982698783e+00
    ];
    const d = [
       7.784695709041462e-03,  3.224671290700398e-01,
       2.445134137142996e+00,  3.754408661907416e+00
    ];

    const pLow  = 0.02425;
    const pHigh = 1 - pLow;

    let q, r, x;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
          ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      x = (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
          (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }

    return x;
  }

  /* ── calcularSE — error estándar ────────────────────────────
     SE = σ / √n
     Mide cuánto varía la media muestral de muestra en muestra
  ──────────────────────────────────────────────────────────── */
  function calcularSE(sigma, n) {
    return sigma / Math.sqrt(n);
  }

  /* ── calcularZ — estadístico Z ──────────────────────────────
     Z = (x̄ - μ₀) / (σ / √n)
     Cuántos errores estándar está x̄ de μ₀
  ──────────────────────────────────────────────────────────── */
  function calcularZ(mu0, xbar, sigma, n) {
    return (xbar - mu0) / calcularSE(sigma, n);
  }

  /* ── calcularPvalor ─────────────────────────────────────────
     Probabilidad de obtener un Z tan extremo o más, bajo H₀
     tail: 'bilateral' | 'derecha' | 'izquierda'
  ──────────────────────────────────────────────────────────── */
  function calcularPvalor(z, tail) {
    switch (tail) {
      case 'derecha':
        return 1 - nCDF(z);
      case 'izquierda':
        return nCDF(z);
      case 'bilateral':
      default:
        return 2 * (1 - nCDF(Math.abs(z)));
    }
  }

  /* ── calcularZcritico ───────────────────────────────────────
     Valor de Z que delimita la región de rechazo
     tail: 'bilateral' | 'derecha' | 'izquierda'
  ──────────────────────────────────────────────────────────── */
  function calcularZcritico(alpha, tail) {
    switch (tail) {
      case 'derecha':
        return invNorm(1 - alpha);
      case 'izquierda':
        return invNorm(alpha);
      case 'bilateral':
      default:
        return invNorm(1 - alpha / 2);
    }
  }

  /* ── calcularIC — intervalo de confianza ────────────────────
     IC = x̄ ± Zα/2 * (σ / √n)
     Retorna límite inferior, superior, margen de error, Zc y SE
  ──────────────────────────────────────────────────────────── */
  function calcularIC(xbar, sigma, n, confianza) {
    const alpha = 1 - confianza;
    const zc    = invNorm(1 - alpha / 2);
    const se    = calcularSE(sigma, n);
    const me    = zc * se;
    return {
      li: xbar - me,
      ls: xbar + me,
      me: me,
      zc: zc,
      se: se
    };
  }

  /* ── tomarDecision ──────────────────────────────────────────
     Retorna true si se rechaza H₀ (p-valor < alpha)
  ──────────────────────────────────────────────────────────── */
  function tomarDecision(pval, alpha) {
    return pval < alpha;
  }

  /* ── API pública ────────────────────────────────────────────*/
  return {
    erf, nCDF, nPDF, invNorm,
    calcularSE, calcularZ,
    calcularPvalor, calcularZcritico,
    calcularIC, tomarDecision
  };

})();

// Siguiente: curva.js