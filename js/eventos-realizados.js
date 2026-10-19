/* ======================================================
   KASARÃO — eventos-realizados.js
   Galeria de eventos reais já realizados na casa, dirigida por
   data/eventos-realizados.json. Carregado só em eventos.html.

   Como funciona: cada evento vira um card (capa = primeira foto)
   agrupado por categoria em abas; clicar no card abre um lightbox
   com todas as fotos daquele evento. Adicionar um evento novo não
   mexe neste arquivo — só no JSON e na pasta img/eventos/
   (ver tools/optimize_eventos.py).
====================================================== */

(function initEventosRealizados() {
  const DATA_URL = 'data/eventos-realizados.json';
  const PHOTOS_PREFIX = 'img/eventos/';
  const OPT_PREFIX = 'img/optimized/eventos/';

  const section = document.getElementById('eventos-realizados');
  if (!section) return;

  const tabsWrap = section.querySelector('[data-events-done-tabs]');
  const grid = section.querySelector('[data-events-done-grid]');
  if (!tabsWrap || !grid) return;

  const CATEGORY_LABELS = {
    casamentos: 'Casamentos',
    formaturas: 'Formaturas',
    aniversarios: 'Aniversários',
    empresariais: 'Empresas',
    outros: 'Outras celebrações'
  };

  function labelFor(category) {
    if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
    const clean = category.replace(/[-_]+/g, ' ').trim();
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Eventos';
  }

  function normalizeEvent(item) {
    if (!item || typeof item !== 'object') return null;

    const title = String(item.title || '').trim();
    const photos = (Array.isArray(item.photos) ? item.photos : [])
      .map((photo) => {
        if (!photo || typeof photo !== 'object') return null;
        const src = String(photo.src || '').trim();
        if (!src) return null;
        return { src, alt: String(photo.alt || '').trim() };
      })
      .filter(Boolean);

    if (!title || !photos.length) return null;

    return {
      id: String(item.id || title).trim(),
      category: String(item.category || 'outros').trim().toLowerCase() || 'outros',
      title,
      date: String(item.date || '').trim(),
      description: String(item.description || '').trim(),
      photos,
      active: item.active !== false
    };
  }

  function opt(src, width, ext) {
    if (!src.startsWith(PHOTOS_PREFIX)) return null;
    const rel = src.slice(PHOTOS_PREFIX.length);
    const dot = rel.lastIndexOf('.');
    const stem = dot === -1 ? rel : rel.slice(0, dot);
    return `${OPT_PREFIX}${stem}-${width}.${ext}`;
  }

  function buildPicture(photo, width, className) {
    const picture = document.createElement('picture');
    const avif = opt(photo.src, width, 'avif');
    const webp = opt(photo.src, width, 'webp');

    if (avif) {
      const source = document.createElement('source');
      source.type = 'image/avif';
      source.srcset = avif;
      picture.append(source);
    }

    if (webp) {
      const source = document.createElement('source');
      source.type = 'image/webp';
      source.srcset = webp;
      picture.append(source);
    }

    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    if (className) img.className = className;
    picture.append(img);

    return picture;
  }

  // ---- Lightbox ----
  let lightbox = null;
  let lightboxImgWrap = null;
  let lightboxCaption = null;
  let activeEvent = null;
  let activeIndex = 0;
  let lastFocused = null;

  function buildLightbox() {
    const el = document.createElement('div');
    el.className = 'events-lightbox';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Fotos do evento');

    el.innerHTML = `
      <div class="events-lightbox-dialog">
        <button type="button" class="events-lightbox-close" aria-label="Fechar">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>
        </button>
        <div class="events-lightbox-frame">
          <button type="button" class="events-lightbox-prev" aria-label="Foto anterior">
            <svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8"></path></svg>
          </button>
          <div data-lightbox-imgwrap></div>
          <button type="button" class="events-lightbox-next" aria-label="Próxima foto">
            <svg viewBox="0 0 24 24"><path d="M9 4l8 8-8 8"></path></svg>
          </button>
        </div>
        <p class="events-lightbox-caption" data-lightbox-caption></p>
      </div>
    `;

    document.body.append(el);

    lightboxImgWrap = el.querySelector('[data-lightbox-imgwrap]');
    lightboxCaption = el.querySelector('[data-lightbox-caption]');

    el.querySelector('.events-lightbox-close').addEventListener('click', closeLightbox);
    el.querySelector('.events-lightbox-prev').addEventListener('click', () => step(-1));
    el.querySelector('.events-lightbox-next').addEventListener('click', () => step(1));

    el.addEventListener('click', (event) => {
      if (event.target === el) closeLightbox();
    });

    el.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeLightbox();
        return;
      }
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);

      if (event.key === 'Tab') {
        const focusable = Array.from(el.querySelectorAll('button'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    return el;
  }

  function renderLightboxPhoto() {
    if (!activeEvent) return;
    const photo = activeEvent.photos[activeIndex];

    lightboxImgWrap.textContent = '';
    lightboxImgWrap.append(buildPicture(photo, 1600, null));
    lightboxCaption.textContent = `${activeEvent.title} — foto ${activeIndex + 1} de ${activeEvent.photos.length}`;
  }

  function step(direction) {
    if (!activeEvent) return;
    const total = activeEvent.photos.length;
    activeIndex = (activeIndex + direction + total) % total;
    renderLightboxPhoto();
  }

  function openLightbox(evt, startIndex, triggerEl) {
    if (!lightbox) lightbox = buildLightbox();

    activeEvent = evt;
    activeIndex = startIndex;
    lastFocused = triggerEl || document.activeElement;

    renderLightboxPhoto();

    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.events-lightbox-close').focus();

    const multi = evt.photos.length > 1;
    lightbox.querySelector('.events-lightbox-prev').hidden = !multi;
    lightbox.querySelector('.events-lightbox-next').hidden = !multi;
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
    activeEvent = null;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  // ---- Cards / abas ----
  function createCard(evt) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'events-done-card';

    const cover = document.createElement('div');
    cover.className = 'events-done-card-cover';
    cover.append(buildPicture(evt.photos[0], 480, null));

    if (evt.photos.length > 1) {
      const count = document.createElement('span');
      count.className = 'events-done-card-count';
      count.textContent = `${evt.photos.length} fotos`;
      cover.append(count);
    }

    const body = document.createElement('div');
    body.className = 'events-done-card-body';

    const tag = document.createElement('span');
    tag.className = 'events-done-card-tag';
    tag.textContent = labelFor(evt.category);
    body.append(tag);

    const title = document.createElement('h3');
    title.textContent = evt.title;
    body.append(title);

    if (evt.date) {
      const date = document.createElement('span');
      date.className = 'events-done-card-date';
      date.textContent = evt.date;
      body.append(date);
    }

    if (evt.description) {
      const desc = document.createElement('p');
      desc.textContent = evt.description;
      body.append(desc);
    }

    card.append(cover, body);
    card.addEventListener('click', () => openLightbox(evt, 0, card));

    return card;
  }

  function renderGrid(events, category) {
    grid.textContent = '';
    const filtered = category === 'all' ? events : events.filter((evt) => evt.category === category);
    filtered.forEach((evt) => grid.append(createCard(evt)));
  }

  function renderTabs(events) {
    const counts = new Map();
    events.forEach((evt) => counts.set(evt.category, (counts.get(evt.category) || 0) + 1));

    tabsWrap.textContent = '';
    tabsWrap.hidden = counts.size <= 1;
    if (tabsWrap.hidden) return;

    const makeTab = (category, label) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'events-done-tab';
      tab.setAttribute('role', 'tab');
      tab.textContent = label;
      tab.addEventListener('click', () => {
        tabsWrap.querySelectorAll('.events-done-tab').forEach((t) => {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        renderGrid(events, tab.dataset.category);
      });
      return tab;
    };

    const allTab = makeTab('all', 'Todos');
    allTab.dataset.category = 'all';
    allTab.classList.add('is-active');
    allTab.setAttribute('aria-selected', 'true');
    tabsWrap.append(allTab);

    counts.forEach((count, category) => {
      const tab = makeTab(category, `${labelFor(category)} (${count})`);
      tab.dataset.category = category;
      tab.setAttribute('aria-selected', 'false');
      tabsWrap.append(tab);
    });
  }

  async function init() {
    let events = [];
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Não foi possível carregar ${DATA_URL}`);
      const payload = await response.json();
      events = (Array.isArray(payload) ? payload : [])
        .map(normalizeEvent)
        .filter((evt) => evt && evt.active);
    } catch (error) {
      events = [];
    }

    if (!events.length) return;

    section.hidden = false;
    renderTabs(events);
    renderGrid(events, 'all');
  }

  init();
})();
