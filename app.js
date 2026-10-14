/**
 * AI Education Video Factory – Phase 1 + Phase 2 (AI Lesson Engine)
 * Local-first PWA with IndexedDB project storage.
 * Animation engine and video export are NOT implemented yet.
 */

import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';
import { createProviderRegistry, emptyLessonFromText } from './ai-providers.js';
import { extractTextFromPdf, extractTextFromImage, validateImportFile } from './pdf-extract.js';
import { createLessonEngine } from './lesson-engine.js';

// ---------- Constants ----------
const DB_NAME = 'ai-edu-video-factory';
const DB_VERSION = 2;
const STORE = 'projects';

const CLASSES = ['Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
  'Class 1', 'Class 2', 'Class 3', 'Class 4'];
const SUBJECTS = [
  'English', 'Bengali', 'Mathematics', 'Physical Science', 'Life Science',
  'History', 'Geography', 'EVS', 'Computer Science',
  'Science', 'Physics', 'Chemistry', 'Biology', 'Hindi', 'Social Studies', 'Other'
];
const LANGUAGES = ['English', 'Bengali', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu'];
const ANIM_MODES = [
  { id: '2d-cartoon', label: '2D Cartoon' },
  { id: 'whiteboard', label: 'Whiteboard' },
  { id: 'explainer', label: 'Explainer' },
  { id: 'story', label: 'Story Mode' },
  { id: 'minimal', label: 'Minimal Motion' }
];

const AI_PROVIDERS = createProviderRegistry(
  (typeof localStorage !== 'undefined' && localStorage.getItem('aief_ollama_url')) || 'http://127.0.0.1:11434'
);

// ---------- DB ----------
let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
          store.createIndex('title', 'title');
        }
        // v2: lessonData lives on each project document. Existing rows stay valid.
        void oldVersion;
      }
    });
  }
  return dbPromise;
}

async function listProjects() {
  const db = await getDB();
  const all = await db.getAll(STORE);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function getProject(id) {
  const db = await getDB();
  return db.get(STORE, id);
}

async function saveProject(project) {
  const db = await getDB();
  project.updatedAt = Date.now();
  if (!project.createdAt) project.createdAt = project.updatedAt;
  await db.put(STORE, project);
  return project;
}

async function deleteProject(id) {
  const db = await getDB();
  await db.delete(STORE, id);
}

function generateId() {
  return 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

// ---------- State ----------
const state = {
  view: 'dashboard', // dashboard | create | editor | storyboard | lesson
  projects: [],
  currentProject: null,
  createStep: 1,
  form: {
    title: '',
    classLevel: '',
    subject: '',
    language: 'English',
    animMode: '2d-cartoon',
    textContent: '',
    importedFiles: [], // { name, type, size, dataUrl?, extractedText? }
    chapterName: '',
    hasVerifiedSource: false
  },
  editorSceneIndex: 0,
  errors: {},
  ai: {
    providerId: 'manual',
    model: '',
    status: '',
    generating: false,
    lastCheck: null
  },
  lessonTab: 'overview' // overview | sentences | vocab | mcq | scenes | extras
};

// ---------- UI Helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function toast(msg, type = 'info') {
  const container = $('#toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.setAttribute('role', 'status');
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

// ---------- Views ----------
function render() {
  const main = $('#main-content');
  const titleEl = $('#app-title');
  const newBtn = $('#btn-new-project');

  if (state.view === 'dashboard') {
    titleEl.textContent = 'AI Edu Video Factory';
    newBtn.hidden = false;
    main.innerHTML = renderDashboard();
    bindDashboard();
  } else if (state.view === 'create') {
    titleEl.textContent = 'Create Lesson';
    newBtn.hidden = true;
    main.innerHTML = renderCreateWizard();
    bindCreateWizard();
  } else if (state.view === 'editor') {
    titleEl.textContent = state.currentProject?.title || 'Lesson Editor';
    newBtn.hidden = true;
    main.innerHTML = renderEditor();
    bindEditor();
  } else if (state.view === 'storyboard') {
    titleEl.textContent = 'Storyboard – ' + (state.currentProject?.title || '');
    newBtn.hidden = true;
    main.innerHTML = renderStoryboard();
    bindStoryboard();
  } else if (state.view === 'lesson') {
    titleEl.textContent = 'Lesson Engine – ' + (state.currentProject?.title || '');
    newBtn.hidden = true;
    main.innerHTML = renderLessonEngine();
    bindLessonEngine();
  }
}

function renderDashboard() {
  if (state.projects.length === 0) {
    return `
      <div class="empty-state">
        <h3>No lessons yet</h3>
        <p>Create your first educational video lesson. All data stays on this device.</p>
        <button class="btn btn-primary" id="empty-create">+ Create Lesson</button>
      </div>`;
  }
  return `
    <div class="dashboard-header">
      <h2>Your Projects</h2>
      <span class="badge">${state.projects.length} project${state.projects.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="project-grid" role="list">
      ${state.projects.map(p => `
        <article class="project-card" role="listitem" data-id="${p.id}" tabindex="0">
          <h3>${escapeHtml(p.title)}</h3>
          <div class="project-meta">
            <span>${escapeHtml(p.classLevel || '—')}</span>
            <span>${escapeHtml(p.subject || '—')}</span>
            <span>${escapeHtml(p.language || '—')}</span>
          </div>
          <div class="project-meta">
            <span>Updated ${formatDate(p.updatedAt)}</span>
            <span class="badge">${escapeHtml(p.animMode || '2d-cartoon')}</span>
          </div>
          <div class="project-actions">
            <button class="btn btn-secondary btn-open" data-id="${p.id}">Open</button>
            <button class="btn btn-ghost btn-rename" data-id="${p.id}" aria-label="Rename">Rename</button>
            <button class="btn btn-ghost btn-delete" data-id="${p.id}" aria-label="Delete">Delete</button>
          </div>
        </article>
      `).join('')}
    </div>`;
}

function bindDashboard() {
  $('#empty-create')?.addEventListener('click', startCreate);
  $$('.btn-open, .project-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn-rename, .btn-delete')) return;
      const id = el.dataset.id || el.closest('[data-id]')?.dataset.id;
      if (id) openProject(id);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id = el.dataset.id;
        if (id) openProject(id);
      }
    });
  });
  $$('.btn-rename').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      promptRename(btn.dataset.id);
    });
  });
  $$('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDelete(btn.dataset.id);
    });
  });
}

