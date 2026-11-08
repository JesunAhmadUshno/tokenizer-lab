import { useMemo, useState, useEffect, useCallback, useId } from 'react';
import learnR from '../../level-1-learn/results_learn.json';
import buildR from '../../level-2-build/results_build.json';
import deepR from '../../level-3-deep/results_deep.json';
import rigorR from '../../level-3-deep/results_rigor.json';
import heldout from '../../level-3-deep/heldout.json';
import buildRaw from '../../level-2-build/corpus.txt?raw';
import learnRaw from '../../level-1-learn/corpus.txt?raw';
import reportRaw from '../../REPORT.md?raw';
import { loadSegments, trainPre, trainSeq, trainLearn, segmentMetrics, heldoutTokens, crossesBoundary, byteLen } from './bpe.js';

const REPO = 'https://github.com/JesunAhmadUshno/tokenizer-lab';
const blob = (p) => `${REPO}/blob/main/${p}`;
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const f3 = (x) => x.toFixed(3);
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

// Test count, counted from the test files at build time.
const testFiles = import.meta.glob('../../tests/test_*.py', { query: '?raw', import: 'default', eager: true });
const TEST_COUNT = Object.values(testFiles).reduce((s, src) => s + (src.match(/^\s+def test_/gm) || []).length, 0);
// The backlog is the numbered list under REPORT.md's "## Future work" heading.
const futureWork = (reportRaw.split(/^## Future work\s*$/m)[1] || '').split(/^## /m)[0];
const BACKLOG = [...futureWork.matchAll(/^(\d+)\. ([^:]+):/gm)].map((m) => m[2]);

const CORPORA = {
  build: { label: 'Build corpus', file: 'level-2-build/corpus.txt', ...loadSegments(buildRaw) },
  learn: { label: 'Learn corpus', file: 'level-1-learn/corpus.txt', ...loadSegments(learnRaw) },
};
const HELDOUT_TEXT = Object.values(heldout).join('\n');
const HELDOUT_BYTES = rigorR.sweep.heldout_bytes;
const V = deepR.variants;
const VARIANTS = [
  ['A_pretoken_500', 'A · pre-tok on, 500', 'var(--primary)'],
  ['B_nopretoken_500', 'B · pre-tok off, 500', 'var(--warn)'],
  ['C_pretoken_100', 'C · pre-tok on, 100', 'var(--good)'],
  ['baseline_bytes', 'Byte baseline', 'var(--muted)'],
];
const SEGS = Object.keys(heldout);
const wallRatio = V.B_nopretoken_500.encode_wall_seconds_per_pass / V.A_pretoken_500.encode_wall_seconds_per_pass;
const rigorRatio = rigorR.scaling[0].B.median_ms / rigorR.scaling[0].A.median_ms;
const trainBpt500 = buildR.per_segment['500'].total.bytes_per_token;
const STEP = 25;

const SECTIONS = [['top', 'Overview', '◎'], ['trainer', 'Trainer', '⚙'], ['playground', 'Playground', '⌨'], ['heldout', 'Held-out', '▥'], ['sweep', 'Merge curve', '⟋'], ['boundary', 'Boundaries', '⟂'], ['failures', 'Failure modes', '⚠'], ['limits', 'Limits', '◇'], ['reproduce', 'Reproduce', '❯_']];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function MenuBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (
    <div className="menubar" role="banner">
      <span className="apple" aria-hidden="true">◆</span>
      <a className="app" href="#top">Tokenizer Lab</a>
      <a className="m" href={blob('level-1-learn/README.md')}>Learn</a>
      <a className="m" href={blob('level-2-build/README.md')}>Build</a>
      <a className="m" href={blob('level-3-deep/README.md')}>Deep</a>
      <a className="m" href={blob('REPORT.md')}>Report</a>
      <span className="spacer" />
      <span className="status"><i /> Parity-checked against Python</span>
      <a href={REPO}>GitHub ↗</a>
      <span className="clock">{now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

function Dock() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dock" aria-label="Sections">
      {SECTIONS.map(([id, label, icon]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}>
          <span className="ico" aria-hidden="true">{icon}</span><span className="lbl">{label}</span>
        </a>
      ))}
    </nav>
  );
}

function Range({ label, value, min, max, step, onChange, show }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label} <span>{show}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function Seg({ label, value, options, onChange, disabled }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([k, l]) => <button key={k} aria-pressed={value === k} disabled={disabled} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}

// Train in the browser. Under 0.2 s even for the 1,000-merge no-pre-tokenization run, so it runs
// on the main thread after one yielded frame (ponytail: move to a Web Worker if corpora grow).
function trainNow({ corpus, mode, merges }) {
  const c = CORPORA[corpus];
  const t0 = performance.now();
  const tok = corpus === 'learn' ? trainLearn(c.full, merges) : mode === 'pre' ? trainPre(c.full, merges) : trainSeq(c.full, merges);
  const ms = performance.now() - t0;
  const curve = [];
  for (let k = 0; k <= tok.merges.length; k += STEP) curve.push({ merges: k, heldout: heldoutTokens(tok.truncate(k), heldout), train: tok.lengths[k] });
  return { tok, ms, curve, corpus, mode: corpus === 'learn' ? 'seq' : mode, merges: tok.merges.length, trainTokens: tok.encode(c.full).length, trainBytes: byteLen(c.full) };
}

// The recorded Python number for the same setting, when one exists.
function recordedFor(run) {
  const k = run.merges;
  if (run.corpus === 'learn') return { train: learnR.sweep.find((r) => r.merges === k)?.tokens, heldout: undefined };
  const row = rigorR.sweep.rows.find((r) => r.merges === k);
  const sweep = buildR.sweep.find((r) => r.merges === k);
  if (run.mode === 'pre') return { train: sweep?.tokens ?? row?.A_train_tokens, heldout: row?.A.total };
  return { train: undefined, heldout: row?.B.total };
}

export default function App() {
  useReveal();
  const [run, setRun] = useState(null);
  const [bVocab, setBVocab] = useState(null);
  useEffect(() => {
    setRun(trainNow({ corpus: 'build', mode: 'pre', merges: 500 }));
    // Variant B at 500 merges for the boundary explorer, trained once after first paint.
    const t = setTimeout(() => setBVocab(trainSeq(CORPORA.build.full, 500)), 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="wrap">
      <MenuBar />
      <div className="glow" aria-hidden="true" />
      <Hero />
      <Trainer run={run} setRun={setRun} />
      <Playground run={run} />
      <HeldOut />
      <Sweep run={run} />
      <Boundary bTok={bVocab} />
      <Failures bTok={bVocab} />
      <Limits />
      <Reproduce />
      <Dock />
      <footer>
        Code: Apache-2.0. Recorded numbers are read from <code>level-*/results_*.json</code> at build time. The trainer and playground run the repo’s BPE, ported to JavaScript, on the committed corpus in your browser; the build fails unless that port reproduces every recorded Python token count.
      </footer>
    </div>
  );
}

function Hero() {
  const a = V.A_pretoken_500.total, b = V.B_nopretoken_500.total, c = V.C_pretoken_100.total, base = V.baseline_bytes.total;
  const lossless = ['A_pretoken_500', 'B_nopretoken_500', 'C_pretoken_100'].every((k) => V[k].all_roundtrip_exact);
  return (
    <header className="card hero window" id="top" data-title="tokenizer-lab — README.md">
      <div className="head">
        <p className="eyebrow">Byte-pair encoding from scratch · English, Bangla, code</p>
        <span className={`pill ${lossless ? 'good' : 'bad'}`}>● {lossless ? 'All variants lossless' : 'Round trip failed'}</span>
      </div>
      <h1>On new text, the <em>merge count</em> sets the cost, not pre-tokenization.</h1>
      <p className="sub">
        A byte-level BPE tokenizer written in plain Python, trained on a {fmt(buildR.corpus_bytes)}-byte mixed corpus and tested on {fmt(HELDOUT_BYTES)} bytes of held-out text it never saw.
        Going from 100 to 500 merges cuts held-out tokens from {c.tokens} to {a.tokens}. Turning pre-tokenization off barely moves the count ({b.tokens}), yet made encoding {wallRatio.toFixed(1)}× and {rigorRatio.toFixed(1)}× slower in two recorded runs on different machines.
        The trainer below is that same algorithm running in your browser.
      </p>
      <div className="actions">
        <a className="btn primary" href="#trainer">Train a tokenizer live</a>
        <a className="btn ghost" href="#playground">Tokenize your own text</a>
        <span className="hint">{TEST_COUNT} Python tests · stdlib only · deterministic</span>
      </div>
      <div className="tiles">
        <div className="tile"><div className="num">{a.tokens}</div><div className="cap">held-out tokens, A: pre-tokenization on, 500 merges ({f3(a.bytes_per_token)} bytes/token)</div></div>
        <div className="tile"><div className="num">{b.tokens}</div><div className="cap">held-out tokens, B: pre-tokenization off, 500 merges ({f3(b.bytes_per_token)})</div></div>
        <div className="tile"><div className="num">{c.tokens}</div><div className="cap">held-out tokens, C: pre-tokenization on, 100 merges ({f3(c.bytes_per_token)})</div></div>
        <div className="tile"><div className="num">{fmt(base.tokens)}</div><div className="cap">held-out tokens with no merges at all (one token per byte)</div></div>
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        Recorded 2026-11-04 (<a href={blob('level-3-deep/results_deep.json')}>results_deep.json</a>). Training corpora: Build {fmt(buildR.corpus_bytes)} bytes, {fmt(buildR.unique_pre_tokens)} unique pre-tokens; Learn {fmt(learnR.corpus_bytes)} bytes.
      </p>
    </header>
  );
}

function Curve({ series, xMax, yMax, yLabel, xLabel, aria, marks = [], W = 960, H = 300 }) {
  const pad = { l: 48, r: 16, t: 18, b: 30 };
  const sx = (x) => pad.l + (x / xMax) * (W - pad.l - pad.r);
  const sy = (y) => pad.t + (1 - y / yMax) * (H - pad.t - pad.b);
  const yt = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
      {yt.map((t) => <g key={t}><line className="axis" x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} /><text x={pad.l - 8} y={sy(t) + 4} textAnchor="end">{t.toFixed(1)}</text></g>)}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <text key={f} x={sx(f * xMax)} y={H - 10} textAnchor="middle">{Math.round(f * xMax)}</text>)}
      {series.map((s) => (
        <g key={s.name}>
          {s.line !== false && <polyline fill="none" stroke={s.color} strokeWidth={s.width ?? 2.2} strokeDasharray={s.dash} points={s.pts.map(([x, y]) => `${sx(x)},${sy(Math.min(y, yMax))}`).join(' ')} />}
          {s.dots && s.pts.map(([x, y]) => <circle key={x} cx={sx(x)} cy={sy(Math.min(y, yMax))} r={s.r ?? 3.5} fill={s.dotFill ?? s.color} stroke={s.color} strokeWidth="1.5" />)}
        </g>
      ))}
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={sx(m.x)} x2={sx(m.x)} y1={sy(m.y1)} y2={sy(m.y2)} stroke="var(--text)" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x={sx(m.x) + 8} y={(sy(m.y1) + sy(m.y2)) / 2} style={{ fill: 'var(--text)' }}>{m.label}</text>
        </g>
      ))}
      <text x={pad.l} y={pad.t - 2}>{yLabel}</text>
      <text x={W - pad.r} y={H - 10} textAnchor="end" dy="-14">{xLabel}</text>
    </svg>
  );
}

