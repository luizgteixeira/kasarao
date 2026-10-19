/* ======================================================
   KASARÃO — testimonials-shared.js
   Normalização e validação de depoimentos, compartilhada por:
   - js/script.js (site público)
   - js/admin-testimonials.js (painel admin, navegador)
   - tools/admin-server.js (servidor local, Node.js)
====================================================== */

function clampRating(value) {
  // 0/vazio representa "sem avaliação" (ex.: depoimento enviado direto, sem nota) — não vira 5 por padrão.
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.max(Math.round(parsed), 1), 5);
}

function normalizeTestimonial(item) {
  if (!item || typeof item !== 'object') return null;

  const author = String(item.author || '').trim();
  const text = String(item.text || '').trim();
  if (!author || !text) return null;

  return {
    author,
    text,
    age: String(item.age || '').trim(),
    rating: clampRating(item.rating),
    source: String(item.source || 'Google Reviews').trim(),
    active: item.active !== false
  };
}

function formatTestimonialBadge(item) {
  // Monta o selo "Fonte • X estrelas • prazo", omitindo partes que o depoimento não tem (sem nota/sem data).
  const parts = [item.source];
  if (item.rating > 0) {
    parts.push(`${item.rating} ${item.rating === 1 ? 'estrela' : 'estrelas'}`);
  }
  if (item.age) {
    parts.push(item.age);
  }
  return parts.join(' • ');
}

function normalizePayload(payload, { activeOnly = false } = {}) {
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.testimonials)
      ? payload.testimonials
      : [];

  const normalized = rawItems.map(normalizeTestimonial).filter(Boolean);
  return activeOnly ? normalized.filter((item) => item.active) : normalized;
}

const TestimonialsShared = { clampRating, normalizeTestimonial, normalizePayload, formatTestimonialBadge };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestimonialsShared;
} else {
  window.TestimonialsShared = TestimonialsShared;
}
