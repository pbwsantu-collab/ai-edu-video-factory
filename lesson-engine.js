/**
 * Phase 2 Lesson Engine UI and generation flow.
 * Wired from app.js to avoid a circular import.
 */
export function createLessonEngine(deps) {
  const {
    state, $, $$, toast, escapeHtml, formatDate,
    saveProject, listProjects, emptyLessonFromText, getProviders, render
  } = deps;

// ---------- Lesson Engine (Phase 2) ----------
function ensureLessonData(p) {
  if (!p.lessonData) {
    p.lessonData = emptyLessonFromText(p.textContent || '', 'manual', 'none');
  }
  if (p.lessonData.originalText == null || p.lessonData.originalText === '') {
    p.lessonData.originalText = p.textContent || '';
  }
  return p.lessonData;
}

function renderLessonEngine() {
  const p = state.currentProject;
  if (!p) return '<p>Project not found.</p>';
  const ld = ensureLessonData(p);
  const provider = getProviders()[state.ai.providerId] || getProviders().manual;
  const tab = state.lessonTab;
  const sourceWarning = (!p.hasVerifiedSource && !(p.textContent || '').trim())
    ? `<div class="error-msg" role="alert">No verified textbook source. Add text or import a PDF before relying on AI output.</div>`
    : (!p.hasVerifiedSource && p.chapterName
      ? `<div class="error-msg" role="alert">Chapter name is set but source text was not imported from a file. Treat AI output as unverified.</div>`
      : '');

  const tabs = [
    ['overview', 'Overview'],
    ['sentences', 'Sentences'],
    ['vocab', 'Vocabulary'],
    ['mcq', 'MCQs'],
    ['scenes', 'Scene notes'],
    ['extras', 'Subject extras']
  ];

  let panel = '';
  if (tab === 'overview') {
    panel = `
      <div class="form-section">
        <h3>Original textbook text <span class="badge">source</span></h3>
        <textarea id="ld-original" rows="5" aria-label="Original textbook text">${escapeHtml(ld.originalText || p.textContent || '')}</textarea>
        <p class="hint">Preserved separately from AI explanations. Edit only if you need to correct extraction.</p>
      </div>
      <div class="form-section">
        <h3>English explanation <span class="badge">AI / manual</span></h3>
        <textarea id="ld-en" rows="5">${escapeHtml(ld.englishExplanation || '')}</textarea>
      </div>
      <div class="form-section">
        <h3>Bengali explanation <span class="badge">AI / manual</span></h3>
        <textarea id="ld-bn" rows="5" lang="bn">${escapeHtml(ld.bengaliExplanation || '')}</textarea>
      </div>
      <div class="form-section">
        <h3>Important concepts</h3>
        <textarea id="ld-concepts" rows="3" placeholder="One concept per line">${escapeHtml((ld.concepts || []).join('\n'))}</textarea>
      </div>`;
  } else if (tab === 'sentences') {
    panel = `
      <div class="form-section">
        <h3>Sentence meanings (English ↔ Bengali)</h3>
        <div id="ld-sentences">
          ${(ld.sentences || []).map((s, i) => `
            <div class="pair-row" data-idx="${i}">
              <input type="text" class="ld-sent-en" value="${escapeHtml(s.en)}" placeholder="English" aria-label="English sentence ${i + 1}" />
              <input type="text" class="ld-sent-bn" lang="bn" value="${escapeHtml(s.bn)}" placeholder="বাংলা" aria-label="Bengali sentence ${i + 1}" />
              <button type="button" class="btn btn-ghost btn-rm-sent" data-idx="${i}" aria-label="Remove">✕</button>
            </div>`).join('') || '<p class="hint">No sentences yet.</p>'}
        </div>
        <button type="button" class="btn btn-secondary" id="btn-add-sent" style="margin-top:0.75rem">+ Add sentence pair</button>
      </div>`;
  } else if (tab === 'vocab') {
    panel = `
      <div class="form-section">
        <h3>Vocabulary</h3>
        <div id="ld-vocab">
          ${(ld.vocabulary || []).map((v, i) => `
            <div class="pair-row" data-idx="${i}">
              <input type="text" class="ld-v-word" value="${escapeHtml(v.word)}" placeholder="Word" aria-label="Word ${i + 1}" />
              <input type="text" class="ld-v-bn" lang="bn" value="${escapeHtml(v.meaningBn)}" placeholder="বাংলা অর্থ" aria-label="Bengali meaning ${i + 1}" />
              <input type="text" class="ld-v-pron" value="${escapeHtml(v.pronunciation)}" placeholder="Pronunciation" aria-label="Pronunciation ${i + 1}" />
              <button type="button" class="btn btn-ghost btn-rm-vocab" data-idx="${i}" aria-label="Remove">✕</button>
            </div>`).join('') || '<p class="hint">No vocabulary yet.</p>'}
        </div>
        <button type="button" class="btn btn-secondary" id="btn-add-vocab" style="margin-top:0.75rem">+ Add word</button>
      </div>`;
  } else if (tab === 'mcq') {
    panel = `
      <div class="form-section">
        <h3>Multiple-choice questions</h3>
        <div id="ld-mcqs">
          ${(ld.mcqs || []).map((m, i) => `
            <div class="mcq-card" data-idx="${i}">
              <label>Question ${i + 1}</label>
              <input type="text" class="ld-mcq-q" value="${escapeHtml(m.question)}" />
              ${(m.options || []).map((o, oi) => `
                <div class="mcq-opt">
                  <input type="radio" name="mcq-correct-${i}" class="ld-mcq-correct" value="${oi}" ${m.correctIndex === oi ? 'checked' : ''} aria-label="Correct option ${oi + 1}" />
                  <input type="text" class="ld-mcq-opt" data-oi="${oi}" value="${escapeHtml(o)}" aria-label="Option ${oi + 1}" />
                </div>`).join('')}
              <label>Explanation</label>
              <textarea class="ld-mcq-exp" rows="2">${escapeHtml(m.explanation || '')}</textarea>
              <button type="button" class="btn btn-ghost btn-rm-mcq" data-idx="${i}">Remove MCQ</button>
            </div>`).join('') || '<p class="hint">No MCQs yet.</p>'}
        </div>
        <button type="button" class="btn btn-secondary" id="btn-add-mcq" style="margin-top:0.75rem">+ Add MCQ</button>
      </div>`;
  } else if (tab === 'scenes') {
    panel = `
      <div class="form-section">
        <h3>Scene-planning notes <span class="badge not-implemented">for future animation</span></h3>
        <textarea id="ld-scenes" rows="8" placeholder="One note per line">${escapeHtml((ld.sceneNotes || []).join('\n'))}</textarea>
      </div>`;
  } else if (tab === 'extras') {
    const ex = ld.subjectExtras || {};
    panel = `
      <div class="form-section">
        <h3>Subject adaptations (${escapeHtml(p.subject || 'general')})</h3>
        <pre class="code-block" id="ld-extras-view">${escapeHtml(JSON.stringify(ex, null, 2))}</pre>
        <p class="hint">Structured extras (math steps, timelines, diagram instructions). Edit as JSON below if needed.</p>
        <textarea id="ld-extras" rows="10">${escapeHtml(JSON.stringify(ex, null, 2))}</textarea>
      </div>`;
  }

  return `
    <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem">
      <button class="btn btn-secondary" id="btn-back-editor-from-lesson">← Editor</button>
      <button class="btn btn-secondary" id="btn-back-dash-from-lesson">Projects</button>
      <button class="btn btn-primary" id="btn-save-lesson" ${state.ai.generating ? 'disabled' : ''}>Save lesson</button>
      <button class="btn ${ld.approved ? 'btn-secondary' : 'btn-primary'}" id="btn-approve-lesson" ${state.ai.generating ? 'disabled' : ''}>
        ${ld.approved ? 'Approved ✓' : 'Approve for next stages'}
      </button>
    </div>
    ${sourceWarning}
    <div class="form-section">
      <h3>AI provider</h3>
      <div class="form-group">
        <label for="ai-provider">Provider</label>
        <select id="ai-provider">
          ${Object.values(getProviders()).map(pr =>
            `<option value="${pr.id}" ${state.ai.providerId === pr.id ? 'selected' : ''}>${escapeHtml(pr.label)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="ai-model">Model (Ollama only)</label>
        <input type="text" id="ai-model" value="${escapeHtml(state.ai.model)}" placeholder="e.g. llama3.2" />
        <p class="hint">Leave blank to use the first model reported by Ollama.</p>
      </div>
      <div class="form-group">
        <label for="ai-ollama-url">Ollama base URL</label>
        <input type="text" id="ai-ollama-url" value="${escapeHtml(localStorage.getItem('aief_ollama_url') || 'http://127.0.0.1:11434')}" />
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
        <button type="button" class="btn btn-secondary" id="btn-check-ai" ${state.ai.generating ? 'disabled' : ''}>Check provider</button>
        <button type="button" class="btn btn-primary" id="btn-generate-lesson" ${state.ai.generating ? 'disabled' : ''}>
          ${state.ai.generating ? 'Generating…' : 'Generate structured lesson'}
        </button>
      </div>
      <p class="hint" id="ai-status" style="margin-top:0.75rem" aria-live="polite">${escapeHtml(state.ai.status || state.ai.lastCheck || 'Select a provider. Manual and Test work offline. Ollama requires a local server.')}</p>
      <p class="hint">Paid cloud AI is <span class="badge not-implemented">not connected</span>. No API keys are stored in this app.</p>
    </div>
    <div class="wizard-steps" role="tablist" aria-label="Lesson sections">
      ${tabs.map(([id, label]) =>
        `<button type="button" class="step-indicator ${tab === id ? 'active' : ''}" data-tab="${id}" role="tab" aria-selected="${tab === id}">${label}</button>`
      ).join('')}
    </div>
    <div id="lesson-panel">${panel}</div>
    <p class="hint" style="margin-top:1rem">
      Provider: ${escapeHtml(ld.provider || '—')} · Model: ${escapeHtml(ld.model || '—')}
      ${ld.generatedAt ? ' · Generated ' + formatDate(ld.generatedAt) : ''}
      ${ld.approved && ld.approvedAt ? ' · Approved ' + formatDate(ld.approvedAt) : ''}
    </p>`;
}

function bindLessonEngine() {
  const p = state.currentProject;
  if (!p) return;
  ensureLessonData(p);

  $('#btn-back-editor-from-lesson')?.addEventListener('click', async () => {
    collectLessonEdits();
    await saveProject(p);
    state.view = 'editor';
    render();
  });
  $('#btn-back-dash-from-lesson')?.addEventListener('click', async () => {
    collectLessonEdits();
    await saveProject(p);
    state.view = 'dashboard';
    state.projects = await listProjects();
    render();
  });
  $('#btn-save-lesson')?.addEventListener('click', async () => {
    collectLessonEdits();
    try {
      await saveProject(p);
      toast('Lesson data saved.', 'success');
    } catch (err) {
      toast('Save failed: ' + (err.message || err), 'error');
    }
  });
  $('#btn-approve-lesson')?.addEventListener('click', async () => {
    collectLessonEdits();
    const ld = p.lessonData;
    if (!ld.englishExplanation && !ld.mcqs?.length) {
      toast('Add or generate content before approving.', 'error');
      return;
    }
    ld.approved = !ld.approved;
    ld.approvedAt = ld.approved ? Date.now() : null;
    await saveProject(p);
    toast(ld.approved ? 'Lesson approved for future stages.' : 'Approval removed.', 'success');
    render();
  });

  $$('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      collectLessonEdits();
      state.lessonTab = btn.dataset.tab;
      render();
    });
  });

  $('#ai-provider')?.addEventListener('change', e => {
    state.ai.providerId = e.target.value;
    state.ai.status = '';
    state.ai.lastCheck = null;
  });
  $('#ai-model')?.addEventListener('change', e => { state.ai.model = e.target.value.trim(); });
  $('#ai-ollama-url')?.addEventListener('change', e => {
    const url = e.target.value.trim() || 'http://127.0.0.1:11434';
    localStorage.setItem('aief_ollama_url', url);
    getProviders().ollama.baseUrl = url.replace(/\/$/, '');
  });

  $('#btn-check-ai')?.addEventListener('click', async () => {
    const provider = getProviders()[state.ai.providerId];
    if (!provider) return;
    state.ai.status = 'Checking…';
    render();
    const result = await provider.checkAvailability();
    state.ai.lastCheck = result.message;
    state.ai.status = result.message;
    if (result.models?.length && !state.ai.model) {
      state.ai.model = result.models[0];
    }
    toast(result.available ? 'Provider available.' : 'Provider unavailable.', result.available ? 'success' : 'error');
    render();
  });

  $('#btn-generate-lesson')?.addEventListener('click', async () => {
    await runLessonGeneration();
  });

  // Tab-specific editors
  $('#btn-add-sent')?.addEventListener('click', () => {
    collectLessonEdits();
    p.lessonData.sentences.push({ en: '', bn: '' });
    render();
  });
  $$('.btn-rm-sent').forEach(btn => {
    btn.addEventListener('click', () => {
      collectLessonEdits();
      p.lessonData.sentences.splice(+btn.dataset.idx, 1);
      render();
    });
  });
  $('#btn-add-vocab')?.addEventListener('click', () => {
    collectLessonEdits();
    p.lessonData.vocabulary.push({ word: '', meaningBn: '', pronunciation: '' });
    render();
  });
  $$('.btn-rm-vocab').forEach(btn => {
    btn.addEventListener('click', () => {
      collectLessonEdits();
      p.lessonData.vocabulary.splice(+btn.dataset.idx, 1);
      render();
    });
  });
  $('#btn-add-mcq')?.addEventListener('click', () => {
    collectLessonEdits();
    p.lessonData.mcqs.push({
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: ''
    });
    render();
  });
  $$('.btn-rm-mcq').forEach(btn => {
    btn.addEventListener('click', () => {
      collectLessonEdits();
      p.lessonData.mcqs.splice(+btn.dataset.idx, 1);
      render();
    });
  });
}

function collectLessonEdits() {
  const p = state.currentProject;
  if (!p?.lessonData) return;
  const ld = p.lessonData;
  const tab = state.lessonTab;

  if (tab === 'overview') {
    if ($('#ld-original')) ld.originalText = $('#ld-original').value;
    if ($('#ld-en')) ld.englishExplanation = $('#ld-en').value;
    if ($('#ld-bn')) ld.bengaliExplanation = $('#ld-bn').value;
    if ($('#ld-concepts')) {
      ld.concepts = $('#ld-concepts').value.split('\n').map(s => s.trim()).filter(Boolean);
    }
  } else if (tab === 'sentences') {
    ld.sentences = $$('#ld-sentences .pair-row').map(row => ({
      en: row.querySelector('.ld-sent-en')?.value || '',
      bn: row.querySelector('.ld-sent-bn')?.value || ''
    }));
  } else if (tab === 'vocab') {
    ld.vocabulary = $$('#ld-vocab .pair-row').map(row => ({
      word: row.querySelector('.ld-v-word')?.value || '',
      meaningBn: row.querySelector('.ld-v-bn')?.value || '',
      pronunciation: row.querySelector('.ld-v-pron')?.value || ''
    }));
  } else if (tab === 'mcq') {
    ld.mcqs = $$('#ld-mcqs .mcq-card').map(card => {
      const options = $$('.ld-mcq-opt', card).map(i => i.value);
      const checked = card.querySelector('.ld-mcq-correct:checked');
      return {
        question: card.querySelector('.ld-mcq-q')?.value || '',
        options,
        correctIndex: checked ? +checked.value : 0,
        explanation: card.querySelector('.ld-mcq-exp')?.value || ''
      };
    });
  } else if (tab === 'scenes') {
    if ($('#ld-scenes')) {
      ld.sceneNotes = $('#ld-scenes').value.split('\n').map(s => s.trim()).filter(Boolean);
    }
  } else if (tab === 'extras') {
    if ($('#ld-extras')) {
      try {
        ld.subjectExtras = JSON.parse($('#ld-extras').value || '{}');
      } catch {
        toast('Subject extras JSON is invalid — not saved.', 'error');
      }
    }
  }
}

async function runLessonGeneration() {
  const p = state.currentProject;
  if (!p) return;
  const text = (p.textContent || p.lessonData?.originalText || '').trim();
  if (!text) {
    toast('Add textbook text (or import a PDF) before generating.', 'error');
    return;
  }
  if (p.chapterName && !p.hasVerifiedSource) {
    toast('Warning: chapter name without verified file source. Generation will still run.', 'error');
  }

  const provider = getProviders()[state.ai.providerId];
  if (!provider) {
    toast('Unknown provider.', 'error');
    return;
  }

  // Never fake success for Ollama when unavailable
  if (provider.id === 'ollama') {
    const avail = await provider.checkAvailability();
    if (!avail.available) {
      state.ai.status = avail.message;
      state.ai.lastCheck = avail.message;
      toast(avail.message, 'error');
      render();
      return;
    }
  }

  state.ai.generating = true;
  state.ai.status = 'Starting generation…';
  render();

  try {
    const lesson = await provider.generateLesson({
      text,
      classLevel: p.classLevel,
      subject: p.subject,
      language: p.language,
      model: state.ai.model || undefined,
      onStatus: (msg) => {
        state.ai.status = msg;
        const el = $('#ai-status');
        if (el) el.textContent = msg;
      }
    });
    // Preserve approval state only if regenerating same content intentionally clears it
    lesson.approved = false;
    lesson.approvedAt = null;
    p.lessonData = lesson;
    // Keep original project text
    if (!p.textContent) p.textContent = text;
    await saveProject(p);
    state.ai.status = `Generated with ${provider.label}` + (lesson.model ? ` (${lesson.model})` : '');
    toast('Structured lesson ready for review.', 'success');
  } catch (err) {
    console.error(err);
    state.ai.status = err.message || String(err);
    toast(err.message || 'Generation failed.', 'error');
  } finally {
    state.ai.generating = false;
    render();
  }
}


  return { renderLessonEngine, bindLessonEngine, ensureLessonData };
}
