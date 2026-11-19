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
- Transcription sessions with 3, 5, or 10 phrases
- Live typing time and words-per-minute (WPM) calculations
- Final error-rate measurement using Levenshtein distance
- Backspace tracking
- Session results with average typing statistics
- Browser-based storage of completed typing sessions
- A typing history with individual session deletion
- CSV export of saved typing results
- A mobile-focused interface for testing on smartphones

## How the Adaptation Works

The prototype uses a rule-based scoring algorithm rather than a trained machine-learning model.

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

Both modes use the same transcription phrases for a given phrase count, making their results easier to compare.

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

Completed trials are saved in the browser using localStorage. Results normally remain available after refreshing the page or closing the tab.

Users can export all saved results to a CSV file, delete individual sessions, or clear their typing history with confirmation.

Data is not automatically uploaded to a server or synchronized between devices. Browser storage is not a permanent backup, so exporting results is recommended.

## Planned Evaluation

The project will primarily be evaluated using two HCI methods covered in class.

**GOMS (Goals, Operators, Methods, and Selection Rules)**

GOMS will be used to analyze the interaction steps involved in configuring the keyboard, completing calibration, and performing typing tasks.

**Nielsen's 10 Usability Heuristics**

The prototype will be reviewed against Nielsen's usability principles, including visibility of system status, consistency, user control, error prevention, and recognition rather than recall.

Informal self-testing and a small pilot evaluation may also be included, if feasible, to identify practical problems with keyboard reach, key size, and typing familiarity.

The application already records typing performance, but improvements in speed, accuracy, or comfort have not yet been established experimentally.

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

## Technology Stack

- HTML
- CSS
- JavaScript
- Browser localStorage
- GitHub for version control
- Vercel for deployment

## Project Structure

```text
Adaptive-QWERTY/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Running Locally

Clone the repository:

```bash
git clone https://github.com/Aaronwins/Adaptive-QWERTY.git
```

Open the project folder and launch `index.html` in a browser.

No additional dependencies or build process are required.

## Deployment

The project is deployed using Vercel. Changes pushed to the connected GitHub repository are automatically redeployed to the live website.

## Author

Aaron Amalraj

HCI Individual Research Project