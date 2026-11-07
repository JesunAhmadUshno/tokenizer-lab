// JavaScript port of the repo's byte-level BPE, so the page can train and encode live.
// Mirrors level-1-learn/bpe.py (BPETokenizer), level-2-build/tokenizer.py (BuildTokenizer)
// and level-3-deep/study.py (NoPreTokenizer). src/bpe.check.mjs runs it in Node during
// `npm run build` and fails the build unless it reproduces the recorded Python numbers.

export const SPECIAL = { '<|pad|>': 256, '<|unk|>': 257, '<|bos|>': 258, '<|eos|>': 259, '<|mask|>': 260 };
export const FIRST_MERGE_ID = 261;
// Python: " ?[\wঀ-৿̀-ͯ]+| ?[^\s\wঀ-৿̀-ͯ]+|\s+"
// Python's Unicode \w is letters, numbers and underscore, which is \p{L}\p{N}_ here.
const W = '\\p{L}\\p{N}_\\u0980-\\u09ff\\u0300-\\u036f';
const PRE_RE = new RegExp(` ?[${W}]+| ?[^\\s${W}]+|\\s+`, 'gu');
const SPECIAL_RE = /(<\|mask\|>|<\|pad\|>|<\|unk\|>|<\|bos\|>|<\|eos\|>)/;
const enc = new TextEncoder();
const strictDec = new TextDecoder('utf-8', { fatal: true });
const looseDec = new TextDecoder('utf-8');

export const bytesOf = (s) => Array.from(enc.encode(s));
export const byteLen = (s) => enc.encode(s).length;
export const preTokenize = (text) => text.match(PRE_RE) ?? [];
export const words = (text) => text.split(/\s+/).filter(Boolean); // Python str.split()

// Same as load_segments / load_training_text: "### name" headers, lines joined, stripped,
// segments joined with "\n".
export function loadSegments(raw) {
  const segments = {};
  let cur = null;
  for (const line of raw.split(/\r\n|\r|\n/)) {
    if (line.startsWith('### ')) { cur = line.slice(4).trim(); segments[cur] = []; }
    else if (cur !== null) segments[cur].push(line);
  }
  for (const k of Object.keys(segments)) segments[k] = segments[k].join('\n').trim();
  return { segments, full: Object.values(segments).join('\n') };
}

function mergePair(ids, a, b, id) {
  const out = [];
  for (let i = 0; i < ids.length; i++) {
    if (i < ids.length - 1 && ids[i] === a && ids[i + 1] === b) { out.push(id); i++; }
    else out.push(ids[i]);
  }
  return out;
}

// Greedy BPE over weighted byte sequences. Each step merges the most frequent adjacent pair,
// ties broken on the smallest (a, b), exactly min(stats, key=(-count, pair)) in Python.
// Returns the merges in learn order and the weighted token count after each step.
export function learnMerges(seqs, numMerges, firstId, onStep) {
  const K = firstId + numMerges; // every id is below K, so a*K+b orders pairs like (a, b)
  const counts = new Int32Array(K * K);
  const merges = [];
  const lengths = [seqs.reduce((s, [ids, w]) => s + ids.length * w, 0)];
  for (let step = 0; step < numMerges; step++) {
    const touched = [];
    for (const [ids, w] of seqs) {
      for (let i = 0; i + 1 < ids.length; i++) {
        const key = ids[i] * K + ids[i + 1];
        if (counts[key] === 0) touched.push(key);
        counts[key] += w;
      }
    }
    if (!touched.length) break;
    let best = -1, bestCount = 0;
    for (const key of touched) {
      const c = counts[key];
      if (c > bestCount || (c === bestCount && key < best)) { best = key; bestCount = c; }
      counts[key] = 0;
    }
    const a = Math.floor(best / K), b = best % K, id = firstId + step;
    let total = 0;
    for (const s of seqs) {
      if (s[0].length >= 2) s[0] = mergePair(s[0], a, b, id);
      total += s[0].length * s[1];
    }
    merges.push([a, b]);
    lengths.push(total);
    if (onStep) onStep(step + 1);
  }
  return { merges, lengths };
}