function renderCreateWizard() {
  const step = state.createStep;
  const f = state.form;
  const err = state.errors;

  const stepsHtml = [1,2,3,4,5].map(s => {
    let cls = 'step-indicator';
    if (s === step) cls += ' active';
    else if (s < step) cls += ' done';
    const labels = ['Basics', 'Content', 'Import', 'Review', 'Save'];
    return `<div class="${cls}" aria-current="${s===step?'step':undefined}">${labels[s-1]}</div>`;
  }).join('');

  let body = '';
  if (step === 1) {
    body = `
      <div class="form-section">
        <h3>Lesson basics</h3>
        <div class="form-group">
          <label for="f-title">Lesson title <span aria-hidden="true">*</span></label>
          <input type="text" id="f-title" value="${escapeHtml(f.title)}" placeholder="e.g. Introduction to Fractions" maxlength="120" required aria-required="true" aria-describedby="${err.title?'err-title':''}" />
          ${err.title ? `<div class="error-msg" id="err-title" role="alert">${escapeHtml(err.title)}</div>` : ''}
        </div>
        <div class="form-group">
          <label id="label-class">Class / Grade <span aria-hidden="true">*</span></label>
          <div class="chip-group" role="group" aria-labelledby="label-class">
            ${CLASSES.map(c => `
              <button type="button" class="chip ${f.classLevel===c?'selected':''}" data-value="${c}" aria-pressed="${f.classLevel===c}">${c}</button>
            `).join('')}
          </div>
          ${err.classLevel ? `<div class="error-msg" role="alert">${escapeHtml(err.classLevel)}</div>` : ''}
        </div>
        <div class="form-group">
          <label id="label-subject">Subject <span aria-hidden="true">*</span></label>
          <div class="chip-group" role="group" aria-labelledby="label-subject">
            ${SUBJECTS.map(s => `
              <button type="button" class="chip ${f.subject===s?'selected':''}" data-value="${s}" aria-pressed="${f.subject===s}">${s}</button>
            `).join('')}
          </div>
          ${err.subject ? `<div class="error-msg" role="alert">${escapeHtml(err.subject)}</div>` : ''}
        </div>
      </div>`;
  } else if (step === 2) {
    body = `
      <div class="form-section">
        <h3>Language & animation style</h3>
        <div class="form-group">
          <label for="f-lang">Teaching language</label>
          <select id="f-lang">
            ${LANGUAGES.map(l => `<option value="${l}" ${f.language===l?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label id="label-anim">Animation mode</label>
          <div class="chip-group" role="group" aria-labelledby="label-anim">
            ${ANIM_MODES.map(m => `
              <button type="button" class="chip ${f.animMode===m.id?'selected':''}" data-value="${m.id}" aria-pressed="${f.animMode===m.id}">${m.label}</button>
            `).join('')}
          </div>
          <p class="hint">Full animation engine is planned for a later phase. Selection is saved for future use.</p>
        </div>
        <div class="form-group">
          <label for="f-text">Lesson text / script</label>
          <textarea id="f-text" placeholder="Paste or type the lesson content, key points, or script here...">${escapeHtml(f.textContent)}</textarea>
          <p class="hint">You can refine this later in the editor.</p>
        </div>
      </div>`;
  } else if (step === 3) {
    body = `
      <div class="form-section">
        <h3>Import PDF or images</h3>
        <div class="form-group">
          <label for="f-chapter">Chapter / unit name (optional)</label>
          <input type="text" id="f-chapter" value="${escapeHtml(f.chapterName || '')}" placeholder="e.g. Chapter 3 – Fractions" maxlength="120" />
          <p class="hint">If you only type a chapter name without importing a PDF or pasting text, AI generation will warn that the source is unverified.</p>
        </div>
        <div class="import-zone" id="import-zone" tabindex="0" role="button" aria-label="Drop or select PDF or image files">
          <p><strong>Drop PDF or images here</strong> or click to browse</p>
          <p>Supported: PDF (text extraction), PNG, JPG, WebP</p>
          <input type="file" id="file-input" accept=".pdf,image/png,image/jpeg,image/webp" multiple />
        </div>
        <div class="file-list" id="file-list">
          ${f.importedFiles.map((file, i) => `
            <div class="file-item">
              <span>${escapeHtml(file.name)} (${(file.size/1024).toFixed(1)} KB)${file.extractedText ? ' · text extracted' : ''}</span>
              <button type="button" class="btn btn-ghost remove" data-idx="${i}" aria-label="Remove ${escapeHtml(file.name)}">Remove</button>
            </div>
          `).join('')}
        </div>
        <p class="hint" style="margin-top:1rem">PDF text extraction uses PDF.js in the browser. Image OCR requires Tesseract.js <span class="badge not-implemented">not loaded by default</span>.</p>
      </div>`;
  } else if (step === 4) {
    body = `
      <div class="form-section">
        <h3>Review</h3>
        <dl style="display:grid;gap:0.75rem">
          <div><dt style="color:var(--text-muted);font-size:0.85rem">Title</dt><dd><strong>${escapeHtml(f.title)}</strong></dd></div>
          <div><dt style="color:var(--text-muted);font-size:0.85rem">Class</dt><dd>${escapeHtml(f.classLevel)}</dd></div>
          <div><dt style="color:var(--text-muted);font-size:0.85rem">Subject</dt><dd>${escapeHtml(f.subject)}</dd></div>
          <div><dt style="color:var(--text-muted);font-size:0.85rem">Language</dt><dd>${escapeHtml(f.language)}</dd></div>
          <div><dt style="color:var(--text-muted);font-size:0.85rem">Animation</dt><dd>${escapeHtml(ANIM_MODES.find(m=>m.id===f.animMode)?.label || f.animMode)}</dd></div>
          <div><dt style="color:var(--text-muted);font-size:0.85rem">Text length</dt><dd>${f.textContent.length} characters</dd></div>
          <div><dt style="color:var(--text-muted);font-size:0.85rem">Imported files</dt><dd>${f.importedFiles.length}</dd></div>
        </dl>
      </div>`;
  } else if (step === 5) {
    body = `
      <div class="form-section">
        <h3>Ready to save</h3>
        <p>Your lesson will be stored locally in this browser using IndexedDB. You can reopen, edit, rename or delete it anytime.</p>
        <p class="hint" style="margin-top:1rem">AI script generation, voiceover and full animation are <span class="badge not-implemented">planned for later phases</span>.</p>
      </div>`;
  }

  return `
    <div class="wizard-steps" role="navigation" aria-label="Creation steps">${stepsHtml}</div>
    ${body}
    <div class="wizard-nav">
      <button type="button" class="btn btn-secondary" id="btn-back" ${step===1?'disabled':''}>Back</button>
      <div style="display:flex;gap:0.5rem">
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancel</button>
        ${step < 5
          ? `<button type="button" class="btn btn-primary" id="btn-next">Next</button>`
          : `<button type="button" class="btn btn-primary" id="btn-save">Save Project</button>`}
      </div>
    </div>`;
}

function bindCreateWizard() {
  $('#btn-cancel').addEventListener('click', () => {
    state.view = 'dashboard';
    state.createStep = 1;
    state.errors = {};
    render();
  });
  $('#btn-back')?.addEventListener('click', () => {
    if (state.createStep > 1) {
      state.createStep--;
      state.errors = {};
      render();
    }
  });
  $('#btn-next')?.addEventListener('click', () => {
    if (validateStep(state.createStep)) {
      state.createStep++;
      state.errors = {};
      render();
    } else {
      render(); // show errors
    }
  });
  $('#btn-save')?.addEventListener('click', async () => {
    if (!validateStep(1)) { state.createStep = 1; render(); return; }
    await createAndSaveProject();
  });

  // Step 1 chips
  $$('.chip[data-value]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.dataset.value;
      if (CLASSES.includes(val)) {
        state.form.classLevel = val;
        $$('.chip').forEach(c => {
          if (CLASSES.includes(c.dataset.value)) {
            c.classList.toggle('selected', c.dataset.value === val);
            c.setAttribute('aria-pressed', c.dataset.value === val);
          }
        });
      } else if (SUBJECTS.includes(val)) {
        state.form.subject = val;
        $$('.chip').forEach(c => {
          if (SUBJECTS.includes(c.dataset.value)) {
            c.classList.toggle('selected', c.dataset.value === val);
            c.setAttribute('aria-pressed', c.dataset.value === val);
          }
        });
      } else if (ANIM_MODES.some(m => m.id === val)) {
        state.form.animMode = val;
        $$('.chip').forEach(c => {
          if (ANIM_MODES.some(m => m.id === c.dataset.value)) {
            c.classList.toggle('selected', c.dataset.value === val);
            c.setAttribute('aria-pressed', c.dataset.value === val);
          }
        });
      }
    });
  });

  $('#f-title')?.addEventListener('input', e => { state.form.title = e.target.value; });
  $('#f-lang')?.addEventListener('change', e => { state.form.language = e.target.value; });
  $('#f-text')?.addEventListener('input', e => { state.form.textContent = e.target.value; });
  $('#f-chapter')?.addEventListener('input', e => { state.form.chapterName = e.target.value; });

  // Import
  const zone = $('#import-zone');
  const input = $('#file-input');
  if (zone && input) {
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', () => handleFiles(input.files));
  }
  $$('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.form.importedFiles.splice(+btn.dataset.idx, 1);
      render();
    });
  });
}

function validateStep(step) {
  state.errors = {};
  if (step === 1) {
    if (!state.form.title.trim()) state.errors.title = 'Please enter a lesson title.';
    if (!state.form.classLevel) state.errors.classLevel = 'Please select a class / grade.';
    if (!state.form.subject) state.errors.subject = 'Please select a subject.';
  }
  return Object.keys(state.errors).length === 0;
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    const check = validateImportFile(file);
    if (!check.ok) {
      toast(check.reason, 'error');
      continue;
    }
    let dataUrl = null;
    let extractedText = '';
    try {
      if (check.isPdf) {
        toast(`Extracting text from ${file.name}…`, 'info');
        const result = await extractTextFromPdf(file, {
          onProgress: (msg) => { state.ai.status = msg; }
        });
        extractedText = result.text;
        if (!extractedText) {
          toast(`No extractable text found in “${file.name}”. It may be a scanned PDF — use OCR or paste text manually.`, 'error');
        } else {
          toast(`Extracted ${extractedText.length} characters from ${result.pageCount} page(s).`, 'success');
          if (!state.form.textContent.trim()) {
            state.form.textContent = extractedText;
          } else {
            state.form.textContent += '\n\n' + extractedText;
          }
          state.form.hasVerifiedSource = true;
        }
      } else if (check.isImage) {
        if (file.size < 1.5 * 1024 * 1024) {
          dataUrl = await readAsDataURL(file);
        }
        try {
          const ocr = await extractTextFromImage(file, {
            onProgress: (msg) => { state.ai.status = msg; }
          });
          extractedText = ocr.text;
          if (extractedText && !state.form.textContent.trim()) {
            state.form.textContent = extractedText;
          } else if (extractedText) {
            state.form.textContent += '\n\n' + extractedText;
          }
          state.form.hasVerifiedSource = true;
          toast('OCR extracted text from image.', 'success');
        } catch (ocrErr) {
          toast(ocrErr.message || 'OCR not configured. Image stored; paste text manually if needed.', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      toast(`Could not process “${file.name}”: ${err.message || err}`, 'error');
    }
    state.form.importedFiles.push({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
      extractedText: extractedText || undefined
    });
  }
  render();
}

function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function createAndSaveProject() {
  const f = state.form;
  if (f.chapterName && !f.hasVerifiedSource && !f.textContent.trim()) {
    toast('Chapter name entered without textbook text or import. Add source text before generating AI content.', 'error');
  }
  const project = {
    id: generateId(),
    title: f.title.trim(),
    classLevel: f.classLevel,
    subject: f.subject,
    language: f.language,
    animMode: f.animMode,
    textContent: f.textContent,
    importedFiles: f.importedFiles,
    chapterName: f.chapterName || '',
    hasVerifiedSource: !!f.hasVerifiedSource,
    scenes: buildInitialScenes(f.textContent),
    lessonData: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  try {
    await saveProject(project);
    state.projects = await listProjects();
    state.currentProject = project;
    state.view = 'editor';
    state.createStep = 1;
    state.form = { title: '', classLevel: '', subject: '', language: 'English', animMode: '2d-cartoon', textContent: '', importedFiles: [], chapterName: '', hasVerifiedSource: false };
    toast('Project saved locally.', 'success');
    render();
  } catch (err) {
    console.error(err);
    toast('Failed to save project. Storage may be full or unavailable.', 'error');
  }
}

function buildInitialScenes(text) {
  if (!text.trim()) {
    return [{ id: 's1', title: 'Introduction', content: '', notes: '' }];
  }
  // Simple split by paragraphs or sentences for Phase 1
  const parts = text.split(/\n\s*\n/).filter(p => p.trim()).slice(0, 12);
  if (parts.length === 0) parts.push(text.slice(0, 400));
  return parts.map((p, i) => ({
    id: 's' + (i + 1),
    title: `Scene ${i + 1}`,
    content: p.trim().slice(0, 800),
    notes: ''
  }));
}

// ---------- Editor ----------
function renderEditor() {
  const p = state.currentProject;
  if (!p) return '<p>Project not found.</p>';
  const scenes = p.scenes || [];
  const idx = Math.min(state.editorSceneIndex, Math.max(0, scenes.length - 1));
  const scene = scenes[idx] || { title: '', content: '', notes: '' };

  const hasLesson = !!(p.lessonData && (p.lessonData.englishExplanation || p.lessonData.mcqs?.length));
  const approved = p.lessonData?.approved;
  return `
    <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem">
      <button class="btn btn-secondary" id="btn-back-dash">← Projects</button>
      <button class="btn btn-secondary" id="btn-storyboard">Storyboard</button>
      <button class="btn btn-primary" id="btn-lesson-engine">Lesson Engine</button>
      <button class="btn btn-primary" id="btn-save-editor">Save</button>
      ${hasLesson ? `<span class="badge ${approved ? '' : 'not-implemented'}" style="align-self:center">${approved ? 'Lesson approved' : 'Lesson draft'}</span>` : '<span class="badge not-implemented" style="align-self:center">No generated lesson yet</span>'}
    </div>
    <div class="editor-layout">
      <aside class="sidebar-panel">
        <h3 style="margin-bottom:0.75rem;font-size:1rem">Scenes</h3>
        <ul class="scene-list" role="listbox" aria-label="Scenes">
          ${scenes.map((s, i) => `
            <li class="scene-item ${i===idx?'active':''}" role="option" aria-selected="${i===idx}" data-idx="${i}" tabindex="0">
              <div class="scene-title">${escapeHtml(s.title || 'Scene '+(i+1))}</div>
              <div class="scene-preview">${escapeHtml((s.content||'').slice(0,60))}</div>
            </li>
          `).join('')}
        </ul>
        <button class="btn btn-secondary" id="btn-add-scene" style="width:100%;margin-top:0.75rem">+ Add scene</button>
      </aside>
      <div class="editor-main">
        <div class="form-group">
          <label for="scene-title">Scene title</label>
          <input type="text" id="scene-title" value="${escapeHtml(scene.title)}" maxlength="80" />
        </div>
        <div class="form-group">
          <label for="scene-content">Content / narration</label>
          <textarea id="scene-content" rows="8">${escapeHtml(scene.content)}</textarea>
        </div>
        <div class="form-group">
          <label for="scene-notes">Director notes <span class="badge not-implemented">visuals later</span></label>
          <textarea id="scene-notes" rows="3" placeholder="Camera, on-screen text, animation ideas...">${escapeHtml(scene.notes||'')}</textarea>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-ghost" id="btn-del-scene" ${scenes.length<=1?'disabled':''}>Delete scene</button>
        </div>
      </div>
    </div>`;
}

function bindEditor() {
  $('#btn-back-dash').addEventListener('click', async () => {
    await persistCurrentEditor();
    state.view = 'dashboard';
    state.projects = await listProjects();
    render();
  });
  $('#btn-storyboard').addEventListener('click', async () => {
    await persistCurrentEditor();
    state.view = 'storyboard';
    render();
  });
  $('#btn-lesson-engine')?.addEventListener('click', async () => {
    await persistCurrentEditor();
    state.view = 'lesson';
    state.lessonTab = 'overview';
    render();
  });
  $('#btn-save-editor').addEventListener('click', async () => {
    await persistCurrentEditor();
    toast('Project saved.', 'success');
  });
  $('#btn-add-scene').addEventListener('click', async () => {
    await persistCurrentEditor();
    const p = state.currentProject;
    p.scenes.push({ id: 's' + Date.now(), title: `Scene ${p.scenes.length + 1}`, content: '', notes: '' });
    state.editorSceneIndex = p.scenes.length - 1;
    await saveProject(p);
    render();
  });
  $('#btn-del-scene')?.addEventListener('click', async () => {
    const p = state.currentProject;
    if (p.scenes.length <= 1) return;
    p.scenes.splice(state.editorSceneIndex, 1);
    state.editorSceneIndex = Math.max(0, state.editorSceneIndex - 1);
    await saveProject(p);
    render();
  });
  $$('.scene-item').forEach(item => {
    item.addEventListener('click', async () => {
      await persistCurrentEditor();
      state.editorSceneIndex = +item.dataset.idx;
      render();
    });
  });
  // live update
  $('#scene-title')?.addEventListener('input', e => {
    const p = state.currentProject;
    if (p.scenes[state.editorSceneIndex]) p.scenes[state.editorSceneIndex].title = e.target.value;
  });
  $('#scene-content')?.addEventListener('input', e => {
    const p = state.currentProject;
    if (p.scenes[state.editorSceneIndex]) p.scenes[state.editorSceneIndex].content = e.target.value;
  });
  $('#scene-notes')?.addEventListener('input', e => {
    const p = state.currentProject;
    if (p.scenes[state.editorSceneIndex]) p.scenes[state.editorSceneIndex].notes = e.target.value;
  });
}

async function persistCurrentEditor() {
  if (!state.currentProject) return;
  // values already mirrored via input listeners
  await saveProject(state.currentProject);
}

// ---------- Storyboard ----------
function renderStoryboard() {
  const p = state.currentProject;
  if (!p) return '<p>Project not found.</p>';
  const scenes = p.scenes || [];
  return `
    <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem">
      <button class="btn btn-secondary" id="btn-back-editor">← Editor</button>
      <button class="btn btn-secondary" id="btn-back-dash2">Projects</button>
      <span class="badge not-implemented">Animation preview – not implemented</span>
    </div>
    <div class="storyboard-grid">
      ${scenes.map((s, i) => `
        <div class="storyboard-card">
          <div class="frame">Scene ${i + 1}<br/><small>${escapeHtml(p.animMode || '')}</small></div>
          <div class="caption">
            <strong>${escapeHtml(s.title || 'Untitled')}</strong>
            <p style="color:var(--text-muted);margin-top:0.35rem;font-size:0.8rem">${escapeHtml((s.content||'').slice(0,100))}${(s.content||'').length>100?'…':''}</p>
          </div>
        </div>
      `).join('')}
    </div>
    ${scenes.length === 0 ? '<p class="empty-state">No scenes yet. Add content in the editor.</p>' : ''}`;
}

function bindStoryboard() {
  $('#btn-back-editor').addEventListener('click', () => { state.view = 'editor'; render(); });
  $('#btn-back-dash2').addEventListener('click', async () => {
    state.view = 'dashboard';
    state.projects = await listProjects();
    render();
  });
}


// ---------- Lesson Engine wiring ----------
const lessonEngine = createLessonEngine({
  state, $, $$, toast, escapeHtml, formatDate,
  saveProject, listProjects, emptyLessonFromText,
  getProviders: () => AI_PROVIDERS,
  render: () => render()
});
const { renderLessonEngine, bindLessonEngine, ensureLessonData } = lessonEngine;

// ---------- Actions ----------
function startCreate() {
  state.view = 'create';
  state.createStep = 1;
  state.form = { title: '', classLevel: '', subject: '', language: 'English', animMode: '2d-cartoon', textContent: '', importedFiles: [], chapterName: '', hasVerifiedSource: false };
  state.errors = {};
  render();
}

async function openProject(id) {
  try {
    const p = await getProject(id);
    if (!p) {
      toast('Project not found.', 'error');
      return;
    }
    state.currentProject = p;
    state.editorSceneIndex = 0;
    state.view = 'editor';
    render();
  } catch (err) {
    toast('Could not open project.', 'error');
  }
}

function promptRename(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="rename-title">
      <h3 id="rename-title">Rename project</h3>
      <div class="form-group">
        <label for="rename-input">New title</label>
        <input type="text" id="rename-input" value="${escapeHtml(project.title)}" maxlength="120" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="rename-cancel">Cancel</button>
        <button class="btn btn-primary" id="rename-ok">Save</button>
      </div>
    </div>`;
  $('#modal-root').appendChild(overlay);
  const input = $('#rename-input');
  input.focus();
  input.select();
  const close = () => overlay.remove();
  $('#rename-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  $('#rename-ok').addEventListener('click', async () => {
    const newTitle = input.value.trim();
    if (!newTitle) {
      toast('Title cannot be empty.', 'error');
      return;
    }
    project.title = newTitle;
    await saveProject(project);
    state.projects = await listProjects();
    toast('Renamed.', 'success');
    close();
    render();
  });
}

function confirmDelete(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="del-title">
      <h3 id="del-title">Delete project?</h3>
      <p>This will permanently remove <strong>${escapeHtml(project.title)}</strong> from this device. This cannot be undone.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="del-cancel">Cancel</button>
        <button class="btn btn-danger" id="del-ok">Delete</button>
      </div>
    </div>`;
  $('#modal-root').appendChild(overlay);
  const close = () => overlay.remove();
  $('#del-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  $('#del-ok').addEventListener('click', async () => {
    await deleteProject(id);
    state.projects = await listProjects();
    if (state.currentProject?.id === id) state.currentProject = null;
    toast('Project deleted.', 'success');
    close();
    render();
  });
}

// ---------- Init ----------
async function init() {
  $('#btn-new-project').addEventListener('click', startCreate);
  try {
    state.projects = await listProjects();
  } catch (err) {
    console.error('DB init failed', err);
    toast('Local storage unavailable. Projects cannot be saved.', 'error');
  }
  render();
}

init();
