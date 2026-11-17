"use strict";

// Adaptive QWERTY: calibration-driven heuristic, NOT a trained ML model.
// The twelve calibration points represent relative locations within a
// keyboard-sized screen region. Thumb length affects interpolation modestly;
// it does not convert centimetres into screen pixels.

const PHRASE = "the quick brown fox jumps over the lazy dog";
const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const X_POSITIONS = [0.125, 0.375, 0.625, 0.875];
const Y_POSITIONS = [0.17, 0.50, 0.83];
const CALIBRATION_POINTS = Y_POSITIONS.flatMap(y => X_POSITIONS.map(x => ({x, y})));

let hand = "right";
let mode = "standard";
let thumbCm = 6.5;
let responses = []; // true = comfortable, false = difficult
let calibrationIndex = 0;
let chosenLayout = null;
let typedText = "";
let startedAt = null;
let finishedAt = null;
let backspaces = 0;
let timerId = null;

const $ = id => document.getElementById(id);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function createKeyboard() {
  ROWS.forEach((letters, rowNumber) => {
    const row = document.querySelector(`[data-row="${rowNumber}"]`);
    for (const letter of letters) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "key";
      button.textContent = letter;
      button.setAttribute("aria-label", letter);
      button.addEventListener("click", () => typeCharacter(letter.toLowerCase()));
      row.appendChild(button);
    }
  });
}

