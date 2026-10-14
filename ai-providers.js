/**
 * AI Education Video Factory – Phase 2
 * Modular AI provider interface.
 * No API keys in browser code. Ollama uses local endpoint only.
 */

export class AIProvider {
  get id() { return 'base'; }
  get label() { return 'Base'; }
  async checkAvailability() {
    return { available: false, message: 'Not implemented' };
  }
  async generateLesson(opts) {
    throw new Error('generateLesson not implemented');
  }
}

export class ManualProvider extends AIProvider {
  get id() { return 'manual'; }
  get label() { return 'Manual only (no AI)'; }
  async checkAvailability() {
    return {
      available: true,
      message: 'AI generation is off. You can enter and edit all lesson fields manually.'
    };
  }
  async generateLesson({ text, onStatus }) {
    onStatus?.('Preparing empty lesson structure for manual editing…');
    return emptyLessonFromText(text, 'manual', 'none');
  }
}

export class TestProvider extends AIProvider {
  get id() { return 'test'; }
  get label() { return 'Test structure (offline demo)'; }
  async checkAvailability() {
    return {
      available: true,
      message: 'Demo provider only. Generates sample structured data for testing UI and storage — not real AI output.'
    };
  }
  async generateLesson({ text, classLevel, subject, language, onStatus }) {
    onStatus?.('Building test lesson structure…');
    await delay(400);
    onStatus?.('Adapting for subject: ' + subject);
    await delay(300);
    const sample = emptyLessonFromText(text || 'Sample textbook paragraph about the topic.', 'test', 'demo-v1');
    sample.englishExplanation =
      `This is a TEST explanation for ${subject} (${classLevel}). ` +
      `Replace this with real content. Original text length: ${(text || '').length} characters.`;
    sample.bengaliExplanation =
      `এটি একটি পরীক্ষামূলক ব্যাখ্যা (${subject}, ${classLevel})। বাস্তব AI আউটপুট নয়।`;
    sample.sentences = [
      { en: 'First key sentence from the passage.', bn: 'পাঠ্যাংশের প্রথম গুরুত্বপূর্ণ বাক্য।' },
      { en: 'Second idea the teacher should emphasise.', bn: 'দ্বিতীয় ধারণা যা শিক্ষককে জোর দিতে হবে।' }
    ];
    sample.vocabulary = [
      { word: 'concept', meaningBn: 'ধারণা', pronunciation: 'kon-sept' },
      { word: 'example', meaningBn: 'উদাহরণ', pronunciation: 'ig-zam-pul' }
    ];
    sample.concepts = ['Core idea 1 (edit me)', 'Core idea 2 (edit me)'];
    sample.mcqs = [{
      question: 'Sample MCQ – which statement is true?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      explanation: 'Option A is correct in this test data. Edit freely.'
    }];
    sample.sceneNotes = [
      'Scene 1: Introduce the topic with a title card.',
      'Scene 2: Show key terms on screen.',
      'Scene 3: Work through one example.'
    ];
    sample.subjectExtras = buildSubjectExtras(subject, text);
    return sample;
  }
}

export class OllamaProvider extends AIProvider {
  constructor(baseUrl = 'http://127.0.0.1:11434') {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultModel = 'llama3.2';
  }
  get id() { return 'ollama'; }
  get label() { return 'Ollama (local)'; }
  async checkAvailability() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) {
        return {
          available: false,
          message: `Ollama responded with HTTP ${res.status}. Is it running at ${this.baseUrl}?`
        };
      }
      const data = await res.json();
      const models = (data.models || []).map(m => m.name || m.model).filter(Boolean);
      if (models.length === 0) {
        return {
          available: false,
          message: 'Ollama is reachable but no models are installed. Run e.g. `ollama pull llama3.2`.'
        };
      }
      return {
        available: true,
        message: `Ollama ready. Models: ${models.slice(0, 8).join(', ')}${models.length > 8 ? '…' : ''}`,
        models
      };
    } catch (err) {
      const msg = err.name === 'TimeoutError' || err.name === 'AbortError'
        ? `Timed out reaching ${this.baseUrl}. Start Ollama and allow CORS if needed.`
        : `Cannot reach Ollama at ${this.baseUrl}. ${err.message || err}. ` +
          'Install Ollama, run it, and ensure the browser can call it (CORS).';
      return { available: false, message: msg };
    }
  }
  async generateLesson({ text, classLevel, subject, language, model, onStatus }) {
    const availability = await this.checkAvailability();
    if (!availability.available) throw new Error(availability.message);
    const chosen = model || availability.models?.[0] || this.defaultModel;
    onStatus?.(`Calling Ollama model “${chosen}”…`);
    const prompt = buildLessonPrompt({ text, classLevel, subject, language });
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: chosen,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.3 }
      }),
      signal: AbortSignal.timeout(180000)
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ollama generate failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
    }
    onStatus?.('Parsing model response…');
    const data = await res.json();
    const raw = data.response || data.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Model did not return valid JSON. Try another model or edit manually.');
    }
    return normalizeLessonData(parsed, text, 'ollama', chosen);
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export function emptyLessonFromText(text, provider, model) {
  return {
    originalText: text || '',
    englishExplanation: '',
    bengaliExplanation: '',
    sentences: [],
    vocabulary: [],
    concepts: [],
    mcqs: [],
    sceneNotes: [],
    subjectExtras: {},
    generatedAt: Date.now(),
    provider,
    model,
    approved: false,
    approvedAt: null
  };
}

