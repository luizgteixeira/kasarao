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

  function applyTheme(light) {
    const isLightMode = !!light;

    body.classList.toggle('light-mode', isLightMode);

    // ✅ token profissional para CSS e debugging
    body.dataset.theme = isLightMode ? 'light' : 'dark';

    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    syncThemeToggles();
    setThemeMetaColor(isLightMode);
  }

  (function initTheme() {
    const saved = localStorage.getItem('theme');
    applyTheme(saved === 'light'); // default: dark
  })();

  if (toggleDesktop)
    toggleDesktop.addEventListener('change', () =>
      applyTheme(toggleDesktop.checked)
    );
  if (toggleMobile)
    toggleMobile.addEventListener('change', () =>
      applyTheme(toggleMobile.checked)
    );

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
          if (nextToday) return { day: d, start: nextToday.start };
        } else {
          return { day: d, start: slots[0].start };
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
        ? `✨ Estamos fechados agora. Abrimos ${weekdayName(next.day)} às ${fmt(next.start)}.`
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

    let index = slides.findIndex((s) => s.classList.contains('active'));
    if (index < 0) index = 0;

    function show(i) {
      slides.forEach((s) => s.classList.toggle('active', s === slides[i]));
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
      next();
    });

    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      prev();
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
      diff < 0 ? next() : prev();
    });

    show(index);
  }

  document.querySelectorAll('.gallery').forEach(initGallerySlider);

  /* =====================================
     7) TRANSIÇÃO ENTRE PÁGINAS (FADE)
     - Ignora âncoras, externos, download e _blank
  ====================================== */
  document.querySelectorAll('a').forEach((link) => {
    const href = (link.getAttribute('href') || '').trim();
    if (!href || href === '#' || href.startsWith('#')) return;

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

  // Dots
  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pc-dot';
    b.setAttribute('aria-label', `Ir para o slide ${i + 1}`);
    b.addEventListener('click', () => goTo(i));
    dotsWrap?.appendChild(b);
    return b;
  });

  function stopVideosExcept(activeIdx) {
    slides.forEach((s, i) => {
      if (i === activeIdx) return;
      const v = s.querySelector('video');
      if (v && !v.paused) v.pause();
    });
  }

  function setActive(i) {
    slides.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
    dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
    stopVideosExcept(i);
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

  // Teclado (setas)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // Swipe básico
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

  // Estado inicial
  goTo(index);
})();

// AUTOPLAY INTELIGENTE (pausa ao interagir; não atrapalha vídeo)
let autoplayId = null;

function startAutoplay(){
  stopAutoplay();
  autoplayId = setInterval(() => {
    const active = slides[index];
    const v = active?.querySelector('video');
    if (v && !v.paused) return; // se vídeo tocando, não avança
    next();
  }, 5000);
}

function stopAutoplay(){
  if (autoplayId) clearInterval(autoplayId);
  autoplayId = null;
}

root.addEventListener('mouseenter', stopAutoplay);
root.addEventListener('mouseleave', startAutoplay);
root.addEventListener('touchstart', stopAutoplay, { passive: true });
root.addEventListener('touchend', startAutoplay);

startAutoplay();
