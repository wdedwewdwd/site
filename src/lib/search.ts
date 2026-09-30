/**
 * Product search engine (pure functions, no database).
 *
 * The query is split into words and every word must be found somewhere in the product: its name,
 * brand, category, compatible cars or part codes, in any order. So «لنت تیبا» and «لنت جلو» both
 * find «لنت ترمز جلو تیبا». Persian/Arabic letter variants, digits and half-spaces are normalized,
 * simple suffixes («ها»، «ی») are ignored, common Latin car names map to Persian, and a small typo
 * is tolerated. Results are ranked by how well they match (name matches beat car/brand matches).
 */

export type SearchDoc = {
  id: string;
  name: string;
  /** Brand, category and car names: matched with a lower weight than the product name. */
  related: string[];
  /** SKU and OEM codes: also matched with separators removed ("BR1008" finds "BR-1008"). */
  codes: string[];
  inStock: boolean;
  soldCount: number;
};

export type SearchHit = { id: string; score: number };
export type SearchResult = {
  hits: SearchHit[];
  /** No product had every word as typed; `hits` holds the closest matches (fewer words, or a typo forgiven). */
  partial: boolean;
};

const CHAR_MAP: Record<string, string> = {
  ي: "ی", ى: "ی", ئ: "ی", ك: "ک", ة: "ه", ۀ: "ه", أ: "ا", إ: "ا", ٱ: "ا", آ: "ا", ؤ: "و",
};
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Lower-cased, one spelling per letter, ASCII digits, words separated by single spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "") // Arabic diacritics and tatweel
    .replace(/[يىئكةۀأإٱآؤ]/g, (c) => CHAR_MAP[c])
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ") // half-space, dashes, slashes, punctuation
    .replace(/(\p{L})(\p{N})/gu, "$1 $2") // "پژو206" → "پژو 206", "10w40" → "10 w 40"
    .replace(/(\p{N})(\p{L})/gu, "$1 $2")
    .trim()
    .replace(/\s+/g, " ");
}

const compact = (text: string) => normalize(text).replace(/ /g, "");

// Also the endings a half-space splits off: «لنت‌های» → «لنت» + «های».
const STOPWORDS = new Set(["و", "برای", "مخصوص", "به", "از", "با", "در", "را", "که", "یا", "مدل", "ها", "های", "ی", "ای", "هایی"]);

/** Latin/alternative spellings customers type, mapped to the spelling used in product names. */
const SYNONYMS: Record<string, string[]> = {
  pride: ["پراید"], peride: ["پراید"], tiba: ["تیبا"], saina: ["ساینا"], quick: ["کوییک"], کوئیک: ["کوییک"],
  samand: ["سمند"], dena: ["دنا"], rana: ["رانا"], peugeot: ["پژو"], pejo: ["پژو"], pars: ["پارس"],
  runna: ["رانا"], xantia: ["زانتیا"], l90: ["ال 90"], tondar: ["تندر"], mvm: ["ام وی ام"],
  kia: ["کیا"], hyundai: ["هیوندای"], toyota: ["تویوتا"], nissan: ["نیسان"], renault: ["رنو"],
  bosch: ["بوش"], lent: ["لنت"], filter: ["فیلتر"], oil: ["روغن"],
  لنتترمز: ["لنت ترمز"], روغنموتور: ["روغن موتور"], کمکفنر: ["کمک فنر"],
};

/** Real car and brand names: never "corrected" into a similar name («ساینا» is not a typo of «سایپا»). */
const KNOWN_WORDS = new Set(
  [...Object.keys(SYNONYMS), ...Object.values(SYNONYMS).flat(), "سایپا", "ایران خودرو", "ساینا", "شاهین", "آریو", "هایما", "جک", "چری", "لیفان", "برلیانس", "دانگ فنگ"]
    .flatMap((w) => normalize(w).split(" ")),
);

/** Query words, without filler words, each with the spellings it may appear under. */
export function queryTerms(query: string): string[][] {
  const words = normalize(query).split(" ").filter(Boolean).slice(0, 8);
  const kept = words.filter((w) => !STOPWORDS.has(w));
  const list = kept.length ? kept : words;
  const terms: string[][] = [];
  for (const w of new Set(list)) {
    const forms = new Set([w]);
    // Plural and «ی» endings: «لنت‌ها» → «لنت», «جلوی» → «جلو» (matching is by prefix, so shorter is broader).
    if (w.length >= 4 && w.endsWith("های")) forms.add(w.slice(0, -3));
    else if (w.length >= 4 && w.endsWith("ها")) forms.add(w.slice(0, -2));
    else if (w.length >= 4 && /\p{Script=Arabic}/u.test(w) && w.endsWith("ی")) forms.add(w.slice(0, -1));
    for (const s of SYNONYMS[w] ?? []) forms.add(normalize(s));
    terms.push([...forms]);
  }
  return terms;
}

