/**
 * Medical Data Service — RAG Pipeline
 *
 * Loads the HealthNet Medical Data volumes (12 markdown files),
 * splits them into searchable sections, and provides keyword-based
 * retrieval for injecting relevant context into Gemini API calls.
 */

// Vite ?raw imports — bundles the markdown as strings at build time
import volume01 from '../../HealthNet Medical Data/volumes/volume01_primary_care_foundation.md?raw';
import volume02 from '../../HealthNet Medical Data/volumes/volume02_cardio_respiratory.md?raw';
import volume03 from '../../HealthNet Medical Data/volumes/volume03_gastroenterology_hepatology.md?raw';
import volume04 from '../../HealthNet Medical Data/volumes/volume04_endocrinology_metabolism.md?raw';
import volume05 from '../../HealthNet Medical Data/volumes/volume05_neurology_psychiatry.md?raw';
import volume06 from '../../HealthNet Medical Data/volumes/volume06_infectious_diseases.md?raw';
import volume07 from '../../HealthNet Medical Data/volumes/volume07_dermatology_musculoskeletal.md?raw';
import volume08 from '../../HealthNet Medical Data/volumes/volume08_pediatrics_geriatrics.md?raw';
import volume09 from '../../HealthNet Medical Data/volumes/volume09_womens_mens_health.md?raw';
import volume10 from '../../HealthNet Medical Data/volumes/volume10_preventive_care.md?raw';
import volume11 from '../../HealthNet Medical Data/volumes/volume11_herbal_integrative.md?raw';
import volume12 from '../../HealthNet Medical Data/volumes/volume12_emergency_critical_care.md?raw';

/** A single searchable section from the medical knowledge base */
export interface MedicalSection {
  title: string;
  volume: string;
  content: string;
  /** pre-computed lowercase tokens for fast matching */
  tokens: string[];
}

/** Search result with relevance score */
export interface SearchResult {
  section: MedicalSection;
  score: number;
}

// ─── Stop words to ignore during scoring ───────────────────────────────
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'of', 'in', 'to',
  'for', 'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while',
  'that', 'this', 'these', 'those', 'what', 'which', 'who',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
  'they', 'them', 'its', 'his', 'her', 'their',
]);

