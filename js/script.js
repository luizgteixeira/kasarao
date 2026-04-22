/* ======================================================
   KASARÃO — script.js
   - Tema em body.light-mode (persistente + sincroniza toggles)
   - Menu: scrolled + hide on scroll (no .site-header)
   - Drawer mobile (navToggle/navOverlay/navDrawer/drawerClose)
   - Link ativo por página (desktop + drawer)
   - Slider por seção .gallery (prev/next por seção)
   - Transição entre páginas (fade-out)
   - Ajusta --nav-h dinamicamente
   - Saudação + aberto/fechado com base no horário de funcionamento
====================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const body = document.body;

  const header = document.querySelector('.site-header');

  // Drawer
  const navToggle = document.getElementById('navToggle');
  const navOverlay = document.getElementById('navOverlay');
  const navDrawer = document.getElementById('navDrawer');
  const drawerClose = document.getElementById('drawerClose');

  // Tema (switches)
  const toggleDesktop = document.getElementById('theme-toggle');
  const toggleMobile = document.getElementById('theme-toggle-mobile');
  const mobileThemeQuery = window.matchMedia(
    '(hover: none) and (pointer: coarse) and (max-width: 960px)'
  );

  if (navToggle) {
    navToggle.setAttribute('aria-expanded', 'false');
  }

  /* =====================================
     0) ALTURA DINÂMICA DA NAV (ANTI-CORTE)
  ====================================== */
  function setNavHeightVar() {
    if (!header) return;
    const h = header.getBoundingClientRect().height;
    root.style.setProperty('--nav-h', `${Math.ceil(h)}px`);
  }

  setNavHeightVar();
  ['resize', 'orientationchange', 'load'].forEach((evt) =>
    window.addEventListener(evt, setNavHeightVar)
  );

  /* =====================================
     1) LINK ATIVO AUTOMÁTICO POR PÁGINA
  ====================================== */
  (function setActiveMenuLink() {
    const links = document.querySelectorAll(
      '.menu .nav-links a, .drawer-links a'
    );
    if (!links.length) return;

    const currentPage =
      window.location.pathname.split('/').pop() || 'index.html';
    const isRoot =
      window.location.pathname === '/' || window.location.pathname === '';

    links.forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href === '#') return;

      const hrefClean = href.split('#')[0].split('?')[0];
      if (hrefClean === currentPage || (isRoot && hrefClean === 'index.html')) {
        a.classList.add('active');
      }
    });
  })();

  /* =====================================
     2) TEMA — body.light-mode (persistente)
  ====================================== */
  function isLight() {
    return body.classList.contains('light-mode');
  }

  function syncThemeToggles() {
    const light = isLight();
    if (toggleDesktop) toggleDesktop.checked = light;
    if (toggleMobile) toggleMobile.checked = light;
  }

  function setThemeMetaColor(light) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    // dark padrão do seu global.css + um claro compatível
    meta.setAttribute('content', light ? '#f4f1ea' : '#0C1014');
  }

  function applyTheme(light, persist = true) {
    const isLightMode = !!light;

    body.classList.toggle('light-mode', isLightMode);

    // ✅ token profissional para CSS e debugging
    body.dataset.theme = isLightMode ? 'light' : 'dark';

    if (persist) {
      localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    }
    syncThemeToggles();
    setThemeMetaColor(isLightMode);
  }

  function applyResponsiveTheme() {
    const isMobile = mobileThemeQuery.matches;
    const saved = localStorage.getItem('theme');
    applyTheme(isMobile ? true : saved === 'light', !isMobile);
  }

  (function initTheme() {
    applyResponsiveTheme(); // mobile sempre claro; desktop mantém preferência
  })();

  if (toggleDesktop)
    toggleDesktop.addEventListener('change', () => {
      localStorage.setItem('theme', toggleDesktop.checked ? 'light' : 'dark');
      applyResponsiveTheme();
    });
  if (toggleMobile)
    toggleMobile.addEventListener('change', () => {
      localStorage.setItem('theme', toggleMobile.checked ? 'light' : 'dark');
      applyResponsiveTheme();
    });

  if (typeof mobileThemeQuery.addEventListener === 'function') {
    mobileThemeQuery.addEventListener('change', applyResponsiveTheme);
  } else if (typeof mobileThemeQuery.addListener === 'function') {
    mobileThemeQuery.addListener(applyResponsiveTheme);
  }

  /* =====================================
     3) SAUDAÇÃO + STATUS (ABERTO/FECHADO)
     - Usa hora do sistema + horário de funcionamento
     - Mantém efeito de "digitação"
  ====================================== */
  (function setSaudacaoComFuncionamento() {
    const el = document.getElementById('saudacao');
    if (!el) return;

    const now = new Date();
    const day = now.getDay(); // 0=Dom ... 6=Sáb
    const minutesNow = now.getHours() * 60 + now.getMinutes();

    // Horários do Kasarão (em minutos)
    // Sábado: 11:30 até 00:00 => tratamos como 24:00 (fim do dia)
    const schedule = {
      4: [{ start: 18 * 60, end: 23 * 60 }], // Quinta
      5: [{ start: 18 * 60, end: 23 * 60 }], // Sexta
      6: [{ start: 11 * 60 + 30, end: 24 * 60 }], // Sábado
      0: [{ start: 11 * 60 + 30, end: 17 * 60 }], // Domingo
    };

    const weekdayName = (d) =>
      ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d];

    const openingDayLabel = (daysAhead, targetDay) => {
      if (daysAhead === 0) return 'hoje';
      if (daysAhead === 1) return 'amanhã';
      return weekdayName(targetDay);
    };

    const fmt = (mins) => {
      const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const hour = now.getHours();
    const period =
      hour >= 5 && hour < 12
        ? 'Bom dia'
        : hour >= 12 && hour < 18
          ? 'Boa tarde'
          : 'Boa noite';

    const todaySlots = schedule[day] || [];
    const currentSlot = todaySlots.find(
      ({ start, end }) => minutesNow >= start && minutesNow < end
    );

    // Busca a próxima abertura (até 7 dias)
    const findNextOpen = () => {
      for (let i = 0; i < 7; i++) {
        const d = (day + i) % 7;
        const slots = schedule[d];
        if (!slots?.length) continue;

        if (i === 0) {
          const nextToday = slots.find((s) => minutesNow < s.start);
          if (nextToday) return { day: d, start: nextToday.start, daysAhead: i };
        } else {
          return { day: d, start: slots[0].start, daysAhead: i };
        }
      }
      return null;
    };

    let msg = `${period}! `;

    if (currentSlot) {
      msg += `🍻 Estamos abertos agora (até ${fmt(currentSlot.end)}).`;
    } else {
      const next = findNextOpen();
      msg += next
        ? `✨ Estamos fechados agora. Abrimos ${openingDayLabel(next.daysAhead, next.day)} às ${fmt(next.start)}.`
        : `✨ Estamos fechados no momento.`;
    }

    // Efeito de digitação (suave)
    let i = 0;
    el.textContent = '';
    (function typeWriter() {
      if (i < msg.length) {
        el.textContent += msg.charAt(i++);
        setTimeout(typeWriter, 18);
      }
    })();
  })();

  /* =====================================
     4) HEADER DINÂMICO (SCROLLED + HIDE/SHOW)
  ====================================== */
  let lastScroll = window.scrollY || 0;

  function handleHeaderScroll() {
    if (!header) return;

    const currentScroll = window.scrollY || 0;

    header.classList.toggle('scrolled', currentScroll > 50);
    header.classList.toggle(
      'hide',
      currentScroll > lastScroll && currentScroll > 120
    );

    lastScroll = currentScroll;
  }

  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  handleHeaderScroll();

  /* =====================================
     5) DRAWER MOBILE
  ====================================== */
  function drawerIsOpen() {
    return !!navDrawer && navDrawer.classList.contains('is-open');
  }

  function openDrawer() {
    if (!navDrawer || !navOverlay || !navToggle) return;

    navDrawer.classList.add('is-open');
    navOverlay.classList.add('is-open');
    navToggle.classList.add('is-open');

    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Fechar menu');
    navDrawer.setAttribute('aria-hidden', 'false');
    navOverlay.setAttribute('aria-hidden', 'false');

    // Opcional (UX): impede overlay de capturar cliques quando fechado
    navOverlay.hidden = false;

    body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!navDrawer || !navOverlay || !navToggle) return;

    navDrawer.classList.remove('is-open');
    navOverlay.classList.remove('is-open');
    navToggle.classList.remove('is-open');

    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menu');
    navDrawer.setAttribute('aria-hidden', 'true');
    navOverlay.setAttribute('aria-hidden', 'true');

    navOverlay.hidden = true;

    body.style.overflow = '';
  }

  if (navToggle && navOverlay && navDrawer && drawerClose) {
    // estado inicial do overlay
    navOverlay.hidden = true;

    navToggle.addEventListener('click', () =>
      drawerIsOpen() ? closeDrawer() : openDrawer()
    );
    drawerClose.addEventListener('click', closeDrawer);
    navOverlay.addEventListener('click', closeDrawer);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawerIsOpen()) closeDrawer();
    });

    navDrawer
      .querySelectorAll('a')
      .forEach((a) => a.addEventListener('click', closeDrawer));
  }

  /* =====================================
     6) SLIDER POR SEÇÃO .gallery
     - Prev/Next agem só dentro da seção clicada
  ====================================== */
  function initGallerySlider(galleryEl) {
    const slides = Array.from(galleryEl.querySelectorAll('.slide'));
    if (slides.length <= 1) return;

    const prevBtn = galleryEl.querySelector('.prev');
    const nextBtn = galleryEl.querySelector('.next');
    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'gallery-dots';
    dotsWrap.setAttribute('aria-label', 'Navegação do carrossel');
    galleryEl.appendChild(dotsWrap);

    let index = slides.findIndex((s) => s.classList.contains('active'));
    if (index < 0) index = 0;

    const dots = slides.map((_, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-dot';
      button.setAttribute('aria-label', `Ir para o slide ${i + 1}`);
      button.addEventListener('click', () => {
        stopAutoplay();
        show(i);
        startAutoplay();
      });
      dotsWrap.appendChild(button);
      return button;
    });

    function show(i) {
      slides.forEach((s) => s.classList.toggle('active', s === slides[i]));
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === i;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
      index = i;
    }

    function next() {
      show((index + 1) % slides.length);
    }

    function prev() {
      show((index - 1 + slides.length) % slides.length);
    }

    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      stopAutoplay();
      next();
      startAutoplay();
    });

    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      stopAutoplay();
      prev();
      startAutoplay();
    });

    // Swipe básico
    let startX = 0;
    let touching = false;

    galleryEl.addEventListener(
      'touchstart',
      (e) => {
        startX = e.touches[0].clientX;
        touching = true;
      },
      { passive: true }
    );

    galleryEl.addEventListener('touchend', (e) => {
      if (!touching) return;
      touching = false;

      const endX = e.changedTouches[0].clientX;
      const diff = endX - startX;

      if (Math.abs(diff) < 40) return;
      stopAutoplay();
      diff < 0 ? next() : prev();
      startAutoplay();
    });

    let autoplayId = null;
    const shouldAutoplay = galleryEl.id === 'momentos';

    function stopAutoplay() {
      if (autoplayId) clearInterval(autoplayId);
      autoplayId = null;
    }

    function startAutoplay() {
      if (!shouldAutoplay) return;
      stopAutoplay();
      autoplayId = window.setInterval(next, 5200);
    }

    galleryEl.addEventListener('mouseenter', stopAutoplay);
    galleryEl.addEventListener('mouseleave', startAutoplay);
    galleryEl.addEventListener('focusin', stopAutoplay);
    galleryEl.addEventListener('focusout', startAutoplay);

    show(index);
    startAutoplay();
  }

  document.querySelectorAll('.gallery').forEach(initGallerySlider);

  /* =====================================
     7) TRANSIÇÃO ENTRE PÁGINAS (FADE)
     - Ignora âncoras, externos, download e _blank
  ====================================== */
  document.querySelectorAll('a').forEach((link) => {
    const href = (link.getAttribute('href') || '').trim();
    if (!href || href === '#' || href.startsWith('#')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

    const isExternal =
      link.hostname && link.hostname !== window.location.hostname;
    if (isExternal) return;

    if (link.target === '_blank' || link.hasAttribute('download')) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (drawerIsOpen()) closeDrawer();

      body.classList.add('fade-out');
      setTimeout(() => {
        window.location.href = href;
      }, 400);
    });
  });

  window.addEventListener('pageshow', () => {
    body.classList.remove('fade-out');
  });
});