/** Edit distance (swapped neighbours count as one typo) with an early exit once it exceeds `max`. */
function withinDistance(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let before: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], before[j - 2] + 1);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return false;
    before = prev;
    prev = cur;
  }
  return prev[b.length] <= max;
}

/**
 * How well one spelling matches a field's words: 1 whole word, 0.8 start of a word, 0.5 inside a word
 * (compounds), 0.35 one-letter typo; 0 = no match. Very short words must match more strictly.
 */
function matchQuality(form: string, words: string[], joined: string, fuzzy: boolean): number {
  let best = 0;
  for (const w of words) {
    if (w === form) return 1;
    if (form.length >= 2 && w.startsWith(form)) best = Math.max(best, 0.8);
  }
  if (best) return best;
  if (form.length >= 3 && joined.includes(form)) return 0.5; // "ترمز" inside "لنتترمز", or across a space
  if (fuzzy && form.length >= 4 && !KNOWN_WORDS.has(form)) {
    const max = form.length >= 7 ? 2 : 1;
    for (const w of words) {
      if (withinDistance(form, w, max) || (w.length > form.length && withinDistance(form, w.slice(0, form.length), max))) return 0.35;
    }
  }
  return 0;
}

type Field = { words: string[]; joined: string; weight: number };

export type IndexedDoc = SearchDoc & { fields: Field[]; codes: string[]; nameNorm: string };

function field(text: string, weight: number): Field {
  const n = normalize(text);
  return { words: n ? n.split(" ") : [], joined: n, weight };
}

/** Pre-normalizes the documents once so each search only compares strings. */
export function buildIndex(docs: SearchDoc[]): IndexedDoc[] {
  return docs.map((d) => ({
    ...d,
    nameNorm: normalize(d.name),
    codes: d.codes.filter(Boolean).map(compact),
    fields: [field(d.name, 3), ...d.related.filter(Boolean).map((r) => field(r, 1.5)), ...d.codes.filter(Boolean).map((c) => field(c, 2))],
  }));
}

/**
 * Ranks the index against a query. Only products containing every word are returned, unless none do.
 * Typos are forgiven only when the exact spelling finds nothing, so they never dilute good results.
 */
export function search(index: IndexedDoc[], query: string, limit = 2000): SearchResult {
  const terms = queryTerms(query);
  if (terms.length === 0) return { hits: [], partial: false };
  const exact = rank(index, query, terms, false, limit);
  if (exact.hits.length && !exact.partial) return exact;
  const fuzzy = rank(index, query, terms, true, limit);
  // Results found only by forgiving a typo are shown, but flagged as approximate.
  if (fuzzy.hits.length && !fuzzy.partial) return { hits: fuzzy.hits, partial: true };
  return exact.hits.length ? exact : fuzzy;
}

function rank(index: IndexedDoc[], query: string, terms: string[][], fuzzy: boolean, limit: number): SearchResult {
  const phrase = normalize(query);
  const code = compact(query);

  const scored = index.map((d) => {
    let score = 0;
    let matched = 0;
    // A typed part code matches as a whole ("BR1008", "br-1008").
    const codeHit = code.length >= 3 && d.codes.some((c) => c === code || c.startsWith(code));
    for (const forms of terms) {
      let best = 0;
      for (const f of d.fields) {
        for (const form of forms) best = Math.max(best, matchQuality(form, f.words, f.joined, fuzzy) * f.weight);
      }
      if (best === 0 && codeHit) best = 2;
      if (best > 0) matched++;
      score += best;
    }
    if (codeHit) score += 6;
    if (phrase.length >= 3 && d.nameNorm.includes(phrase)) score += 3; // the words in the same order
    if (terms[0].some((f) => d.nameNorm.startsWith(f))) score += 1;
    if (d.inStock) score += 0.75;
    score += Math.min(d.soldCount, 1000) / 5000; // tie-break towards popular items
    return { id: d.id, score, matched };
  });

  const full = scored.filter((s) => s.matched === terms.length);
  let pool = full;
  let partial = false;
  if (full.length === 0 && terms.length > 1) {
    // Nothing has every word: show what matches the most words (at least half of them).
    const most = Math.max(0, ...scored.map((s) => s.matched));
    if (most >= Math.ceil(terms.length / 2)) {
      pool = scored.filter((s) => s.matched === most);
      partial = true;
    }
  }
  const hits = pool
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ id, score }) => ({ id, score }));
  return { hits, partial };
}