function selectButtons(selector, datasetKey, value) {
  document.querySelectorAll(selector).forEach(button => {
    const active = button.dataset[datasetKey] === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function getThumbLength() {
  const value = Number($("thumbLength").value);
  if (!Number.isFinite(value) || value < 3 || value > 11) {
    $("thumbLength").value = "6.5";
    return 6.5;
  }
  return value;
}

function startCalibration() {
  thumbCm = getThumbLength();
  responses = [];
  calibrationIndex = 0;
  chosenLayout = null;
  $("calibrationPanel").classList.remove("hidden");
  renderCalibration();
  $("calibrationPanel").scrollIntoView({behavior: "smooth", block: "start"});
}

function renderCalibration() {
  const layer = $("calibrationTargets");
  layer.replaceChildren();

  CALIBRATION_POINTS.forEach((point, index) => {
    const dot = document.createElement("span");
    dot.className = "reach-target";
    if (index < responses.length) {
      dot.classList.add(responses[index] ? "comfortable" : "difficult");
    } else if (index === calibrationIndex) {
      dot.classList.add("current");
    }
    dot.style.left = `${point.x * 100}%`;
    dot.style.top = `${point.y * 100}%`;
    layer.appendChild(dot);
  });

  $("calibrationProgress").textContent = `${calibrationIndex + 1} / ${CALIBRATION_POINTS.length}`;
  $("calibrationPrompt").textContent = `Position ${calibrationIndex + 1}: could your ${hand} thumb reach the blue target comfortably?`;
}

function recordCalibration(comfortable) {
  if ($("calibrationPanel").classList.contains("hidden")) return;
  responses.push(comfortable);
  calibrationIndex++;
  if (calibrationIndex < CALIBRATION_POINTS.length) {
    renderCalibration();
    return;
  }

  // Use the 12 explicit comfortable/difficult responses as the main signal.
  chosenLayout = chooseLayout(responses, thumbCm, hand);
  $("calibrationPanel").classList.add("hidden");
  $("trialMessage").textContent = "Calibration complete. Switch to Adaptive to try the personalized layout.";
  updateKeyboardLayout();
}

// Gaussian-weighted interpolation between measured target locations.
// p is a relative position within a keyboard-sized area (0..1).
function comfortProbability(p, answers, lengthCm) {
  // Heuristic bandwidth: thumb length has a deliberately small effect.
  const sigma = clamp(0.21 + 0.012 * (lengthCm - 6.5), 0.17, 0.26);
  let weightedComfort = 0;
  let totalWeight = 0;

  CALIBRATION_POINTS.forEach((point, index) => {
    const dx = p.x - point.x;
    const dy = p.y - point.y;
    const weight = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    weightedComfort += weight * Number(answers[index]);
    totalWeight += weight;
  });
  return totalWeight ? weightedComfort / totalWeight : 0;
}

// Evaluate each prospective letter key center in a candidate QWERTY layout.
function keyboardCoverage(width, left, answers, lengthCm) {
  const rowPositions = [0.17, 0.50, 0.83];
  let total = 0;
  let keyCount = 0;
  ROWS.forEach((letters, row) => {
    for (let index = 0; index < letters.length; index++) {
      const x = left + width * ((index + 0.5) / letters.length);
      total += comfortProbability({x, y: rowPositions[row]}, answers, lengthCm);
      keyCount++;
    }
  });
  return total / keyCount;
}

function chooseLayout(answers, lengthCm, selectedHand) {
  let best = null;
  for (let percent = 76; percent <= 100; percent += 2) {
    const width = percent / 100;
    const maxLeft = 1 - width;
    // Consider edge-aligned and intermediate positions.
    for (let step = 0; step <= 4; step++) {
      const left = maxLeft * (step / 4);
      const coverage = keyboardCoverage(width, left, answers, lengthCm);
      // Trade off predicted comfortable reach with larger, easier-to-hit keys.
      const sizeScore = width;
      const preferredEdge = selectedHand === "right" ? maxLeft : 0;
      const edgePenalty = Math.abs(left - preferredEdge);
      const score = 0.82 * coverage + 0.18 * sizeScore - 0.025 * edgePenalty;
      if (!best || score > best.score) {
        best = {width, left, coverage, score};
      }
    }
  }
  return best;
}

function updateKeyboardLayout() {
  const keyboard = $("keyboard");
  if (mode === "standard") {
    keyboard.style.width = "100%";
    keyboard.style.marginLeft = "0";
    $("layoutSummary").textContent = "Standard layout — full width.";
    $("layoutDetails").classList.add("hidden");
    $("keyboardModeLabel").textContent = "STANDARD";
    return;
  }

  if (!chosenLayout) {
    // No fake personalization before calibration.
    keyboard.style.width = "100%";
    keyboard.style.marginLeft = "0";
    $("layoutSummary").textContent = "Adaptive mode needs calibration first. Tap 'Calibrate thumb reach'.";
    $("layoutDetails").classList.add("hidden");
    $("keyboardModeLabel").textContent = "CALIBRATION NEEDED";
    return;
  }

  keyboard.style.width = `${(chosenLayout.width * 100).toFixed(1)}%`;
  // left is a proportion of the full container. Convert to free-space fraction.
  const freeSpace = 1 - chosenLayout.width;
  keyboard.style.marginLeft = freeSpace > 0 ? `${(chosenLayout.left / freeSpace * 100).toFixed(1)}%` : "0";
  // CSS margin % is relative to the parent width, not the remaining space:
  keyboard.style.marginLeft = `${(chosenLayout.left * 100).toFixed(1)}%`;
  $("layoutSummary").textContent = `Personalized for your ${hand} hand using 12 reach measurements.`;
  $("layoutDetails").textContent = `Width: ${(chosenLayout.width * 100).toFixed(0)}% of screen · Left offset: ${(chosenLayout.left * 100).toFixed(0)}% · Estimated comfortable key-center score: ${(chosenLayout.coverage * 100).toFixed(0)}%. This score is a heuristic prediction, not an observed typing accuracy result.`;
  $("layoutDetails").classList.remove("hidden");
  $("keyboardModeLabel").textContent = "ADAPTIVE";
}

function elapsedSeconds() {
  if (startedAt === null) return 0;
  return ((finishedAt ?? performance.now()) - startedAt) / 1000;
}

function typeCharacter(character) {
  if (finishedAt !== null) return;
  if (startedAt === null) {
    startedAt = performance.now();
    timerId = window.setInterval(renderTrial, 150);
  }
  if (character === "backspace") {
    backspaces++;
    typedText = typedText.slice(0, -1);
  } else if (character === "space") {
    typedText += " ";
  } else {
    typedText += character;
  }
  renderTrial();
}

function levenshteinDistance(a, b) {
  const row = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previousDiagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previousAbove = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previousDiagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      previousDiagonal = previousAbove;
    }
  }
  return row[b.length];
}

function renderTrial() {
  $("typedText").textContent = typedText;
  const seconds = elapsedSeconds();
  $("timeValue").textContent = seconds.toFixed(1);
  // Standard five-characters-per-word approximation, counting spaces.
  const wpm = seconds > 0 ? (Math.max(typedText.length - 1, 0) / 5) / (seconds / 60) : 0;
  $("wpmValue").textContent = wpm.toFixed(1);
  $("backspaceValue").textContent = String(backspaces);
}

function finishTrial() {
  if (startedAt === null) {
    $("trialMessage").textContent = "Type a phrase before finishing the trial.";
    return;
  }
  if (finishedAt !== null) return;
  finishedAt = performance.now();
  window.clearInterval(timerId);
  const distance = levenshteinDistance(typedText.trim(), PHRASE);
  const errorPercent = (distance / PHRASE.length) * 100;
  $("errorValue").textContent = errorPercent.toFixed(1) + "%";
  $("trialMessage").textContent = "Trial finished. Final error is the edit distance from the target phrase divided by its length. Reset to start another trial.";
  renderTrial();
}

function resetTrial() {
  window.clearInterval(timerId);
  typedText = "";
  startedAt = null;
  finishedAt = null;
  backspaces = 0;
  $("errorValue").textContent = "—";
  $("trialMessage").textContent = "The timer starts on your first key press.";
  renderTrial();
}

function invalidateCalibration() {
  chosenLayout = null;
  responses = [];
  $("calibrationPanel").classList.add("hidden");
  updateKeyboardLayout();
}

function initialize() {
  createKeyboard();

  document.querySelectorAll(".hand-option").forEach(button => button.addEventListener("click", () => {
    if (hand === button.dataset.hand) return;
    hand = button.dataset.hand;
    selectButtons(".hand-option", "hand", hand);
    resetTrial();
    invalidateCalibration();
  }));

  document.querySelectorAll(".mode-option").forEach(button => button.addEventListener("click", () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    selectButtons(".mode-option", "mode", mode);
    resetTrial();
    updateKeyboardLayout();
  }));

  $("thumbLength").addEventListener("change", () => {
    const value = getThumbLength();
    if (value !== thumbCm) {
      thumbCm = value;
      invalidateCalibration();
    }
  });
  $("startCalibration").addEventListener("click", startCalibration);
  $("markComfortable").addEventListener("click", () => recordCalibration(true));
  $("markDifficult").addEventListener("click", () => recordCalibration(false));
  $("cancelCalibration").addEventListener("click", () => $("calibrationPanel").classList.add("hidden"));
  document.querySelector('[data-key="space"]').addEventListener("click", () => typeCharacter("space"));
  document.querySelector('[data-key="backspace"]').addEventListener("click", () => typeCharacter("backspace"));
  $("clearButton").addEventListener("click", resetTrial);
  $("finishButton").addEventListener("click", finishTrial);
  updateKeyboardLayout();
  renderTrial();
}

initialize();