export class Tokenizer {
  // merges: [[a, b], ...] in learn order; new ids start at firstId.
  // pre: pre-tokenize before encoding (Build) or encode each part whole (NoPre, Learn).
  // specials: reserve ids 256-260 and emit literal special strings as one id (Build, NoPre).
  constructor(merges, { firstId = FIRST_MERGE_ID, pre = true, specials = true } = {}) {
    Object.assign(this, { merges, firstId, pre, specials });
    this.rank = new Map(merges.map(([a, b], i) => [a * 65536 + b, firstId + i]));
    this.vocab = Array.from({ length: 256 }, (_, i) => [i]);
    if (specials) for (const [name, id] of Object.entries(SPECIAL)) this.vocab[id] = bytesOf(name);
    merges.forEach(([a, b], i) => { this.vocab[firstId + i] = this.vocab[a].concat(this.vocab[b]); });
    this.cache = new Map();
  }
  get vocabSize() { return 256 + (this.specials ? 5 : 0) + this.merges.length; }
  truncate(k) { return new Tokenizer(this.merges.slice(0, k), this); }
  encodeIds(ids) {
    while (ids.length >= 2) {
      let best = -1, bestRank = Infinity;
      for (let i = 0; i + 1 < ids.length; i++) {
        const r = this.rank.get(ids[i] * 65536 + ids[i + 1]);
        if (r !== undefined && r < bestRank) { bestRank = r; best = i; }
      }
      if (best < 0) break;
      ids = mergePair(ids, ids[best], ids[best + 1], bestRank);
    }
    return ids;
  }
  encodePart(part) {
    if (!this.pre) return this.encodeIds(bytesOf(part));
    const out = [];
    for (const chunk of preTokenize(part)) {
      let ids = this.cache.get(chunk);
      if (!ids) { ids = this.encodeIds(bytesOf(chunk)); this.cache.set(chunk, ids); }
      for (const id of ids) out.push(id);
    }
    return out;
  }
  encode(text) {
    if (!this.specials) return this.encodeIds(bytesOf(text));
    const out = [];
    for (const part of text.split(SPECIAL_RE)) {
      if (!part) continue;
      if (part in SPECIAL) out.push(SPECIAL[part]);
      else for (const id of this.encodePart(part)) out.push(id);
    }
    return out;
  }
  decode(ids) { return looseDec.decode(new Uint8Array(ids.flatMap((i) => this.vocab[i]))); }
  // Display text for one token, or null when its bytes are not valid UTF-8 on their own.
  tokenText(id) { try { return strictDec.decode(new Uint8Array(this.vocab[id])); } catch { return null; } }
}

export function trainPre(text, n, onStep) {
  const counts = new Map();
  for (const c of preTokenize(text)) counts.set(c, (counts.get(c) ?? 0) + 1);
  const r = learnMerges([...counts].map(([c, w]) => [bytesOf(c), w]), n, FIRST_MERGE_ID, onStep);
  return Object.assign(new Tokenizer(r.merges), { lengths: r.lengths });
}
export function trainSeq(text, n, onStep) {
  const r = learnMerges([[bytesOf(text), 1]], n, FIRST_MERGE_ID, onStep);
  return Object.assign(new Tokenizer(r.merges, { pre: false }), { lengths: r.lengths });
}
export function trainLearn(text, n, onStep) {
  const r = learnMerges([[bytesOf(text), 1]], n, 256, onStep);
  return Object.assign(new Tokenizer(r.merges, { firstId: 256, pre: false, specials: false }), { lengths: r.lengths });
}

// segment_metrics in study.py
export function segmentMetrics(tok, text) {
  const ids = tok.encode(text), ws = words(text), n = byteLen(text);
  const single = ws.filter((w) => tok.encode(w).length === 1).length;
  return {
    bytes: n, tokens: ids.length, bytes_per_token: ids.length ? n / ids.length : 0,
    words: ws.length, tokens_per_word: ws.length ? ids.length / ws.length : 0,
    single_token_word_share: ws.length ? single / ws.length : 0,
    roundtrip_exact: tok.decode(ids) === text,
  };
}

export function heldoutTokens(tok, heldout) {
  const row = {};
  for (const [k, t] of Object.entries(heldout)) row[k] = tok.encode(t).length;
  row.total = tok.encode(Object.values(heldout).join('\n')).length;
  return row;
}

// A token crosses a pre-token boundary when the Build pre-tokenizer would split its text.
// Such a token cannot exist under pre-tokenization (variant A).
export const crossesBoundary = (text) => text !== null && preTokenize(text).length > 1;
