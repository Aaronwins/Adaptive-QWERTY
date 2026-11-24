# Experimental autocorrection

Three modes are available in the Typing test panel:
- Off: unmodified baseline typing.
- Spelling: SymSpell-style candidate lookup using an English frequency dictionary.
- Hybrid: spelling plus pretrained DistilBERT masked-word contextual reranking in Transformers.js.

The browser downloads the dictionary on first use. The pretrained language model is optional and loads only when Hybrid is selected. If model loading fails or is incomplete, the app falls back to spelling. No custom training occurs.

Spelling correction applies on Space and Finish phrase. Contextual corrections use preceding typed words only, never the target phrase. Model suggestions may be skipped if the user keeps typing before inference completes. Autocorrection can make wrong substitutions.

## Reproducible phrase testing

The phrase bank has 200 unique entries. Enter the same Random phrase set number to obtain the same shuffled order for each experimental condition. Compare Standard/Adaptive and Off/Spelling/Hybrid with a consistent seed, phrase count, and hand. Rotate the testing order across different seeds to mitigate practice effects.

## CSV fields

Exports preserve existing columns and add autocorrectMode, autocorrections, mlCorrections, mlModelReady, and phraseSeed. Autocorrections counts substitutions, not verified successful corrections. Hybrid mode is not evidence that ML ran; check model readiness and correction counts.

The original 40 baseline trials used fixed phrases; analyze new trials separately because the phrase procedure has changed.

## Privacy and dependencies

All inference occurs in the browser, not through a hosted inference API. On first use the browser downloads a frequency list from wolfgarbe/SymSpell. Hybrid mode imports Transformers.js from jsDelivr and downloads Xenova/distilbert-base-uncased from Hugging Face. Internet access is required initially, and the model can be large.

SymSpell: https://github.com/wolfgarbe/SymSpell
Transformers.js: https://huggingface.co/docs/transformers.js
Model: https://huggingface.co/Xenova/distilbert-base-uncased

This is a SymSpell-inspired JavaScript implementation, not the official C# implementation.

## Manual verification

1. In Spelling mode, type teh followed by Space; verify it changes to the.
2. Change the seed and verify a different phrase order; reuse the seed and verify the same order.
3. In Hybrid mode, verify model-ready status before evaluating contextual changes.
4. Check the new CSV columns and that previous typing history still appears.
5. Retest hand calibration, mobile keyboard buttons and both Standard and Adaptive layouts.