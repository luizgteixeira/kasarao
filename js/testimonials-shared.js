/* ======================================================
   KASARÃO — testimonials-shared.js
   Normalização e validação de depoimentos, compartilhada por:
   - js/script.js (site público)
   - js/admin-testimonials.js (painel admin, navegador)
   - tools/admin-server.js (servidor local, Node.js)
====================================================== */

function clampRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
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
    age: String(item.age || 'Avaliação recente').trim(),
    rating: clampRating(item.rating),
    source: String(item.source || 'Google Reviews').trim(),
    active: item.active !== false
  };
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

const TestimonialsShared = { clampRating, normalizeTestimonial, normalizePayload };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestimonialsShared;
} else {
  window.TestimonialsShared = TestimonialsShared;
}