// ─── Medical synonym map for query expansion ───────────────────────────
const MEDICAL_SYNONYMS: Record<string, string[]> = {
  'heart attack': ['myocardial infarction', 'mi', 'acs', 'coronary', 'stemi', 'nstemi'],
  'high blood pressure': ['hypertension', 'htn', 'blood pressure'],
  'diabetes': ['diabetes mellitus', 'diabetic', 'hyperglycemia', 'blood sugar', 'insulin', 'hba1c', 'type 1', 'type 2'],
  'stroke': ['cerebrovascular', 'cva', 'ischemic stroke', 'hemorrhagic stroke', 'tpa', 'thrombolysis'],
  'asthma': ['bronchospasm', 'wheezing', 'bronchodilator', 'inhaler'],
  'depression': ['depressive', 'major depression', 'mdd', 'antidepressant', 'ssri'],
  'anxiety': ['anxious', 'generalized anxiety', 'gad', 'panic', 'phobia'],
  'infection': ['infectious', 'bacterial', 'viral', 'antimicrobial', 'antibiotic'],
  'stomach': ['gastric', 'gastrointestinal', 'gi', 'abdominal', 'digestive'],
  'kidney': ['renal', 'nephro', 'ckd', 'dialysis', 'glomerular'],
  'liver': ['hepatic', 'hepatology', 'cirrhosis', 'hepatitis'],
  'cancer': ['malignancy', 'tumor', 'carcinoma', 'oncology', 'neoplasm'],
  'headache': ['migraine', 'cephalalgia', 'tension headache', 'cluster headache'],
  'rash': ['dermatitis', 'eczema', 'psoriasis', 'urticaria', 'skin eruption'],
  'pregnant': ['pregnancy', 'prenatal', 'obstetric', 'gestational', 'trimester'],
  'child': ['pediatric', 'paediatric', 'infant', 'neonatal', 'adolescent'],
  'old': ['geriatric', 'elderly', 'aging', 'aged'],
  'breathing': ['respiratory', 'dyspnea', 'breathlessness', 'pulmonary'],
  'chest pain': ['angina', 'coronary', 'pericarditis', 'pleuritic'],
  'blood clot': ['thrombosis', 'embolism', 'dvt', 'pulmonary embolism', 'pe', 'anticoagulation'],
  'uti': ['urinary tract infection', 'cystitis', 'pyelonephritis', 'dysuria'],
  'std': ['sti', 'sexually transmitted', 'chlamydia', 'gonorrhea', 'syphilis', 'herpes'],
  'hiv': ['aids', 'antiretroviral', 'art', 'prep', 'pep', 'cd4'],
  'tb': ['tuberculosis', 'mycobacterium'],
  'malaria': ['plasmodium', 'antimalarial', 'artemisinin'],
  'covid': ['covid-19', 'sars-cov-2', 'coronavirus', 'paxlovid'],
  'flu': ['influenza', 'oseltamivir', 'tamiflu'],
  'joint pain': ['arthritis', 'arthralgia', 'osteoarthritis', 'rheumatoid'],
  'back pain': ['low back pain', 'lumbago', 'sciatica', 'spinal'],
  'allergy': ['allergic', 'anaphylaxis', 'antihistamine', 'epinephrine'],
  'thyroid': ['hypothyroid', 'hyperthyroid', 'thyroiditis', 'tsh', 'levothyroxine'],
};

// ─── Section index (built once on first search) ────────────────────────

let sectionIndex: MedicalSection[] | null = null;

const VOLUME_MAP: Record<string, string> = {
  'Volume 1: Primary Care Foundation': volume01,
  'Volume 2: Cardiovascular & Respiratory': volume02,
  'Volume 3: Gastroenterology & Hepatology': volume03,
  'Volume 4: Endocrinology & Metabolism': volume04,
  'Volume 5: Neurology & Psychiatry': volume05,
  'Volume 6: Infectious Diseases': volume06,
  'Volume 7: Dermatology & Musculoskeletal': volume07,
  'Volume 8: Pediatrics & Geriatrics': volume08,
  'Volume 9: Women\'s & Men\'s Health': volume09,
  'Volume 10: Preventive Care': volume10,
  'Volume 11: Herbal & Integrative Medicine': volume11,
  'Volume 12: Emergency & Critical Care': volume12,
};

/**
 * Tokenize a string into lowercase, de-duped, meaningful words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Split a single volume markdown into sections by ## or # headings.
 * Each section captures the heading + all content until the next heading
 * of the same or higher level.
 */
