# Adaptive QWERTY

Adaptive QWERTY is an HCI research prototype that explores whether a personalized QWERTY keyboard can improve one-handed mobile typing by adapting the keyboard's size and position based on thumb measurements and individual reach comfort.

## Live Demo

https://adaptiveqwerty.vercel.app/

## Project Goal

Standard smartphone QWERTY keyboards generally use the same key arrangement regardless of differences in hand size, thumb reach, and handedness. While shrinking a keyboard may make distant keys easier to reach, it can also make individual keys harder to press accurately.

This project investigates the tradeoff between thumb reach and key size when personalizing a familiar QWERTY layout for one-handed typing.

## Research Question

Can personalized QWERTY layouts that incorporate thumb length, thumb width, and individual reach calibration improve one-handed typing comfort and accuracy compared with a standard QWERTY layout?

## Current Prototype

The current prototype includes:

- A custom on-screen QWERTY keyboard with space and backspace controls
- Left-hand and right-hand selection
- Thumb length measurement in centimeters
- Thumb-pad width measurement in millimeters
- Six-point thumb-reach calibration using comfortable/difficult responses
- Adaptive keyboard sizing and horizontal positioning
- Standard and Adaptive QWERTY modes
- Transcription sessions with 3, 5, or 10 phrases selected from 200 unique sentences
- Automatic fresh random phrase selection for each session, without a seed input
- Optional autocorrection: Off, Spelling dictionary, or Hybrid contextual ML
- SymSpell-style correction backed by a large English word-frequency dictionary
- Pretrained DistilBERT via Transformers.js for optional context-aware candidate reranking (no model training required)
- Autocorrection and ML activity recorded in CSV exports
- Live typing time and words-per-minute (WPM) calculations
- Final error-rate measurement using Levenshtein distance
- Backspace tracking
- Session results with average typing statistics
- Browser-based storage of completed typing sessions
- A typing history with individual session deletion
- CSV export of saved typing results
- A mobile-focused interface for testing on smartphones

## How the Adaptation Works

The **keyboard adaptation** uses a rule-based scoring algorithm rather than a trained machine-learning model. The optional **autocorrection** feature is separate and can use a pretrained language model; it does not change the reach-calibration algorithm.

**1. Hand measurements**

The user selects their typing hand and enters their thumb length and thumb-pad width.

Thumb length influences how reach-comfort responses are interpolated across the keyboard. Thumb width helps limit excessive keyboard shrinking.

**2. Reach calibration**

The user evaluates six positions across a calibration area and marks each as comfortable or difficult to reach without changing their grip.

These responses are used to estimate comfortable reach at different keyboard positions.

**3. Keyboard layout scoring**

The algorithm evaluates candidate keyboard widths and horizontal positions.

It considers three factors:

- Estimated comfort when reaching the centers of the keys
- Keyboard width, with a preference for preserving larger keys
- Horizontal alignment with the selected typing hand

The algorithm chooses the candidate with the highest score.

**4. Thumb-width constraint**

A wider thumb pad increases the minimum allowed keyboard width. This prevents the algorithm from selecting some narrower keyboard layouts that might make keys difficult to press.

This constraint is a design heuristic. It has not been experimentally validated as an ideal relationship between thumb width and key size.

The keyboard keeps the standard QWERTY letter arrangement. The adaptation changes its overall width and horizontal position rather than rearranging individual letters.

## Typing Tests and Data Collection

Users can complete typing sessions using either the Standard or Adaptive keyboard.

The app automatically shuffles a bank of **200 unique sentences** at the beginning of every session, selecting 3, 5, or 10 phrases without repetition within the session. Users do not need to enter a random seed. The app records an automatically generated seed internally for reproducibility and saves the exact target phrases with each trial.

The application records:

- Session date and time
- Keyboard mode and typing hand
- Thumb length and thumb width
- Calibration responses
- Keyboard width and horizontal position
- Target and typed phrases
- Completion time
- Words per minute
- Final error percentage
- Number of backspaces
- Autocorrection setting (Off / Spelling / Hybrid)
- Number of automatic word substitutions
- Number of contextual-ML substitutions and model readiness
- Automatically generated phrase-set seed (for research records)

Completed trials are saved in the browser using localStorage. Results normally remain available after refreshing the page or closing the tab.

Users can export all saved results to a CSV file, delete individual sessions, or clear their typing history with confirmation.

Data is not automatically uploaded to a server or synchronized between devices. Browser storage is not a permanent backup, so exporting results is recommended.

## Autocorrection (Experimental)

The typing test now supports **three modes**, independently of Standard versus Adaptive QWERTY:

| Mode | Behavior |
| --- | --- |
| **Off (baseline)** | Preserves the original input behavior, with no automatic substitutions. |
| **Spelling dictionary** | Uses a SymSpell-style symmetric-delete candidate index and a large English word-frequency list to correct likely misspellings when Space is pressed or a phrase is finished. |
| **Hybrid (spelling + contextual ML)** | Adds a pretrained **DistilBERT** masked-language model, loaded with **Transformers.js**, to consider preceding typed words when reranking spelling candidates. |