function Trainer({ run, setRun }) {
  const [corpus, setCorpus] = useState('build');
  const [mode, setMode] = useState('pre');
  const [merges, setMerges] = useState(500);
  const [busy, setBusy] = useState(false);
  const go = useCallback((cfg) => {
    setBusy(true);
    requestAnimationFrame(() => setTimeout(() => { setRun(trainNow(cfg)); setBusy(false); }, 0));
  }, [setRun]);
  const pickCorpus = (c) => { setCorpus(c); const m = Math.min(merges, c === 'learn' ? 400 : 1000); setMerges(m); go({ corpus: c, mode, merges: m }); };
  const rec = run && recordedFor(run);
  const last = run?.curve[run.curve.length - 1];
  const tok = run?.tok;
  const rows = useMemo(() => {
    if (!tok) return [];
    const out = tok.merges.map(([a, b], i) => ({ id: tok.firstId + i, a, b }));
    return out.length > 40 ? [...out.slice(0, 20), null, ...out.slice(-20)] : out;
  }, [tok]);
  const show = (id) => { const t = tok.tokenText(id); return t === null ? `⟨${tok.vocab[id].map((x) => x.toString(16).padStart(2, '0')).join(' ')}⟩` : JSON.stringify(t).slice(1, -1).replace(/ /g, '␣').replace(/\\n/g, '↵'); };
  const match = (got, want) => want === undefined ? null : got === want;
  const checks = run ? [match(run.trainTokens, rec.train), match(last.merges === run.merges ? last.heldout.total : undefined, rec.heldout)].filter((x) => x !== null) : [];
  return (
    <section id="trainer" className="card window reveal" data-title="bpe_trainer.app — live in your browser">
      <div className="head">
        <div>
          <p className="eyebrow">Live · computed in your browser</p>
          <h2>Train the real tokenizer on the real corpus, right here.</h2>
          <p className="sub">
            This is <a href={blob('level-2-build/tokenizer.py')}>tokenizer.py</a> and <a href={blob('level-3-deep/study.py')}>study.py</a> ported line for line to JavaScript: count adjacent byte pairs, merge the most frequent, break ties on the smallest pair, repeat.
            With pre-tokenization on, pairs are counted inside words and punctuation runs only; off, they are counted across the whole corpus. The Learn corpus uses the simpler Level 1 algorithm.
          </p>
        </div>
        {run && (checks.length
          ? <span className={`pill ${checks.every(Boolean) ? 'good' : 'bad'}`}>{checks.every(Boolean) ? '✓ Matches the recorded Python run' : '✕ Differs from Python'}</span>
          : <span className="pill info">No recorded Python point at this setting</span>)}
      </div>
      <div className="controls">
        <div className="field"><label>Training corpus</label><Seg label="Training corpus" value={corpus} onChange={pickCorpus} options={[['build', `Build · ${fmt(buildR.corpus_bytes)} B`], ['learn', `Learn · ${fmt(learnR.corpus_bytes)} B`]]} /></div>
        <div className="field"><label>Pre-tokenization {corpus === 'learn' && <span>Level 1 has none</span>}</label><Seg label="Pre-tokenization" value={corpus === 'learn' ? 'seq' : mode} disabled={corpus === 'learn'} onChange={(m) => { setMode(m); go({ corpus, mode: m, merges }); }} options={[['pre', 'On (variant A)'], ['seq', 'Off (variant B)']]} /></div>
        <Range label="Merges to learn" value={merges} min={0} max={corpus === 'learn' ? 400 : 1000} step={corpus === 'learn' ? 10 : 25} onChange={setMerges} show={merges} />
      </div>
      <div className="actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <button className="btn primary" onClick={() => go({ corpus, mode, merges })} disabled={busy}>{busy ? 'Training…' : `Train ${merges} merges`}</button>
        <span className="hint">{run ? `Last run: ${run.merges} merges on the ${CORPORA[run.corpus].label.toLowerCase()} in ${run.ms.toFixed(0)} ms (your browser, not a study timing).` : 'Training…'}</span>
      </div>
      {run && (
        <>
          <div className="tiles t3" style={{ marginTop: 0 }}>
            <div className="tile"><div className="num sm">{fmt(run.tok.vocabSize)}</div><div className="cap">vocabulary: 256 bytes{run.tok.specials ? ' + 5 special tokens' : ''} + {run.merges} merges</div></div>
            <div className="tile"><div className="num sm">{fmt(run.trainTokens)}</div><div className="cap">tokens for the {fmt(run.trainBytes)}-byte training corpus ({f3(run.trainBytes / run.trainTokens)} bytes/token){rec.train !== undefined && <> · Python: {fmt(rec.train)}</>}</div></div>
            <div className="tile"><div className="num sm">{fmt(last.heldout.total)}</div><div className="cap">tokens for the {fmt(HELDOUT_BYTES)}-byte held-out set ({f3(HELDOUT_BYTES / last.heldout.total)} bytes/token){rec.heldout !== undefined && <> · Python: {fmt(rec.heldout)}</>}</div></div>
          </div>
          <div className="grid2" style={{ marginTop: 16 }}>
            <div>
              <h3>Compression as merges are learned</h3>
              <Curve aria="Bytes per token on the training corpus and on held-out text after each merge, computed in the browser"
                W={460} H={280} xMax={Math.max(25, run.merges)} yMax={Math.max(2, Math.ceil(run.trainBytes / run.tok.lengths[run.merges]))} yLabel="bytes per token" xLabel="merges"
                series={[
                  { name: 'train', color: 'var(--primary)', pts: run.tok.lengths.map((n, k) => [k, run.trainBytes / n]) },
                  { name: 'held', color: 'var(--warn)', dots: true, r: 3, pts: run.curve.map((p) => [p.merges, HELDOUT_BYTES / p.heldout.total]) },
                ]} />
              <div className="legend"><span><i style={{ background: 'var(--primary)' }} />training corpus, every merge</span><span><i style={{ background: 'var(--warn)' }} />held-out text, every {STEP} merges</span></div>
            </div>
            <div>
              <h3>Learned merges <span className="hint">(id: left + right → new token)</span></h3>
              <div className="mergetable" style={{ marginTop: 8 }}>
                <table>
                  <thead><tr><th>id</th><th>left</th><th>right</th><th>new token</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => r === null
                      ? <tr key="gap"><td colSpan="4" className="hint">… {run.merges - 40} more merges …</td></tr>
                      : <tr key={r.id}><td className="mono">{r.id}</td><td><span className="tk">{show(r.a)}</span></td><td><span className="tk">{show(r.b)}</span></td>
                        <td><span className="tk">{show(r.id)}</span>{crossesBoundary(tok.tokenText(r.id)) && <span className="pill warn" style={{ marginLeft: 6, padding: '0 8px' }} title="Spans a word or punctuation boundary">⟂</span>}</td></tr>)}
                    {!rows.length && <tr><td colSpan="4" className="hint">No merges: every byte is its own token.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="hint">␣ is a space, ↵ a newline. ⟨hex⟩ marks a token whose bytes are part of a multi-byte character. ⟂ marks a token that crosses a word boundary, which pre-tokenization forbids.</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

const PRESETS = [
  ...SEGS.map((k) => [`Held-out ${k}`, heldout[k]]),
  ['Special token', 'start <|eos|> end'],
  ['Crafted repeat', 'ab cd ab cd ab cd ab cd ab cd ab cd'],
];

function Playground({ run }) {
  const [text, setText] = useState(heldout.english);
  const id = useId();
  const tok = run?.tok;
  const res = useMemo(() => {
    if (!tok) return null;
    const ids = tok.encode(text);
    const m = segmentMetrics(tok, text);
    return { ids, m, spans: ids.map((i) => ({ i, t: tok.tokenText(i), hex: tok.vocab[i].map((x) => x.toString(16).padStart(2, '0')).join(' ') })) };
  }, [tok, text]);
  return (
    <section id="playground" className="card window reveal" data-title="encode.py — playground">
      <div className="head">
        <div>
          <p className="eyebrow">Live · uses the tokenizer you just trained</p>
          <h2>See exactly where the tokenizer cuts your text.</h2>
          <p className="sub">
            Type English, Bangla or code, or load a held-out sample. Each coloured span is one token. Bangla letters take three bytes each in UTF-8, so a token can end mid-letter; those fragments show as hex bytes.
            {run && <> Current tokenizer: {CORPORA[run.corpus].label.toLowerCase()}, {run.merges} merges, pre-tokenization {run.mode === 'pre' ? 'on' : 'off'}.</>}
          </p>
        </div>
      </div>
      <div>
        <label htmlFor={id} className="hint" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Text to tokenize</label>
        <textarea id={id} value={text} maxLength={6000} onChange={(e) => setText(e.target.value)} spellCheck="false" />
        <div className="presets">{PRESETS.map(([l, t]) => <button key={l} onClick={() => setText(t)}>{l}</button>)}</div>
      </div>
      {res && (
        <>
          <div className="tiles t6" style={{ marginTop: 0, marginBottom: 14 }}>
            <div className="tile"><div className="num sm">{fmt(res.m.tokens)}</div><div className="cap">tokens</div></div>
            <div className="tile"><div className="num sm">{fmt(res.m.bytes)}</div><div className="cap">UTF-8 bytes</div></div>
            <div className="tile"><div className="num sm">{res.m.tokens ? res.m.bytes_per_token.toFixed(2) : '–'}</div><div className="cap">bytes per token</div></div>
            <div className="tile"><div className="num sm">{res.m.words ? res.m.tokens_per_word.toFixed(2) : '–'}</div><div className="cap">tokens per word</div></div>
            <div className="tile"><div className="num sm">{res.m.words ? pct(res.m.single_token_word_share, 0) : '–'}</div><div className="cap">words kept as one token</div></div>
            <div className="tile"><div className="num sm" style={{ color: res.m.roundtrip_exact ? 'var(--good)' : 'var(--bad)' }}>{res.m.roundtrip_exact ? '✓' : '✕'}</div><div className="cap">decode(encode(text)) equals text</div></div>
          </div>
          <div className="tokens" aria-label="Tokenized text">
            {res.spans.map((s, k) => s.i >= 256 && s.i <= 260 && tok.specials
              ? <span key={k} className="sp" title={`special id ${s.i}`}>{s.t}</span>
              : s.t === null
                ? <span key={k} className={`t${k % 5} hex`} title={`id ${s.i}: bytes ${s.hex}`}>{s.hex}</span>
                : <span key={k} className={`t${k % 5}`} title={`id ${s.i}: bytes ${s.hex}`}>{s.t.replace(/\n/g, '↵\n')}</span>)}
          </div>
          <p className="hint" style={{ marginTop: 10, marginBottom: 6 }}>Token ids{res.ids.length > 300 ? ' (first 300)' : ''}. Special tokens such as <code>&lt;|eos|&gt;</code> are matched before byte encoding and get one reserved id (256 to 260){tok.specials ? '' : '; the Level 1 tokenizer has none, so it encodes them as plain bytes'}.</p>
          <div className="ids">{res.ids.slice(0, 300).join(' ')}</div>
        </>
      )}
    </section>
  );
}

function HeldOut() {
  const [metric, setMetric] = useState('bytes_per_token');
  const groups = [...SEGS, 'total'];
  const val = (v, g) => (g === 'total' ? V[v].total : V[v].per_segment[g])[metric];
  const max = Math.max(...groups.flatMap((g) => VARIANTS.map(([v]) => val(v, g))));
  const yMax = metric === 'single_token_word_share' ? Math.max(0.25, Math.ceil(max * 20) / 20) : Math.ceil(max);
  const W = 960, H = 280, pad = { l: 44, r: 10, t: 14, b: 36 };
  const gw = (W - pad.l - pad.r) / groups.length, bw = gw / (VARIANTS.length + 1.4);
  const sy = (y) => pad.t + (1 - y / yMax) * (H - pad.t - pad.b);
  const fmtV = (x) => metric === 'single_token_word_share' ? x.toFixed(3) : x.toFixed(2);
  const bs = rigorR.bootstrap;
  const mix = rigorR.mix_ablation.rows;
  return (
    <section id="heldout" className="card window reveal" data-title="results_deep.json — recorded 2026-11-04">
      <div className="head">
        <div>
          <p className="eyebrow">Recorded replay · held-out study</p>
          <h2>Three tokenizers on {fmt(HELDOUT_BYTES)} bytes they never trained on.</h2>
          <p className="sub">
            Recorded results of <a href={blob('level-3-deep/run_deep.py')}>run_deep.py</a> (Python 3.12.3, 2026-11-04). The held-out set holds {SEGS.map((s) => `${s} ${fmt(deepR.heldout_bytes[s])} B`).join(', ')}, with {V.A_pretoken_500.total.words} words; a test checks no held-out sentence appears in training.
            Bytes per token is cost, not quality: a higher number means fewer tokens for the same text.
          </p>
        </div>
        <Seg label="Metric" value={metric} onChange={setMetric} options={[['bytes_per_token', 'Bytes per token'], ['tokens_per_word', 'Tokens per word'], ['single_token_word_share', 'Single-token words']]} />
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grouped bar chart of ${metric.replace(/_/g, ' ')} by segment for variants A, B, C and the byte baseline`}>
        {Array.from({ length: 5 }, (_, i) => (yMax / 4) * i).map((t) => <g key={t}><line className="axis" x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} /><text x={pad.l - 8} y={sy(t) + 4} textAnchor="end">{fmtV(t)}</text></g>)}
        {groups.map((g, gi) => (
          <g key={g}>
            {VARIANTS.map(([v, l, c], vi) => {
              const x = pad.l + gi * gw + bw * (0.7 + vi), y = val(v, g);
              return <g key={v}><rect x={x} y={sy(y)} width={bw - 6} height={Math.max(0, sy(0) - sy(y))} rx="4" fill={c} opacity={v === 'baseline_bytes' ? 0.45 : 0.9}><title>{`${l}, ${g}: ${fmtV(y)}`}</title></rect>
                <text x={x + (bw - 6) / 2} y={sy(y) - 5} textAnchor="middle" style={{ fontSize: 10 }}>{fmtV(y)}</text></g>;
            })}
            <text x={pad.l + gi * gw + gw / 2} y={H - 12} textAnchor="middle" style={{ fill: 'var(--text)', fontWeight: 600 }}>{g}</text>
          </g>
        ))}
      </svg>
      <div className="legend">{VARIANTS.map(([v, l, c]) => <span key={v}><i style={{ background: c }} />{l}</span>)}</div>
      <div className="scroll-x" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Variant</th><th>Vocab</th><th>Tokens</th><th>Bytes/token</th><th>Tokens/word</th><th>Single-token words</th><th>Encode, ms per pass</th><th>Lossless</th></tr></thead>
          <tbody>
            {VARIANTS.map(([v, l]) => {
              const t = V[v].total, w = V[v].encode_wall_seconds_per_pass;
              return <tr key={v}><td>{l}</td><td>{V[v].vocab_size}</td><td>{fmt(t.tokens)}</td><td>{f3(t.bytes_per_token)}</td><td>{f3(t.tokens_per_word)}</td><td>{f3(t.single_token_word_share)}</td><td>{w == null ? 'n/a' : (w * 1000).toFixed(3)}</td><td className={V[v].all_roundtrip_exact ? 'ok' : 'no'}>{V[v].all_roundtrip_exact ? 'yes' : 'no'}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">Encode times are one machine, mean of 20 passes, recorded; only the B to A ratio ({wallRatio.toFixed(1)}×) is treated as a finding.</p>
      <div className="grid2" style={{ marginTop: 20 }}>
        <div className="tile">
          <h3>Is the difference real? Bootstrap intervals</h3>
          <p className="hint" style={{ fontSize: 13 }}>
            {bs.reps.toLocaleString()} paired resamples of {Object.values(bs.units).reduce((s, x) => s + x, 0)} held-out sentences and code lines (seed {bs.seed}, recorded 2026-11-07, <a href={blob('level-3-deep/results_rigor.json')}>results_rigor.json</a>).
          </p>
          <table>
            <thead><tr><th>Difference</th><th>Point</th><th>95% interval</th></tr></thead>
            <tbody>
              <tr><td>C minus A tokens (100 vs 500 merges)</td><td>{bs.C_minus_A_tokens.point}</td><td>{bs.C_minus_A_tokens.ci95[0]} to {bs.C_minus_A_tokens.ci95[1]}</td></tr>
              <tr><td>A minus B tokens (pre-tok on vs off)</td><td>{bs.A_minus_B_tokens.point}</td><td>{bs.A_minus_B_tokens.ci95[0]} to {bs.A_minus_B_tokens.ci95[1]}</td></tr>
            </tbody>
          </table>
          <p className="hint" style={{ fontSize: 13, marginBottom: 0 }}>
            The merge-count cut ({bs.C_to_A_cut_percent_of_C.point.toFixed(1)}%, interval {bs.C_to_A_cut_percent_of_C.ci95[0].toFixed(1)} to {bs.C_to_A_cut_percent_of_C.ci95[1].toFixed(1)}%) is far from zero. The pre-tokenization difference is small and its interval reaches zero; encoded sentence by sentence A is slightly cheaper, while on whole segments B is ({V.B_nopretoken_500.total.tokens} vs {V.A_pretoken_500.total.tokens}). Its sign depends on how text is chunked.
          </p>
        </div>
        <div className="tile">
          <h3>Who pays when a language leaves the training mix</h3>
          <p className="hint" style={{ fontSize: 13 }}>Variant A at {rigorR.mix_ablation.merges} merges, retrained with one training segment left out. Held-out tokens (recorded 2026-11-07).</p>
          <table>
            <thead><tr><th>Training mix</th>{SEGS.map((s) => <th key={s}>{s}</th>)}<th>total</th></tr></thead>
            <tbody>
              {Object.entries(mix).map(([k, r]) => <tr key={k}><td>{k.replace('_', ' ')}</td>{[...SEGS, 'total'].map((s) => <td key={s} className={k !== 'full' && r[s] > mix.full[s] * 1.25 ? 'no' : ''}>{r[s]}</td>)}</tr>)}
            </tbody>
          </table>
          <p className="hint" style={{ fontSize: 13, marginBottom: 0 }}>Dropping Bangla from training takes held-out Bangla from {mix.full.bangla} to {mix.without_bangla.bangla} tokens, the byte count: no merge it learned applies to Bengali script.</p>
        </div>
      </div>
    </section>
  );
}

function Sweep({ run }) {
  const rows = rigorR.sweep.rows, tb = rigorR.sweep.train_bytes;
  const live = run && run.corpus === 'build' ? run.curve : null;
  const r = (k) => rows.find((x) => x.merges === k);
  const saved = (a, b) => r(a).A.total - r(b).A.total;
  return (
    <section id="sweep" className="card window reveal" data-title="merge_sweep.svg — recorded + live">
      <div className="head">
        <div>
          <p className="eyebrow">Recorded sweep · live overlay</p>
          <h2>More merges keep paying on held-out text, but less each time.</h2>
          <p className="sub">
            Lines are recorded Python runs: the training-corpus sweep (<a href={blob('level-2-build/results_build.json')}>results_build.json</a>) and the dense held-out sweep every {rows[1].merges} merges (<a href={blob('level-3-deep/results_rigor.json')}>results_rigor.json</a>).
            Hollow dots are computed in your browser from the trainer above{live ? ` (${run.mode === 'pre' ? 'pre-tokenization on' : 'off'}, ${run.merges} merges)` : '; train on the Build corpus to see them'}. When they sit on the line, the port matches Python.
          </p>
        </div>
      </div>
      <Curve aria="Bytes per token against merge count on the training corpus and on held-out text, recorded lines with browser-computed dots"
        xMax={1000} yMax={6} yLabel="bytes per token" xLabel="merges"
        marks={[{ x: 500, y1: V.A_pretoken_500.total.bytes_per_token, y2: trainBpt500, label: `gap at 500 merges: ${f3(trainBpt500)} on training vs ${f3(V.A_pretoken_500.total.bytes_per_token)} held-out` }]}
        series={[
          { name: 'train', color: 'var(--text)', width: 1.6, pts: rows.map((x) => [x.merges, tb / x.A_train_tokens]) },
          { name: 'buildsweep', color: 'var(--text)', line: false, dots: true, r: 4, pts: buildR.sweep.map((x) => [x.merges, buildR.corpus_bytes / x.tokens]) },
          { name: 'A', color: 'var(--primary)', pts: rows.map((x) => [x.merges, HELDOUT_BYTES / x.A.total]) },
          { name: 'B', color: 'var(--warn)', dash: '6 4', pts: rows.map((x) => [x.merges, HELDOUT_BYTES / x.B.total]) },
          ...(live ? [{ name: 'live', color: run.mode === 'pre' ? 'var(--primary)' : 'var(--warn)', dotFill: 'var(--surface-strong)', line: false, dots: true, r: 4.5, pts: live.map((p) => [p.merges, HELDOUT_BYTES / p.heldout.total]) }] : []),
        ]} />
      <div className="legend">
        <span><i style={{ background: 'var(--text)' }} />training corpus (dots: Level 2 sweep)</span>
        <span><i style={{ background: 'var(--primary)' }} />held-out, pre-tokenization on</span>
        <span><i style={{ background: 'var(--warn)' }} />held-out, pre-tokenization off</span>
        <span><i style={{ background: 'var(--surface-strong)', boxShadow: '0 0 0 1.5px var(--primary)' }} />your browser</span>
      </div>
      <div className="tiles" style={{ marginTop: 18 }}>
        <div className="tile"><div className="num sm">{saved(0, 100)}</div><div className="cap">held-out tokens saved by the first 100 merges</div></div>
        <div className="tile"><div className="num sm">{saved(100, 500)}</div><div className="cap">saved by merges 100 to 500</div></div>
        <div className="tile"><div className="num sm">{saved(500, 1000)}</div><div className="cap">saved by merges 500 to 1,000</div></div>
        <div className="tile"><div className="num sm">{(trainBpt500 / V.A_pretoken_500.total.bytes_per_token).toFixed(2)}×</div><div className="cap">training-corpus compression over held-out at 500 merges</div></div>
      </div>
    </section>
  );
}

function Boundary({ bTok }) {
  const crossing = useMemo(() => {
    if (!bTok) return null;
    const all = bTok.merges.map((_, i) => bTok.firstId + i).map((id) => bTok.tokenText(id)).filter(crossesBoundary);
    return { n: all.length, top: [...all].sort((a, b) => b.length - a.length).slice(0, 14) };
  }, [bTok]);
  const craft = PRESETS[PRESETS.length - 1][1];
  const crafted = useMemo(() => ({ a: trainPre(craft, 30).encode(craft).length, b: trainSeq(craft, 30).encode(craft).length }), [craft]);
  const fac = rigorR.factorial;
  const sc = rigorR.scaling;
  const W = 460, H = 220, pad = { l: 46, r: 10, t: 12, b: 28 };
  const xMax = sc[sc.length - 1].bytes, yMax = Math.ceil(sc[sc.length - 1].B.q3_ms / 20) * 20;
  const sx = (x) => pad.l + (x / xMax) * (W - pad.l - pad.r), sy = (y) => pad.t + (1 - y / yMax) * (H - pad.t - pad.b);
  return (
    <section id="boundary" className="card window reveal" data-title="study.py — NoPreTokenizer">
      <p className="eyebrow">Live vocabulary · recorded timings</p>
      <h2>Without pre-tokenization, tokens swallow spaces and punctuation.</h2>
      <p className="sub">
        Variant B, trained in your browser at 500 merges, learns tokens that span word boundaries. They compress the training phrasing well and rarely repeat in new text.
        The 2×2 below separates the two things variant B changes at once: how merges are learned and how text is encoded.
      </p>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="tile">
          <h3>{crossing ? `${crossing.n} of ${bTok.merges.length} learned tokens cross a boundary` : 'Training variant B…'}</h3>
          <p className="hint" style={{ fontSize: 13 }}>The longest ones, quoted exactly (␣ is a space, ↵ a newline). Variant A cannot learn any of these.</p>
          <div className="chips">{crossing?.top.map((t) => <span key={t} className="tk">{JSON.stringify(t).slice(1, -1).replace(/\\n/g, '↵').replace(/ /g, '␣')}</span>)}</div>
        </div>
        <div className="tile">
          <h3>The crafted case, computed live</h3>
          <p className="hint" style={{ fontSize: 13 }}>Train each variant for 30 merges on <span className="tk">{craft}</span> and encode it back (the case from <a href={blob('tests/test_deep_study.py')}>test_deep_study.py</a>).</p>
          <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
            <div className="tile"><div className="num sm">{crafted.a}</div><div className="cap">tokens, pre-tokenization on</div></div>
            <div className="tile"><div className="num sm">{crafted.b}</div><div className="cap">token, pre-tokenization off</div></div>
          </div>
        </div>
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <h3>The 2×2 at 500 merges (recorded 2026-11-07)</h3>
          <div className="scroll-x" style={{ marginTop: 8 }}>
            <table>
              <thead><tr><th>Merges learned…</th><th>Encode per word</th><th>Encode whole text</th></tr></thead>
              <tbody>
                <tr><td>inside words (A)</td><td><b>{fac.pretrain_preencode.heldout.total}</b> tok · {fac.pretrain_preencode.encode_wall.median_ms.toFixed(2)} ms</td><td><b>{fac.pretrain_seqencode.heldout.total}</b> tok · {fac.pretrain_seqencode.encode_wall.median_ms.toFixed(2)} ms</td></tr>
                <tr><td>across text (B)</td><td><b>{fac.seqtrain_preencode.heldout.total}</b> tok · {fac.seqtrain_preencode.encode_wall.median_ms.toFixed(2)} ms</td><td><b>{fac.seqtrain_seqencode.heldout.total}</b> tok · {fac.seqtrain_seqencode.encode_wall.median_ms.toFixed(2)} ms</td></tr>
              </tbody>
            </table>
          </div>
          <p className="hint">Held-out tokens and median encode time over {fac.pretrain_preencode.encode_wall.repeats} repeats. The slowdown follows the encoder, not the merges; the token count follows how merges were learned. B’s merges used with a per-word encoder cost {fac.seqtrain_preencode.heldout.total - fac.seqtrain_seqencode.heldout.total} extra tokens.</p>
        </div>
        <div>
          <h3>Encode time as text grows (recorded, median and IQR)</h3>
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Median encode time against input length for variants A and B, recorded">
            {Array.from({ length: 5 }, (_, i) => (yMax / 4) * i).map((t) => <g key={t}><line className="axis" x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} /><text x={pad.l - 6} y={sy(t) + 4} textAnchor="end">{t}</text></g>)}
            {[['A', 'var(--primary)'], ['B', 'var(--warn)']].map(([k, c]) => (
              <g key={k}>
                <polyline fill="none" stroke={c} strokeWidth="2.2" points={sc.map((s) => `${sx(s.bytes)},${sy(s[k].median_ms)}`).join(' ')} />
                {sc.map((s) => <g key={s.copies}><line x1={sx(s.bytes)} x2={sx(s.bytes)} y1={sy(s[k].q1_ms)} y2={sy(s[k].q3_ms)} stroke={c} strokeWidth="5" opacity=".4" /><circle cx={sx(s.bytes)} cy={sy(s[k].median_ms)} r="3.5" fill={c} /></g>)}
              </g>
            ))}
            <text x={pad.l} y={H - 6}>{fmt(sc[0].bytes)} B</text><text x={W - pad.r} y={H - 6} textAnchor="end">{fmt(xMax)} bytes</text>
            <text x={pad.l + 4} y={pad.t + 8}>ms</text>
          </svg>
          <div className="legend"><span><i style={{ background: 'var(--primary)' }} />A, pre-tokenized encode</span><span><i style={{ background: 'var(--warn)' }} />B, whole-text encode</span></div>
          <p className="hint">Both grow roughly linearly: B is {(sc[0].B.median_ms / sc[0].A.median_ms).toFixed(1)}× slower at {fmt(sc[0].bytes)} bytes and {(sc[sc.length - 1].B.median_ms / sc[sc.length - 1].A.median_ms).toFixed(1)}× at {fmt(xMax)}. A constant factor on this machine ({rigorR.run.machine}, Python {rigorR.run.python}), not a blow-up; the earlier run measured {wallRatio.toFixed(1)}×.</p>
        </div>
      </div>
    </section>
  );
}

function Failures({ bTok }) {
  const A = V.A_pretoken_500, B = V.B_nopretoken_500, C = V.C_pretoken_100;
  const sc = rigorR.scaling;
  const nCross = bTok ? bTok.merges.map((_, i) => bTok.tokenText(bTok.firstId + i)).filter(crossesBoundary).length : null;
  const cards = [
    { t: 'Boundary crossing', big: nCross === null ? '…' : `${nCross} / ${bTok.merges.length}`, d: `Variant B tokens that span a word or punctuation boundary (computed live above). On repetitive text whole phrases collapse into one token, which overfits the training phrasing.` },
    { t: 'Encode cost', big: `${wallRatio.toFixed(1)}× / ${(sc[0].B.median_ms / sc[0].A.median_ms).toFixed(1)}×`, d: `Variant B encode time over variant A in the two recorded runs. The level README called it a blow-up; the scaling run shows a steady factor instead: B rescans the whole text once per applicable merge, and that count is capped by the vocabulary, not the text length.` },
    { t: 'Merge starvation', big: `${f3(C.total.tokens_per_word)}`, d: `Tokens per word for variant C (100 merges), against ${f3(A.total.tokens_per_word)} at 500. On Bangla it reaches ${f3(C.per_segment.bangla.tokens_per_word)}: every cost priced in tokens rises with it.` },
    { t: 'Bangla words split', big: ['A_pretoken_500', 'B_nopretoken_500', 'C_pretoken_100'].map((k) => V[k].per_segment.bangla.single_token_word_share.toFixed(3)).join(' · '), d: `Share of held-out Bangla words encoded as one token under A, B and C. Sub-word merges still reach ${f3(A.per_segment.bangla.bytes_per_token)} bytes per token under A.` },
    { t: 'Held-out gap', big: `${f3(trainBpt500)} → ${f3(A.total.bytes_per_token)}`, d: `Bytes per token for variant A on its training corpus versus held-out text. Cost estimates quoted from training-corpus numbers overstate the saving by about ${(trainBpt500 / A.total.bytes_per_token).toFixed(1)}× here.` },
  ];
  return (
    <section id="failures" className="card window reveal" data-title="FAILURE-MODES.txt">
      <p className="eyebrow">Failure modes</p>
      <h2>Where this tokenizer breaks, with the number for each.</h2>
      <p className="sub">From <a href={blob('level-3-deep/README.md')}>level-3-deep/README.md</a>, each tied to a value in the results files. B’s single-token word share ({f3(B.total.single_token_word_share)}) is the highest of the three, a reminder that whole-word tokens alone do not mean a better tokenizer.</p>
      <div className="fm" style={{ marginTop: 16 }}>
        {cards.map((c) => (
          <div className="tile" key={c.t}>
            <div className="head" style={{ marginBottom: 0 }}><h3>{c.t}</h3><span className="pill warn">Failure mode</span></div>
            <div className="big">{c.big}</div>
            <p className="hint" style={{ margin: 0, fontSize: 13 }}>{c.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Limits() {
  const limits = [
    `The training corpus is synthetic and template-built: ${fmt(buildR.corpus_bytes)} bytes with only ${fmt(buildR.unique_pre_tokens)} unique pre-tokens. Bangla reaching ${f3(buildR.per_segment['1000'].segments.find((s) => s.segment === 'bangla').bytes_per_token)} bytes per token on it is a template artifact.`,
    `The held-out set is ${fmt(HELDOUT_BYTES)} bytes and ${V.A_pretoken_500.total.words} words from one author on one day. Enough to separate the variants, far too small to rank real tokenizers.`,
    'No downstream model was trained. Quality is only round-trip exactness, lossless by construction, plus the single-token word share, a proxy.',
    'No production tokenizer (GPT-2 byte-level BPE, SentencePiece) was measured on the same text, so no claim is made against them.',
    'Encode times come from one machine per run and differ between runs; only ratios are reported, and the ratio itself moved between machines.',
    'Words are split on whitespace and no Unicode normalization is applied, which treats code and Bangla punctuation unevenly.',
  ];
  return (
    <section id="limits" className="card window reveal" data-title="REPORT.md — limits and future work">
      <p className="eyebrow">Honest limits</p>
      <h2>What this study cannot tell you yet.</h2>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <h3 style={{ marginBottom: 10 }}>Limits</h3>
          <ul className="limits">{limits.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
        <div>
          <h3 style={{ marginBottom: 10 }}>Future work, from <a href={blob('REPORT.md')}>REPORT.md</a></h3>
          <ol className="steps">{BACKLOG.map((b, i) => <li key={b}><span className="n">{i + 1}</span><div><b>{b}</b></div></li>)}</ol>
          <p className="hint">Every open gap, with the compute or data it needs, is in <a href={blob('REPORT.md')}>REPORT.md</a>.</p>
        </div>
      </div>
    </section>
  );
}

function Reproduce() {
  const docs = [
    ['level-1-learn/README.md', 'Level 1, Learn', 'BPE from zero, teaching path'],
    ['level-2-build/README.md', 'Level 2, Build', 'Pre-tokenization, specials, save/load'],
    ['level-3-deep/README.md', 'Level 3, Deep', 'Held-out study and failure modes'],
    ['level-3-deep/results_rigor.json', 'Rigor results', 'Sweep, bootstrap, 2×2, scaling, mix'],
    ['site/src/bpe.check.mjs', 'Parity gate', 'JS port checked against Python'],
    ['REPORT.md', 'Report', 'Results, threats and open gaps'],
  ];
  return (
    <section id="reproduce" className="card window reveal" data-title="Terminal — reproduce">
      <p className="eyebrow">Reproduce it</p>
      <h2>Python standard library only. Every number reruns in seconds.</h2>
      <ol className="steps" style={{ marginTop: 16 }}>
        <li><span className="n">1</span><div><b>Clone</b><div className="hint"><code>git clone {REPO}.git && cd tokenizer-lab</code></div></div></li>
        <li><span className="n">2</span><div><b>Run the studies</b><div className="hint"><code>python3 level-2-build/run_build.py && python3 level-3-deep/run_deep.py && python3 level-3-deep/run_rigor.py</code></div></div></li>
        <li><span className="n">3</span><div><b>Run the {TEST_COUNT} tests</b><div className="hint"><code>python3 -m unittest discover -s tests -v</code></div></div></li>
        <li><span className="n">4</span><div><b>Build this page, with the parity gate</b><div className="hint"><code>cd site && npm ci && npm run build</code></div></div></li>
      </ol>
      <div className="docs" style={{ marginTop: 20 }}>
        {docs.map(([p, t, d]) => <a key={p} href={blob(p)}><b>{t}</b><small>{d}</small></a>)}
      </div>
    </section>
  );
}
