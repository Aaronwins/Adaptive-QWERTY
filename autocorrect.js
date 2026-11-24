"use strict";
// Symmetric-delete spelling candidates + optional pretrained contextual reranking.
// The full-word frequency list is fetched on demand. No typed text is uploaded
// by this application's code; the Transformers.js model runs locally after download.
// Expose a small API to script.js without introducing a JS build system.
window.HybridAutocorrect = (() => {
  const DICTIONARY_URL = "https://raw.githubusercontent.com/wolfgarbe/SymSpell/master/SymSpell/frequency_dictionary_en_82_765.txt";
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
  const MODEL_NAME = "Xenova/distilbert-base-uncased";
  // counts[word] is corpus frequency; deletionIndex[shortenedForm] lists
  // plausible original words. Both are populated after the dictionary fetch.
  const counts = new Map();
  const deletionIndex = new Map();
  let dictionaryTask = null;
  let mlTask = null;
  let mlPipeline = null;
  let ready = false;

  // Precompute one/two-letter deletion variants for quick candidate lookup.
  // Example: "receive" -> "eceive", "recive", etc.
  function addDeletes(word, maxDepth) {
    let frontier = new Set([word]);
    const seen = new Set([word]);
    for (let depth = 1; depth <= maxDepth; depth++) {
      const next = new Set();
      for (const item of frontier) {
        for (let i = 0; i < item.length; i++) {
          const deleted = item.slice(0, i) + item.slice(i + 1);
          if (seen.has(deleted)) continue;
          seen.add(deleted);
          next.add(deleted);
          let candidates = deletionIndex.get(deleted);
          if (!candidates) {
            candidates = [];
            deletionIndex.set(deleted, candidates);
          }
          // Retain most frequent suggestions when a key is crowded.
          if (candidates.length < 50) candidates.push(word);
        }
      }
      frontier = next;
    }
  }

  // Cache the Promise so repeated starts do not download/index twice.
  // If fetching fails, clear the Promise to allow a later retry.
  async function loadDictionary() {
    if (ready) return true;
    if (!dictionaryTask) {
      dictionaryTask = (async () => {
        const response = await fetch(DICTIONARY_URL, { cache: "force-cache" });
        if (!response.ok) throw new Error("Dictionary HTTP " + response.status);
        const body = await response.text();
        const parsed = [];
        for (const line of body.split(/\r?\n/)) {
          const [word, rawCount] = line.trim().split(/\s+/);
          const frequency = Number(rawCount);
          if (!/^[a-z]+$/.test(word || "") || !Number.isFinite(frequency)) continue;
          counts.set(word, frequency);
          parsed.push(word);
        }
        // A bounded symmetric-delete index keeps memory usage reasonable on phones.
        // All dictionary terms are still recognized as valid words.
        for (let i = 0; i < parsed.length; i++) {
          const word = parsed[i];
          if (word.length < 3 || word.length > 16) continue;
          if (i < 18000) addDeletes(word, 2);
          else if (i < 55000) addDeletes(word, 1);
        }
        ready = true;
        return true;
      })().catch(error => {
        dictionaryTask = null;
        throw error;
      });
    }
    return dictionaryTask;
  }

  // Edit distance counts insertions, deletions, replacements and neighbor swaps.
  // We only need to distinguish up to two edits; beyond that return >2.
  function distance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    const rows = Array.from({length: a.length + 1},
      () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) rows[i][0] = i;
    for (let j = 0; j <= b.length; j++) rows[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        rows[i][j] = Math.min(
          rows[i - 1][j] + 1,
          rows[i][j - 1] + 1,
          rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        if (i > 1 && j > 1 &&
            a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
        }
      }
    }
    return rows[a.length][b.length];
  }

  // Generate plausible dictionary words, then rank by edit distance and
  // word frequency. Known words remain unchanged unless ML asks for variants.
  function suggestions(word, allowRealWord = false) {
    if (!ready) return [{word, distance: 0, frequency: 0}];
    const input = word.toLowerCase();
    if (input.length < 2 || input.length > 22) return [];
    if (counts.has(input) && !allowRealWord) {
      return [{word: input, distance: 0, frequency: counts.get(input)}];
    }
    const found = new Set([input]);
    let frontier = new Set([input]);
    for (let d = 0; d <= 2; d++) {
      const next = new Set();
      for (const key of frontier) {
        for (const candidate of deletionIndex.get(key) || []) found.add(candidate);
        if (d < 2) {
          for (let i = 0; i < key.length; i++) {
            next.add(key.slice(0, i) + key.slice(i + 1));
          }
        }
      }
      frontier = next;
    }
    return [...found]
      .filter(candidate => counts.has(candidate))
      .map(candidate => ({
        word: candidate,
        distance: distance(input, candidate),
        frequency: counts.get(candidate)
      }))
      .filter(candidate => candidate.distance <= 2)
      .sort((a, b) =>
        a.distance - b.distance ||
        b.frequency - a.frequency
      ).slice(0, 12);
  }

  // Conservative deterministic correction; ambiguous real words stay as typed.
  function spell(word) {
    const clean = word.toLowerCase();
    if (!ready || counts.has(clean)) return word;
    const list = suggestions(clean);
    if (!list.length) return word;
    const best = list[0];
    if (best.distance > (clean.length <= 4 ? 1 : 2)) return word;
    // Don't replace uncommon terms with weakly related common words.
    if (best.distance === 2 && best.frequency < 10000) return word;
    return best.word;
  }

  // Import Transformers.js dynamically only on Hybrid mode; the fill-mask
  // pipeline downloads a quantized pretrained model and runs in-browser.
  async function loadML() {
    if (mlPipeline) return mlPipeline;
    if (!mlTask) {
      mlTask = (async () => {
        const { pipeline } = await import(MODEL_URL);
        mlPipeline = await pipeline("fill-mask", MODEL_NAME, {
          dtype: "q8", device: "wasm"
        });
        return mlPipeline;
      })().catch(error => {
        mlTask = null;
        throw error;
      });
    }
    return mlTask;
  }

  // Uses preceding typed words only, never the displayed target phrase.
  // This is a conservative suggestion mechanism, not a full grammar corrector.
  // Mask the next word after the already typed prefix, look at the model's
  // top predicted tokens, and intersect them with spelling candidates.
  // The target phrase is NEVER supplied to the model (avoids leakage).
  async function contextual(word, precedingText) {
    if (!mlPipeline) return null;
    const original = word.toLowerCase();
    const candidates = suggestions(original, true);
    if (!candidates.length) return null;
    const prefix = precedingText.trim().split(/\s+/).slice(-15).join(" ");
    if (prefix.length < 5) return null;
    const output = await mlPipeline(prefix + " [MASK]", { top_k: 100 });
    const predictions = Array.isArray(output) ? output : [output];
    const probabilities = new Map(predictions.map(result => [
      String(result.token_str || "").trim().toLowerCase(),
      Number(result.score || 0)
    ]));
    const originalScore = probabilities.get(original) || 0.00001;
    const ranked = candidates
      .filter(x => x.word !== original && x.distance <= 2)
      .map(x => ({
        ...x,
        probability: probabilities.get(x.word) || 0
      }))
      .sort((a,b) => b.probability - a.probability);
    const best = ranked[0];
    if (!best) return null;
    // Real English words need stronger evidence before overriding.
    const validWord = counts.has(original);
    // Replacing a correctly spelled English word needs stronger evidence.
    const floor = validWord ? 0.12 : 0.04;
    const multiplier = validWord ? 8 : 3;
    if (best.probability < floor ||
        best.probability < originalScore * multiplier) return null;
    return best.word;
  }

  return {
    loadDictionary,
    loadML,
    spell,
    contextual,
    suggestions,
    isDictionaryReady: () => ready,
    isMLReady: () => Boolean(mlPipeline)
  };
})();