The spelling approach is inspired by SymSpell; it is **not** an import of the original C# library. The contextual model is **pretrained** and runs inference locally in the browser—**no training or fine-tuning is performed**. This does **not** mean that the keyboard adaptation algorithm itself uses machine learning.

The English frequency dictionary is downloaded when spelling correction is first used. In Hybrid mode, the browser also downloads the pretrained model on demand, which may consume significant bandwidth and memory. **Spelling correction remains available while the ML model loads or if it fails to initialize.** A status message indicates model readiness.

Corrections are deliberately conservative. The system does not guarantee that every typo will be corrected, does not provide unrestricted grammar correction, and may occasionally replace a word incorrectly. ML reranking considers **previously typed text**, not the target phrase. Contextual predictions can be skipped if the user continues typing before inference completes.

The CSV includes `autocorrectMode`, `autocorrections`, `mlCorrections`, `mlModelReady`, and `phraseSeed`. The substitution counts indicate **actions**, not independently verified successful corrections. A Hybrid setting does not imply that the model actually ran during every phrase; inspect the readiness and ML-count fields.

For comparisons, keep the typing hand and phrase count consistent and rotate the order of Standard/Adaptive and Off/Spelling/Hybrid conditions. Since each session receives fresh phrases, phrase difficulty can differ between conditions; use multiple sessions and compare results across them. The automatically generated seed and target phrases remain in the CSV to support auditing. **The earlier 40 baseline trials used fixed phrases and should be analyzed separately from new randomized trials.**

More details and manual checks: [AUTOCORRECT.md](AUTOCORRECT.md).

## Evaluation

The project uses three complementary HCI evaluation methods:

- **GOMS (Goals, Operators, Methods, and Selection Rules)** to compare interaction steps and setup effort.
- **Nielsen's 10 Usability Heuristics** to inspect feedback, consistency, error prevention, user control, and other interface properties.
- **Exploratory typing tests** to compare words per minute, final error rate, and backspace usage.

An initial single-participant evaluation collected **40 completed phrase trials** across Standard and Adaptive layouts with dominant and non-dominant hands. Standard averaged **16.92 WPM** compared with **14.89 WPM** for Adaptive. Adaptive had fewer backspaces per phrase (**2.20** versus **3.10**); both recorded **0% final error after corrections**. These descriptive results do not establish general superiority or measured comfort benefits.

The additional autocorrection conditions and the 200-phrase randomized bank make new comparisons possible; they are **features for further evaluation, not evidence that ML improves typing**.

## Related Work

Zhang and Deng (2022) investigated one-handed keyboard layouts using thumb-reach tracing and adaptable QWERTY designs.

This project explores a different calibration method using measured thumb length, thumb width, and six subjective reach-comfort responses.

The goal is not to introduce an entirely new keyboard arrangement, but to investigate an alternative way to personalize the size and position of a familiar QWERTY keyboard.

Reference: Zhang and Deng (2022), *A Comparative Study on Single-handed Keyboards on Large-screen Mobile Devices*.

https://graphics.cs.uh.edu/wp-content/papers/2022/2022-AVI-keyboardComparisonStudy.pdf

## Limitations

- The adaptation formula is heuristic and has not been validated against a biomechanical model.
- Thumb measurements alone do not determine actual reach or typing accuracy.
- The six calibration positions provide only an approximate comfort estimate.
- The algorithm does not guarantee that Adaptive QWERTY will outperform Standard QWERTY.
- The custom keyboard is a browser-based prototype, not a replacement for a phone's system keyboard.
- Familiarity with standard QWERTY may affect typing performance.
- Browser storage can be cleared or removed, so CSV export is important for preserving research results.
- Autocorrection may introduce incorrect substitutions; the ML model may be unavailable or slow on some mobile browsers.
- The contextual model is not a full sentence-level grammar correction system.
- Randomization prevents repeated phrases within a session, but phrase difficulty and practice effects can still influence performance.

## Technology Stack

- HTML
- CSS
- JavaScript
- SymSpell-style spelling-correction index and English frequency dictionary
- Transformers.js and pretrained DistilBERT for optional contextual reranking
- Browser localStorage
- GitHub for version control
- Vercel for deployment

## Project Structure

```text
Adaptive-QWERTY/
├── index.html
├── style.css
├── script.js
├── autocorrect.js
├── AUTOCORRECT.md
└── README.md
```

## Running Locally

Clone the repository:

```bash
git clone https://github.com/Aaronwins/Adaptive-QWERTY.git
```

Open the project folder and launch `index.html` in a browser.

No build process is required. However, the first spelling-enabled run needs network access to download the English frequency dictionary, and Hybrid mode additionally downloads Transformers.js and a pretrained DistilBERT model. For reliable local testing, use a local HTTP server instead of opening the file directly (for example, run `python -m http.server 8000` in the project directory and visit `http://localhost:8000`).

## Deployment

The project is deployed using Vercel. Changes pushed to the connected GitHub repository are automatically redeployed to the live website.

## Author

Aaron Amalraj

HCI Individual Research Project