/* ============================
   Carrossel Premium (Momentos)
   - suporta img e video
   - dots automáticos
   - swipe + teclado
   - autoplay inteligente
============================ */
(function initPremiumCarousel() {
  const root = document.querySelector('[data-carousel]');
  if (!root) return;

  const track = root.querySelector('[data-track]');
  const slides = Array.from(root.querySelectorAll('[data-slide]'));
  const prevBtn = root.querySelector('[data-prev]');
  const nextBtn = root.querySelector('[data-next]');
  const dotsWrap = root.querySelector('[data-dots]');

  if (!track || slides.length === 0) return;

  let index = slides.findIndex((s) => s.classList.contains('is-active'));
  if (index < 0) index = 0;

  const dots = slides.map((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pc-dot';
    button.setAttribute('aria-label', `Ir para o slide ${i + 1}`);
    button.addEventListener('click', () => goTo(i));
    dotsWrap?.appendChild(button);
    return button;
  });

  function stopVideosExcept(activeIdx) {
    slides.forEach((slide, i) => {
      const video = slide.querySelector('video');
      if (!video) return;

      if (i !== activeIdx && !video.paused) {
        video.pause();
        video.currentTime = 0;
      }
    });
  }

  function playActiveVideo(activeIdx) {
    const activeSlide = slides[activeIdx];
    const activeVideo = activeSlide?.querySelector('video');
    if (!activeVideo) return;

    activeVideo.muted = true;
    activeVideo.playsInline = true;

    const playPromise = activeVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        /* alguns navegadores podem bloquear autoplay mesmo em muted */
      });
    }
  }

  function setActive(i) {
    slides.forEach((slide, idx) => slide.classList.toggle('is-active', idx === i));
    dots.forEach((dot, idx) => {
      const active = idx === i;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
    stopVideosExcept(i);
    playActiveVideo(i);
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    setActive(index);
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  let startX = 0;
  let touching = false;

  root.addEventListener(
    'touchstart',
    (e) => {
      startX = e.touches[0].clientX;
      touching = true;
    },
    { passive: true }
  );

  root.addEventListener('touchend', (e) => {
    if (!touching) return;
    touching = false;

    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;

    if (Math.abs(diff) < 40) return;
    diff < 0 ? next() : prev();
  });

  let autoplayId = null;

  function stopAutoplay() {
    if (autoplayId) clearInterval(autoplayId);
    autoplayId = null;
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayId = window.setInterval(() => {
      const activeSlide = slides[index];
      const activeVideo = activeSlide?.querySelector('video');
      if (activeVideo && !activeVideo.paused) return;
      next();
    }, 5000);
  }

  root.addEventListener('mouseenter', stopAutoplay);
  root.addEventListener('mouseleave', startAutoplay);
  root.addEventListener('touchstart', stopAutoplay, { passive: true });
  root.addEventListener('touchend', startAutoplay);

  goTo(index);
  startAutoplay();
})();

/* ============================
  Carrossel de Depoimentos
============================ */
(function initTestimonialsCarousel() {
  const DATA_URL = 'data/testimonials.json';
  const STORAGE_KEY = 'kasarao.testimonials';

  const root = document.querySelector('[data-testimonials]');
  if (!root) return;

  const track = root.querySelector('[data-testimonial-track]');
  const prevBtn = root.querySelector('[data-testimonial-prev]');
  const nextBtn = root.querySelector('[data-testimonial-next]');
  const dotsWrap = root.querySelector('[data-testimonial-dots]');

  if (!track) return;

  let slides = [];
  let dots = [];
  let index = 0;
  let autoplayId = null;

  function clampRating(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 5;
    return Math.min(Math.max(Math.round(parsed), 1), 5);
  }

  function normalizeTestimonial(item) {
    if (!item || typeof item !== 'object') return null;

    const author = String(item.author || '').trim();
    const text = String(item.text || '').trim();
    if (!author || !text || item.active === false) return null;

    return {
      author,
      text,
      age: String(item.age || 'Avaliação recente').trim(),
      rating: clampRating(item.rating),
      source: String(item.source || 'Depoimento').trim()
    };
  }

  function normalizePayload(payload) {
    const rawItems = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.testimonials)
        ? payload.testimonials
        : [];

    return rawItems
      .map(normalizeTestimonial)
      .filter(Boolean);
  }

  function shouldUsePreviewStorage() {
    const params = new URLSearchParams(window.location.search);
    return params.get('testimonials') === 'preview' || params.get('depoimentos') === 'preview';
  }

  function loadStoredPreview() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return normalizePayload(JSON.parse(stored));
    } catch (error) {
      return [];
    }
  }

  async function loadRemoteTestimonials() {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${DATA_URL}`);
    }

    return normalizePayload(await response.json());
  }

  async function loadTestimonials() {
    const previewItems = shouldUsePreviewStorage() ? loadStoredPreview() : [];
    if (previewItems.length) return previewItems;

    try {
      const remoteItems = await loadRemoteTestimonials();
      if (remoteItems.length) return remoteItems;
    } catch (error) {
      const fallbackItems = loadStoredPreview();
      if (fallbackItems.length) return fallbackItems;
    }

    return [];
  }

  function createStars(rating) {
    const stars = document.createElement('div');
    stars.className = 'testimonial-stars';
    stars.setAttribute('aria-label', `${rating} de 5 estrelas`);
    stars.textContent = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
    return stars;
  }

  function createTestimonialCard(item, isActive) {
    const article = document.createElement('article');
    article.className = `testimonial-card${isActive ? ' is-active' : ''}`;
    article.setAttribute('data-testimonial-slide', '');

    const meta = document.createElement('div');
    meta.className = 'testimonial-meta';
    meta.append(createStars(item.rating));

    const age = document.createElement('span');
    age.className = 'testimonial-age';
    age.textContent = item.age;
    meta.append(age);

    const quote = document.createElement('blockquote');
    quote.textContent = `“${item.text}”`;

    const footer = document.createElement('div');
    footer.className = 'testimonial-footer';

    const author = document.createElement('p');
    author.className = 'testimonial-author';
    author.textContent = item.author;

    const source = document.createElement('span');
    source.className = 'testimonial-source';
    source.textContent = `${item.source} • ${item.rating} ${item.rating === 1 ? 'estrela' : 'estrelas'} • ${item.age}`;

    footer.append(author, source);
    article.append(meta, quote, footer);

    return article;
  }

  function createStatusCard(message) {
    const article = document.createElement('article');
    article.className = 'testimonial-card is-active is-empty';
    article.setAttribute('data-testimonial-slide', '');

    const meta = document.createElement('div');
    meta.className = 'testimonial-meta';
    meta.append(createStars(5));

    const age = document.createElement('span');
    age.className = 'testimonial-age';
    age.textContent = 'Atualizando';
    meta.append(age);

    const quote = document.createElement('blockquote');
    quote.textContent = message;

    const footer = document.createElement('div');
    footer.className = 'testimonial-footer';

    const author = document.createElement('p');
    author.className = 'testimonial-author';
    author.textContent = 'Kasarão Gastrobar';

    const source = document.createElement('span');
    source.className = 'testimonial-source';
    source.textContent = 'Depoimentos dinâmicos';

    footer.append(author, source);
    article.append(meta, quote, footer);

    return article;
  }

  function renderDots() {
    if (dotsWrap) dotsWrap.textContent = '';

    dots = slides.map((_, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'testimonials-dot';
      button.setAttribute('aria-label', `Ir para o depoimento ${i + 1}`);
      button.addEventListener('click', () => goTo(i));
      dotsWrap?.appendChild(button);
      return button;
    });
  }

  function setCarouselControlsEnabled(enabled) {
    root.classList.toggle('has-single-testimonial', slides.length <= 1);
    prevBtn?.toggleAttribute('disabled', !enabled);
    nextBtn?.toggleAttribute('disabled', !enabled);
  }

  function renderStatus(message) {
    stopAutoplay();
    index = 0;
    track.textContent = '';
    track.append(createStatusCard(message));
    slides = Array.from(root.querySelectorAll('[data-testimonial-slide]'));
    renderDots();
    goTo(0);
    setCarouselControlsEnabled(false);
  }

  function renderTestimonials(items) {
    stopAutoplay();
    index = 0;
    track.textContent = '';

    if (!items.length) {
      renderStatus('Nenhum depoimento cadastrado no momento.');
      return;
    }

    items.forEach((item, i) => {
      track.append(createTestimonialCard(item, i === 0));
    });

    slides = Array.from(root.querySelectorAll('[data-testimonial-slide]'));
    renderDots();
    goTo(0);
    setCarouselControlsEnabled(slides.length > 1);

    if (slides.length > 1) startAutoplay();
  }

  function setActive(i) {
    slides.forEach((slide, idx) => slide.classList.toggle('is-active', idx === i));
    dots.forEach((dot, idx) => {
      const active = idx === i;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }

  function goTo(i) {
    if (!slides.length) return;
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    setActive(index);
  }

  function next() {
    if (slides.length <= 1) return;
    goTo(index + 1);
  }

  function prev() {
    if (slides.length <= 1) return;
    goTo(index - 1);
  }

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  let startX = 0;
  let touching = false;

  root.addEventListener(
    'touchstart',
    (e) => {
      startX = e.touches[0].clientX;
      touching = true;
    },
    { passive: true }
  );

  root.addEventListener('touchend', (e) => {
    if (!touching) return;
    touching = false;

    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;

    if (Math.abs(diff) < 40) return;
    diff < 0 ? next() : prev();
  });

  function stopAutoplay() {
    if (autoplayId) clearInterval(autoplayId);
    autoplayId = null;
  }

  function startAutoplay() {
    if (slides.length <= 1) return;
    stopAutoplay();
    autoplayId = window.setInterval(next, 6500);
  }

  root.addEventListener('mouseenter', stopAutoplay);
  root.addEventListener('mouseleave', startAutoplay);
  root.addEventListener('touchstart', stopAutoplay, { passive: true });
  root.addEventListener('touchend', startAutoplay);

  renderStatus('Buscando depoimentos atualizados.');

  loadTestimonials()
    .then(renderTestimonials)
    .catch(() => {
      renderStatus('Não foi possível carregar os depoimentos no momento.');
    });
})();
