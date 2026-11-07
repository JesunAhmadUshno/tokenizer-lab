// Known-answer parity gate, run by `npm run build` before vite build.
// Trains the JS port in Node on the repo's corpora and asserts it reproduces every token count
// the Python runners recorded in level-*/results_*.json. Any drift fails the build, so the live
// trainer on the page provably equals the Python code.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSegments, preTokenize, trainPre, trainSeq, trainLearn, segmentMetrics, heldoutTokens, Tokenizer } from './bpe.js';

const repo = new URL('../../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, repo), 'utf8');
const json = (p) => JSON.parse(read(p));
const learnR = json('level-1-learn/results_learn.json');
const buildR = json('level-2-build/results_build.json');
const deepR = json('level-3-deep/results_deep.json');
const rigorR = json('level-3-deep/results_rigor.json');
const heldout = json('level-3-deep/heldout.json');
const t0 = Date.now();
let checks = 0;
const eq = (got, want, what) => { assert.deepEqual(got, want, what); checks++; };

// Level 1: Learn BPE, merges from id 256, no pre-tokenization.
const learn = loadSegments(read('level-1-learn/corpus.txt'));
eq(new TextEncoder().encode(learn.full).length, learnR.corpus_bytes, 'learn corpus bytes');
const l200 = trainLearn(learn.full, 200);
for (const row of learnR.sweep) eq(l200.truncate(row.merges).encode(learn.full).length, row.tokens, `learn sweep @${row.merges}`);
for (const row of learnR.per_segment_200) eq(l200.encode(learn.segments[row.segment]).length, row.tokens, `learn ${row.segment} @200`);
const bangla1 = learn.segments.bangla.split('।')[0] + '।';
eq(l200.encode(bangla1).length, learnR.bangla_first_sentence.tokens, 'learn first Bangla sentence');
eq(trainLearn(learn.full, 100).merges, l200.merges.slice(0, 100), 'learn truncation equals a fresh 100-merge run');

// Level 2: Build BPE with pre-tokenization, weighted pair counts, specials 256-260.
const build = loadSegments(read('level-2-build/corpus.txt'));
const enc = new TextEncoder();
eq(enc.encode(build.full).length, buildR.corpus_bytes, 'build corpus bytes');
eq(new Set(preTokenize(build.full)).size, buildR.unique_pre_tokens, 'unique pre-tokens');
const a1000 = trainPre(build.full, 1000);
for (const row of buildR.sweep) {
  const tok = a1000.truncate(row.merges);
  eq(tok.encode(build.full).length, row.tokens, `build sweep @${row.merges}`);
  eq(tok.vocabSize, row.vocab_size, `build vocab @${row.merges}`);
}
for (const [m, block] of Object.entries(buildR.per_segment))
  for (const row of block.segments) eq(a1000.truncate(+m).encode(build.segments[row.segment]).length, row.tokens, `build ${row.segment} @${m}`);
eq(trainPre(build.full, 250).merges, a1000.merges.slice(0, 250), 'build truncation equals a fresh 250-merge run');
const ids = a1000.encode('start <|eos|> end');
assert.ok(ids.includes(259) && a1000.decode(ids) === 'start <|eos|> end', 'eos special token'); checks++;

// Level 3: held-out study. Variants A (pre, 500), B (no pre, 500), C (pre, 100).
const b1000 = trainSeq(build.full, 1000);
const variants = { A_pretoken_500: a1000.truncate(500), B_nopretoken_500: b1000.truncate(500), C_pretoken_100: a1000.truncate(100) };
eq(trainSeq(build.full, 500).merges, b1000.merges.slice(0, 500), 'B truncation equals a fresh 500-merge run');
for (const [name, tok] of Object.entries(variants)) {
  const rec = deepR.variants[name];
  for (const [seg, text] of Object.entries(heldout)) eq(segmentMetrics(tok, text), rec.per_segment[seg], `${name} ${seg}`);
  eq(segmentMetrics(tok, Object.values(heldout).join('\n')), rec.total, `${name} total`);
  eq(tok.vocabSize, rec.vocab_size, `${name} vocab`);
}
// Spot values the page headline quotes, also checked as literals.
eq(Object.values(variants).map((t) => t.encode(Object.values(heldout).join('\n')).length), [555, 552, 749], 'headline 555 / 552 / 749');

// Rigor: dense 41-step sweep, 2x2 cells, training-mix ablation.
for (const row of rigorR.sweep.rows) {
  eq(heldoutTokens(a1000.truncate(row.merges), heldout), row.A, `dense A @${row.merges}`);
  eq(heldoutTokens(b1000.truncate(row.merges), heldout), row.B, `dense B @${row.merges}`);
  eq(a1000.lengths[row.merges], row.A_train_tokens, `trainer count equals encode count @${row.merges}`);
}
const A5 = variants.A_pretoken_500, B5 = variants.B_nopretoken_500;
const cells = {
  pretrain_preencode: A5,
  pretrain_seqencode: new Tokenizer(A5.merges, { pre: false }),
  seqtrain_preencode: new Tokenizer(B5.merges, { pre: true }),
  seqtrain_seqencode: B5,
};
for (const [name, tok] of Object.entries(cells)) eq(heldoutTokens(tok, heldout), rigorR.factorial[name].heldout, `2x2 ${name}`);
for (const drop of Object.keys(build.segments)) {
  const kept = Object.entries(build.segments).filter(([k]) => k !== drop).map(([, t]) => t).join('\n');
  eq(heldoutTokens(trainPre(kept, 500), heldout), rigorR.mix_ablation.rows[`without_${drop}`], `mix without ${drop}`);
}

// Crafted boundary case from tests/test_deep_study.py: 1 token without pre-tokenization.
const craft = 'ab cd ab cd ab cd ab cd ab cd ab cd';
eq(trainSeq(craft, 30).encode(craft).length, 1, 'crafted case, no pre-tokenization');
assert.ok(trainPre(craft, 30).encode(craft).length > 5, 'crafted case, pre-tokenization'); checks++;

console.log(`bpe parity ok: ${checks} known-answer checks against results_*.json in ${Date.now() - t0} ms`);
