# Experimental autocorrection

Three modes are available in the Typing test panel:
- Off: unmodified baseline typing.
- Spelling: SymSpell-style candidate lookup using an English frequency dictionary.
- Hybrid: spelling plus pretrained DistilBERT masked-word contextual reranking in Transformers.js.

The browser downloads the dictionary on first use. The pretrained language model is optional and loads only when Hybrid is selected. If model loading fails or is incomplete, the app falls back to spelling. No custom training occurs.

Spelling correction applies on Space and Finish phrase. Contextual corrections use preceding typed words only, never the target phrase. Model suggestions may be skipped if the user keeps typing before inference completes. Autocorrection can make wrong substitutions.

## Automatic phrase randomization

The phrase bank contains 1,000 unique entries. A new random seed is generated internally every time a session starts; the app shuffles the bank and selects the requested 3, 5, or 10 phrases without repeats within that session. Users do not enter or manage seeds. The generated seed and actual target phrases are retained in the saved trial data for auditability. Randomization can introduce phrase-difficulty differences between conditions, so compare multiple sessions and rotate condition order to reduce practice effects.

## CSV fields

Exports preserve existing columns and add autocorrectMode, autocorrections, mlCorrections, mlModelReady, and phraseSeed. Autocorrections counts substitutions, not verified successful corrections. Hybrid mode is not evidence that ML ran; check model readiness and correction counts.

The original 40 baseline trials used fixed phrases; analyze new trials separately because the phrase procedure has changed.

## Privacy and dependencies

All inference occurs in the browser, not through a hosted inference API. On first use the browser downloads a frequency list from wolfgarbe/SymSpell. Hybrid mode imports Transformers.js from jsDelivr and downloads Xenova/distilbert-base-uncased from Hugging Face. Internet access is required initially, and the model can be large.

SymSpell: https://github.com/wolfgarbe/SymSpell
Transformers.js: https://huggingface.co/docs/transformers.js
Model: https://huggingface.co/Xenova/distilbert-base-uncased

This is a SymSpell-inspired JavaScript implementation, not the official C# implementation.

## Where the code lives

- `index.html` defines the three correction modes and displays model-loading status.
- `script.js` starts sessions, shuffles the 1,000 phrase bank, applies corrections when typing, and records results.
- `autocorrect.js` fetches and indexes English word frequencies, suggests spelling corrections, and optionally loads DistilBERT to rerank candidates.
- `style.css` controls the mobile layout and keyboard appearance; it does not run any model.

## Manual verification

1. In Spelling mode, type teh followed by Space; verify it changes to the.
2. Start multiple sessions and verify that each selects fresh phrases without duplicates within a session.
3. In Hybrid mode, verify model-ready status before evaluating contextual changes.
4. Check the new CSV columns and that previous typing history still appears.
5. Retest hand calibration, mobile keyboard buttons and both Standard and Adaptive layouts.