function buildSubjectExtras(subject, text) {
  const s = (subject || '').toLowerCase();
  if (s.includes('math')) {
    return {
      type: 'mathematics',
      steps: [
        'Step 1: Identify what is given and what is asked.',
        'Step 2: Choose the formula or method.',
        'Step 3: Substitute values and compute.',
        'Step 4: Write the final answer with units if any.'
      ]
    };
  }
  if (s.includes('physical') || s.includes('life') || s.includes('science') || s.includes('physics') || s.includes('chemistry') || s.includes('biology')) {
    return {
      type: 'science',
      conceptPoints: ['Define the main concept.', 'Describe the process or law.', 'Give one real-life example.'],
      diagramInstructions: ['Draw a labelled diagram of the main structure or process.']
    };
  }
  if (s.includes('history')) {
    return {
      type: 'history',
      timeline: [
        { year: '…', event: 'Key event 1 (edit)' },
        { year: '…', event: 'Key event 2 (edit)' }
      ]
    };
  }
  if (s.includes('geography')) {
    return {
      type: 'geography',
      mapInstructions: ['Locate the region on a map.', 'Mark important physical features.'],
      diagramInstructions: ['Draw a simple climate or landform diagram if relevant.']
    };
  }
  if (s.includes('english') || s.includes('bengali') || s.includes('hindi') || s.includes('language')) {
    return { type: 'language', focus: 'sentence meanings and vocabulary' };
  }
  return { type: 'general' };
}

function buildLessonPrompt({ text, classLevel, subject, language }) {
  return `You are an expert school teacher for Indian curriculum (Classes V–XII).
Create a structured lesson from the textbook text below.

Class: ${classLevel}
Subject: ${subject}
Teaching language preference: ${language}

Textbook text:
"""
${(text || '').slice(0, 6000)}
"""

Respond with ONLY a single JSON object (no markdown) with these keys:
{
  "englishExplanation": "clear explanation in English suitable for the class",
  "bengaliExplanation": "same explanation in Bengali (বাংলা)",
  "sentences": [{"en": "...", "bn": "..."}],
  "vocabulary": [{"word": "...", "meaningBn": "...", "pronunciation": "..."}],
  "concepts": ["important concept 1", "..."],
  "mcqs": [{"question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..."}],
  "sceneNotes": ["animation/scene planning note 1", "..."],
  "subjectExtras": {}
}

Adapt subjectExtras to the subject:
- Mathematics: { "type":"mathematics", "steps": ["step1","step2",...] }
- Science / Physical Science / Life Science: { "type":"science", "conceptPoints":[...], "diagramInstructions":[...] }
- History: { "type":"history", "timeline":[{"year":"...","event":"..."}] }
- Geography: { "type":"geography", "mapInstructions":[...], "diagramInstructions":[...] }
- Languages: { "type":"language", "focus":"..." }

Keep content accurate for the class level. Use simple language. Include 3–6 MCQs when possible.`;
}

function normalizeLessonData(parsed, originalText, provider, model) {
  const base = emptyLessonFromText(originalText, provider, model);
  if (!parsed || typeof parsed !== 'object') return base;
  base.englishExplanation = str(parsed.englishExplanation);
  base.bengaliExplanation = str(parsed.bengaliExplanation);
  base.sentences = Array.isArray(parsed.sentences)
    ? parsed.sentences.map(s => ({ en: str(s.en || s.english), bn: str(s.bn || s.bengali) })).filter(s => s.en || s.bn)
    : [];
  base.vocabulary = Array.isArray(parsed.vocabulary)
    ? parsed.vocabulary.map(v => ({
        word: str(v.word),
        meaningBn: str(v.meaningBn || v.meaning),
        pronunciation: str(v.pronunciation)
      })).filter(v => v.word)
    : [];
  base.concepts = Array.isArray(parsed.concepts) ? parsed.concepts.map(str).filter(Boolean) : [];
  base.mcqs = Array.isArray(parsed.mcqs)
    ? parsed.mcqs.map(m => ({
        question: str(m.question),
        options: Array.isArray(m.options) ? m.options.map(str) : [],
        correctIndex: Number.isInteger(m.correctIndex) ? m.correctIndex : 0,
        explanation: str(m.explanation)
      })).filter(m => m.question)
    : [];
  base.sceneNotes = Array.isArray(parsed.sceneNotes) ? parsed.sceneNotes.map(str).filter(Boolean) : [];
  base.subjectExtras = parsed.subjectExtras && typeof parsed.subjectExtras === 'object'
    ? parsed.subjectExtras
    : {};
  return base;
}

function str(v) {
  return v == null ? '' : String(v);
}

export function createProviderRegistry(ollamaBaseUrl) {
  return {
    manual: new ManualProvider(),
    test: new TestProvider(),
    ollama: new OllamaProvider(ollamaBaseUrl || 'http://127.0.0.1:11434')
  };
}
