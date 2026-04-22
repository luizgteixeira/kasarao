(function initTestimonialsAdmin() {
  const API_URL = '/api/testimonials';
  const DATA_URL = 'data/testimonials.json';
  const STORAGE_KEY = 'kasarao.testimonials';

  const form = document.querySelector('[data-testimonial-form]');
  const formTitle = document.querySelector('[data-form-title]');
  const submitButton = document.querySelector('[data-submit-button]');
  const clearButton = document.querySelector('[data-clear-form]');
  const list = document.querySelector('[data-testimonial-list]');
  const count = document.querySelector('[data-testimonial-count]');
  const status = document.querySelector('[data-admin-status]');
  const openFileButton = document.querySelector('[data-open-file]');
  const saveFileButton = document.querySelector('[data-save-file]');
  const saveSiteButton = document.querySelector('[data-save-site]');
  const importFileButton = document.querySelector('[data-import-file]');
  const exportFileButton = document.querySelector('[data-export-file]');
  const fileInput = document.querySelector('[data-file-input]');

  if (!form || !list) return;

  let testimonials = [];
  let fileHandle = null;
  let canSaveDirectly = false;

  function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function isTouchLikeDevice() {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }

  function hideVisibleTooltips(exceptButton = null) {
    document.querySelectorAll('.admin-button.is-tooltip-visible').forEach((button) => {
      if (button !== exceptButton) button.classList.remove('is-tooltip-visible');
    });
  }

  function initTouchTooltips() {
    document.addEventListener(
      'click',
      (event) => {
        const button = event.target.closest('.admin-button[data-tooltip]');
        if (!button || !isTouchLikeDevice()) return;

        if (!button.classList.contains('is-tooltip-visible')) {
          event.preventDefault();
          event.stopPropagation();
          hideVisibleTooltips(button);
          button.classList.add('is-tooltip-visible');

          window.setTimeout(() => {
            button.classList.remove('is-tooltip-visible');
          }, 2600);
        }
      },
      true
    );

    document.addEventListener('click', (event) => {
      if (event.target.closest('.admin-button[data-tooltip]')) return;
      hideVisibleTooltips();
    });
  }

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
      age: String(item.age || 'Avaliação recente').trim(),
      rating: clampRating(item.rating),
      source: String(item.source || 'Google Reviews').trim(),
      text,
      active: item.active !== false
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

  function serializeTestimonials() {
    return `${JSON.stringify(testimonials, null, 2)}\n`;
  }

  function saveDraft() {
    window.localStorage.setItem(STORAGE_KEY, serializeTestimonials());
  }

  function resetForm() {
    form.reset();
    form.elements.editIndex.value = '';
    form.elements.source.value = 'Google Reviews';
    form.elements.rating.value = '5';
    form.elements.active.checked = true;
    formTitle.textContent = 'Novo depoimento';
    submitButton.textContent = 'Adicionar depoimento';
    submitButton.dataset.tooltip = 'Adiciona este depoimento à lista abaixo.';
  }

  function getFormItem() {
    return normalizeTestimonial({
      author: form.elements.author.value,
      age: form.elements.age.value,
      rating: form.elements.rating.value,
      source: form.elements.source.value,
      text: form.elements.text.value,
      active: form.elements.active.checked
    });
  }

  function setFormItem(item, index) {
    form.elements.editIndex.value = String(index);
    form.elements.author.value = item.author;
    form.elements.age.value = item.age;
    form.elements.rating.value = String(item.rating);
    form.elements.source.value = item.source;
    form.elements.text.value = item.text;
    form.elements.active.checked = item.active;
    formTitle.textContent = 'Editar depoimento';
    submitButton.textContent = 'Salvar alterações';
    submitButton.dataset.tooltip = 'Salva as mudanças deste depoimento na lista abaixo.';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function moveItem(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= testimonials.length) return;

    const [item] = testimonials.splice(index, 1);
    testimonials.splice(target, 0, item);
    syncState('Ordem dos depoimentos atualizada.');
  }

  function deleteItem(index) {
    const item = testimonials[index];
    if (!item) return;

    const confirmed = window.confirm(`Excluir o depoimento de ${item.author}?`);
    if (!confirmed) return;

    testimonials.splice(index, 1);
    resetForm();
    syncState('Depoimento excluído do rascunho.');
  }

  function toggleItem(index) {
    const item = testimonials[index];
    if (!item) return;

    item.active = !item.active;
    syncState(item.active ? 'Depoimento marcado para aparecer no site.' : 'Depoimento ocultado do site.');
  }

  function createButton(label, action, tooltip, modifier = 'admin-button-secondary') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `admin-button ${modifier}`;
    button.textContent = label;
    if (tooltip) {
      button.dataset.tooltip = tooltip;
    }
    button.addEventListener('click', action);
    return button;
  }

  function renderList() {
    list.textContent = '';

    if (count) {
      count.textContent = `${testimonials.length} ${testimonials.length === 1 ? 'depoimento' : 'depoimentos'}`;
    }

    if (!testimonials.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = 'Nenhum depoimento cadastrado ainda.';
      list.append(empty);
      return;
    }

    testimonials.forEach((item, index) => {
      const article = document.createElement('article');
      article.className = `admin-item${item.active ? '' : ' is-inactive'}`;

      const title = document.createElement('h3');
      title.textContent = item.author;

      const meta = document.createElement('div');
      meta.className = 'admin-item-meta';
      meta.textContent = `${item.source} • ${item.rating} ${item.rating === 1 ? 'estrela' : 'estrelas'} • ${item.age} • ${item.active ? 'Visível no site' : 'Oculto'}`;

      const text = document.createElement('p');
      text.textContent = item.text;

      const actions = document.createElement('div');
      actions.className = 'admin-item-actions';
      actions.append(
        createButton('Editar', () => setFormItem(item, index), 'Leva este depoimento para o formulário para alterar.'),
        createButton(item.active ? 'Ocultar' : 'Mostrar', () => toggleItem(index), item.active ? 'Tira este depoimento do site sem apagar.' : 'Mostra este depoimento no site novamente.'),
        createButton('Subir', () => moveItem(index, -1), 'Move este depoimento para aparecer antes.'),
        createButton('Descer', () => moveItem(index, 1), 'Move este depoimento para aparecer depois.'),
        createButton('Excluir', () => deleteItem(index), 'Apaga este depoimento da lista.')
      );

      article.append(title, meta, text, actions);
      list.append(article);
    });
  }

  function syncState(message) {
    saveDraft();
    renderList();
    const suffix = canSaveDirectly ? ' Clique em Salvar no site para concluir.' : '';
    setStatus(`${message}${suffix}`);
  }

  function setDirectSaveMode(enabled) {
    canSaveDirectly = enabled;
    if (saveSiteButton) saveSiteButton.hidden = !enabled;
  }

  async function loadFromApi() {
    const response = await fetch(API_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Salvamento direto indisponível.');
    }

    return normalizePayload(await response.json());
  }

  async function loadFromRemote() {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Não foi possível carregar ${DATA_URL}`);
    }

    return normalizePayload(await response.json());
  }

  function loadFromDraft() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? normalizePayload(JSON.parse(stored)) : [];
    } catch (error) {
      return [];
    }
  }

  async function loadInitialTestimonials() {
    try {
      testimonials = await loadFromApi();
      setDirectSaveMode(true);
      saveDraft();
      renderList();
      setStatus('Lista atual do site carregada. Depois de editar, clique em Salvar no site.');
      return;
    } catch (error) {
      setDirectSaveMode(false);
    }

    const draft = loadFromDraft();
    if (draft.length) {
      testimonials = draft;
      renderList();
      setStatus('Rascunho carregado. No celular, revise e baixe uma cópia. Para salvar direto no site, use o computador onde o site está salvo.');
      return;
    }

    try {
      testimonials = await loadFromRemote();
      syncState('Depoimentos publicados carregados.');
    } catch (error) {
      testimonials = [];
      renderList();
      setStatus('Não foi possível carregar a lista publicada. Traga uma lista salva para começar.', true);
    }
  }

  async function openJsonFile() {
    if (!window.showOpenFilePicker) {
      setStatus('Este navegador não permite salvar direto. Use Baixar lista atualizada.', true);
      return;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'Lista de depoimentos',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });

      const file = await handle.getFile();
      const parsed = JSON.parse(await file.text());
      const items = normalizePayload(parsed);

      fileHandle = handle;
      testimonials = items;
      saveFileButton.disabled = false;
      resetForm();
      syncState('Arquivo do site escolhido. Agora você pode salvar direto nele pelas opções técnicas.');
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus('Não foi possível abrir a lista selecionada.', true);
      }
    }
  }

  async function saveJsonFile() {
    if (!fileHandle) {
      setStatus('Abra a lista atual antes de salvar alterações nela.', true);
      return;
    }

    try {
      const writable = await fileHandle.createWritable();
      await writable.write(serializeTestimonials());
      await writable.close();
      setStatus('Alterações salvas. Os depoimentos já estão prontos para aparecer no site.');
    } catch (error) {
      setStatus('Não foi possível salvar direto. Use Baixar lista atualizada como alternativa.', true);
    }
  }

  async function saveToSite() {
    if (!canSaveDirectly) {
      setStatus('Esta página foi aberta sem o modo de salvamento automático. Feche esta aba e abra novamente pelo arquivo iniciar-admin-depoimentos.', true);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serializeTestimonials()
      });

      if (!response.ok) {
        throw new Error('Não foi possível salvar.');
      }

      saveDraft();
      setStatus('Alterações salvas no site. Os depoimentos publicados já foram atualizados.');
    } catch (error) {
      setStatus('Não foi possível salvar no site. Use Baixar cópia de segurança como alternativa.', true);
    }
  }

  function importJsonFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        testimonials = normalizePayload(JSON.parse(String(reader.result || '[]')));
        fileHandle = null;
        saveFileButton.disabled = true;
        resetForm();
        syncState('Lista salva trazida para o rascunho.');
      } catch (error) {
        setStatus('O arquivo escolhido não parece ser uma lista válida de depoimentos.', true);
      }
    });
    reader.readAsText(file);
  }

  function exportJsonFile() {
    const blob = new Blob([serializeTestimonials()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lista-de-depoimentos.json';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('Cópia de segurança baixada. Use esse arquivo se precisar publicar manualmente.');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const item = getFormItem();
    if (!item) {
      setStatus('Preencha nome e depoimento antes de salvar.', true);
      return;
    }

    const editIndexValue = form.elements.editIndex.value;
    const editIndex = Number(editIndexValue);
    if (editIndexValue !== '' && Number.isInteger(editIndex) && editIndex >= 0 && editIndex < testimonials.length) {
      testimonials[editIndex] = item;
      syncState('Depoimento atualizado no rascunho.');
    } else {
      testimonials.unshift(item);
      syncState('Depoimento adicionado ao rascunho.');
    }

    resetForm();
  });

  clearButton?.addEventListener('click', resetForm);
  openFileButton?.addEventListener('click', openJsonFile);
  saveFileButton?.addEventListener('click', saveJsonFile);
  saveSiteButton?.addEventListener('click', saveToSite);
  importFileButton?.addEventListener('click', () => fileInput?.click());
  exportFileButton?.addEventListener('click', exportJsonFile);
  fileInput?.addEventListener('change', () => {
    importJsonFile(fileInput.files?.[0]);
    fileInput.value = '';
  });

  resetForm();
  initTouchTooltips();
  loadInitialTestimonials();
})();