function splitIntoSections(markdown: string, volumeName: string): MedicalSection[] {
  const sections: MedicalSection[] = [];
  // Split by lines that start with # or ## (chapter/section headings)
  const lines = markdown.split('\n');

  let currentTitle = volumeName;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Detect heading lines (# or ##, but not ###+ which are sub-sections we keep inline)
    const headingMatch = line.match(/^(#{1,2})\s+(.+)/);

    if (headingMatch) {
      // Flush previous section if it has meaningful content
      if (currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content.length > 100) { // Skip tiny sections (disclaimers, dividers)
          sections.push({
            title: currentTitle,
            volume: volumeName,
            content: content.slice(0, 4000), // Cap section size for context window
            tokens: tokenize(currentTitle + ' ' + content),
          });
        }
      }
      currentTitle = headingMatch[2].trim();
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  // Flush final section
  if (currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content.length > 100) {
      sections.push({
        title: currentTitle,
        volume: volumeName,
        content: content.slice(0, 4000),
        tokens: tokenize(currentTitle + ' ' + content),
      });
    }
  }

  return sections;
}

/**
 * Build the section index from all 12 volumes.
 * Called lazily on first search.
 */
function buildIndex(): MedicalSection[] {
  const allSections: MedicalSection[] = [];

  for (const [name, content] of Object.entries(VOLUME_MAP)) {
    const sections = splitIntoSections(content, name);
    allSections.push(...sections);
  }

  console.log(`[MedicalData] Indexed ${allSections.length} sections from 12 volumes`);
  return allSections;
}

/**
 * Expand a query with medical synonyms to improve recall.
 */
function expandQuery(queryTokens: string[]): string[] {
  const expanded = new Set(queryTokens);
  const queryText = queryTokens.join(' ');

  for (const [term, synonyms] of Object.entries(MEDICAL_SYNONYMS)) {
    // Check both single tokens and multi-word phrases
    if (queryText.includes(term) || queryTokens.some(t => term.includes(t) || synonyms.some(s => s.includes(t)))) {
      // Add the primary term tokens
      tokenize(term).forEach(t => expanded.add(t));
      // Add synonym tokens
      for (const syn of synonyms) {
        tokenize(syn).forEach(t => expanded.add(t));
      }
    }
  }

  return [...expanded];
}

/**
 * Score a section against query tokens using TF-IDF-inspired matching.
 *
 * Score = (matched unique tokens / total query tokens) * title bonus
 *
 * Title matches get a 2x bonus since they're more specific.
 */
function scoreSection(section: MedicalSection, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;

  const sectionTokenSet = new Set(section.tokens);
  const titleTokens = new Set(tokenize(section.title));

  let matchScore = 0;

  for (const qt of queryTokens) {
    if (titleTokens.has(qt)) {
      matchScore += 2.0; // Title match — high relevance signal
    } else if (sectionTokenSet.has(qt)) {
      matchScore += 1.0; // Body match
    } else {
      // Partial match — check if any section token contains the query token
      for (const st of sectionTokenSet) {
        if (st.includes(qt) || qt.includes(st)) {
          matchScore += 0.5;
          break;
        }
      }
    }
  }

  // Normalize by query length
  return matchScore / queryTokens.length;
}

/**
 * Search the medical knowledge base for sections relevant to a query.
 *
 * @param query - The user's message or question
 * @param maxResults - Maximum number of sections to return (default: 3)
 * @returns Array of matching sections sorted by relevance
 */
export function searchMedicalData(query: string, maxResults: number = 3): SearchResult[] {
  // Lazy-init the index
  if (!sectionIndex) {
    sectionIndex = buildIndex();
  }

  if (!query || query.trim().length === 0) return [];

  const rawTokens = tokenize(query);
  if (rawTokens.length === 0) return [];

  // Expand query with medical synonyms
  const expandedTokens = expandQuery(rawTokens);

  // Score all sections
  const scored: SearchResult[] = sectionIndex.map(section => ({
    section,
    score: scoreSection(section, expandedTokens),
  }));

  // Filter out low-scoring results and sort by score descending
  return scored
    .filter(r => r.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Format search results into a context string for Gemini API injection.
 */
export function formatContextForLLM(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const sections = results.map((r, i) =>
    `--- REFERENCE ${i + 1}: ${r.section.title} (${r.section.volume}) ---\n${r.section.content}`
  );

  return [
    '=== HEALTHNET MEDICAL KNOWLEDGE BASE REFERENCE ===',
    'The following is from the HealthNet AI Medical Knowledge Base. Use this as your PRIMARY source for medical information.',
    '',
    ...sections,
    '',
    '=== END MEDICAL REFERENCE ==='
  ].join('\n');
}

/**
 * Get the total number of indexed sections (for diagnostics).
 */
export function getIndexSize(): number {
  if (!sectionIndex) sectionIndex = buildIndex();
  return sectionIndex.length;
}
