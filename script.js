"use strict";

// This prototype uses a heuristic, not a trained ML model.
// Six comfortable/difficult reach responses and measured thumb length influence
// a predicted comfort score; candidate keyboard layouts are compared by score.

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const PHRASES = [
  "the weather is nice today",
  "please bring the blue notebook",
  "we met outside the library",
  "the small dog ran home",
  "she drinks coffee every morning",
  "remember to close the window",
  "my phone is on the table",
  "a bright light filled the room",
  "they walked along the river",
  "he found his missing keys",
  "we can finish the work later",
  "the train arrived at noon",
  "some flowers bloom in spring",
  "this is a very simple example",
  "the museum opens on sunday",
  "send me the updated document",
  "i forgot to bring my umbrella",
  "our friends are coming tomorrow",
  "the garden has many green plants",
  "every student finished the quiz"
];
// Six representative positions: left, center, right; upper and lower.
const X_POSITIONS = [0.17, 0.50, 0.83];
const Y_POSITIONS = [0.27, 0.73];
const CALIBRATION_POINTS = Y_POSITIONS.flatMap(y => X_POSITIONS.map(x => ({x, y})));
const $ = id => document.getElementById(id);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

let hand = "right";
let mode = "standard";
let thumbCm = 6.5;
let responses = [];
let calibrationIndex = 0;
let chosenLayout = null;
let session = null;
let sessionNumber = 0;
let completedTrials = [];
let typedText = "";
let startedAt = null;
let finishedAt = null;
let backspaces = 0;
let timerId = null;
let phraseRecorded = false;

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

function selectButtons(selector, dataKey, value) {
  document.querySelectorAll(selector).forEach(button => {
    const active = button.dataset[dataKey] === value;
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

function invalidateCalibration() {
  chosenLayout = null;
  responses = [];
  $("calibrationPanel").classList.add("hidden");
  updateKeyboardLayout();
}

function startCalibration() {
  if (session) return;
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
    if (index < responses.length) dot.classList.add(responses[index] ? "comfortable" : "difficult");
    else if (index === calibrationIndex) dot.classList.add("current");
    dot.style.left = `${point.x * 100}%`;
    dot.style.top = `${point.y * 100}%`;
    layer.appendChild(dot);
  });
  $("calibrationProgress").textContent = `${calibrationIndex + 1} / ${CALIBRATION_POINTS.length}`;
  $("calibrationPrompt").textContent = `Position ${calibrationIndex + 1}: comfortable or difficult with your ${hand} thumb?`;
}

function recordCalibration(comfortable) {
  if ($("calibrationPanel").classList.contains("hidden")) return;
  responses.push(comfortable);
  calibrationIndex++;
  if (calibrationIndex < CALIBRATION_POINTS.length) return renderCalibration();
  chosenLayout = chooseLayout(responses, thumbCm, hand);
  $("calibrationPanel").classList.add("hidden");
  updateKeyboardLayout();
  $("sessionStatus").textContent = "Calibration complete. Select Adaptive and start a typing session.";
}

function comfortProbability(p, answers, lengthCm) {
  // Thumb length affects the spatial smoothing radius, not a direct conversion
  // from centimeters to pixels. Coefficients are prototype heuristics.
  const sigma = clamp(0.22 + 0.018 * (lengthCm - 6.5), 0.16, 0.30);
  let comfortableWeight = 0;
  let totalWeight = 0;
  CALIBRATION_POINTS.forEach((point, i) => {
    const dx = p.x - point.x;
    const dy = p.y - point.y;
    const weight = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    comfortableWeight += weight * Number(answers[i]);
    totalWeight += weight;
  });
  return totalWeight ? comfortableWeight / totalWeight : 0;
}

function keyboardCoverage(width, left, answers, lengthCm) {
  const heights = [0.20, 0.50, 0.80];
  let total = 0;
  let count = 0;
  ROWS.forEach((letters, row) => {
    for (let index = 0; index < letters.length; index++) {
      const x = left + width * ((index + 0.5) / letters.length);
      total += comfortProbability({x, y: heights[row]}, answers, lengthCm);
      count++;
    }
  });
  return total / count;
}

function chooseLayout(answers, lengthCm, selectedHand) {
  let best = null;
  for (let percent = 78; percent <= 100; percent += 2) {
    const width = percent / 100;
    const maxLeft = 1 - width;
    for (let step = 0; step <= 4; step++) {
      const left = maxLeft * step / 4;
      const coverage = keyboardCoverage(width, left, answers, lengthCm);
      const preferredEdge = selectedHand === "right" ? maxLeft : 0;
      const score = 0.82 * coverage + 0.18 * width - 0.025 * Math.abs(left - preferredEdge);
      if (!best || score > best.score) best = {width, left, coverage, score};
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
  } else if (!chosenLayout) {
    keyboard.style.width = "100%";
    keyboard.style.marginLeft = "0";
    $("layoutSummary").textContent = "Adaptive mode requires thumb-reach calibration first.";
    $("layoutDetails").classList.add("hidden");
    $("keyboardModeLabel").textContent = "CALIBRATION NEEDED";
  } else {
    keyboard.style.width = `${(chosenLayout.width * 100).toFixed(1)}%`;
    keyboard.style.marginLeft = `${(chosenLayout.left * 100).toFixed(1)}%`;
    $("layoutSummary").textContent = `Personalized for the ${hand} hand with thumb length ${thumbCm.toFixed(1)} cm and six reach responses.`;
    $("layoutDetails").textContent = `Keyboard width: ${(chosenLayout.width * 100).toFixed(0)}% · left offset: ${(chosenLayout.left * 100).toFixed(0)}% · predicted key-center comfort: ${(chosenLayout.coverage * 100).toFixed(0)}%. This is a heuristic score, not an observed accuracy result.`;
    $("layoutDetails").classList.remove("hidden");
    $("keyboardModeLabel").textContent = "ADAPTIVE";
  }
}

function elapsedSeconds() {
  return startedAt === null ? 0 : ((finishedAt ?? performance.now()) - startedAt) / 1000;
}

function wpm(seconds, text) {
  return seconds > 0 ? (Math.max(text.length - 1, 0) / 5) / (seconds / 60) : 0;
}

function levenshteinDistance(a, b) {
  const row = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + Number(a[i - 1] !== b[j - 1]));
      diagonal = above;
    }
  }
  return row[b.length];
}

function resetPhrase() {
  window.clearInterval(timerId);
  typedText = "";
  startedAt = null;
  finishedAt = null;
  backspaces = 0;
  phraseRecorded = false;
  $("errorValue").textContent = "—";
  $("nextPhrase").classList.add("hidden");
  $("finishPhrase").disabled = false;
  $("resetPhrase").disabled = false;
  $("trialMessage").textContent = "The timer starts with your first keypress.";
  renderTrial();
}

function renderTrial() {
  $("typedText").textContent = typedText;
  const seconds = elapsedSeconds();
  $("timeValue").textContent = seconds.toFixed(1);
  $("wpmValue").textContent = wpm(seconds, typedText).toFixed(1);
  $("backspaceValue").textContent = String(backspaces);
}

function typeCharacter(character) {
  if (!session || phraseRecorded) return;
  if (startedAt === null) {
    startedAt = performance.now();
    timerId = window.setInterval(renderTrial, 150);
  }
  if (character === "backspace") {
    backspaces++;
    typedText = typedText.slice(0, -1);
  } else typedText += character === "space" ? " " : character;
  renderTrial();
}

function startSession() {
  if (session) return;
  if (mode === "adaptive" && !chosenLayout) {
    $("sessionStatus").textContent = "Complete the six reach checks before starting Adaptive mode.";
    return;
  }
  const count = Number($("phraseCount").value);
  const selectedPhrases = Array.from({length: count}, (_, i) => PHRASES[(sessionNumber * 5 + i) % PHRASES.length]);
  sessionNumber++;
  session = {mode, hand, thumbCm: getThumbLength(), calibration: [...responses], phrases: selectedPhrases, index: 0};
  completedTrials = [];
  $("trialArea").classList.remove("hidden");
  $("resultsPanel").classList.add("hidden");
  $("startSession").disabled = true;
  $("phraseCount").disabled = true;
  $("thumbLength").disabled = true;
  $("startCalibration").disabled = true;
  document.querySelectorAll(".mode-option, .hand-option").forEach(button => button.disabled = true);
  loadPhrase();
}

function loadPhrase() {
  if (!session) return;
  $("targetPhrase").textContent = session.phrases[session.index];
  $("sessionStatus").textContent = `${session.mode.toUpperCase()} session · Phrase ${session.index + 1} of ${session.phrases.length}`;
  resetPhrase();
}

function finishPhrase() {
  if (!session || phraseRecorded) return;
  if (startedAt === null) {
    $("trialMessage").textContent = "Type something before finishing this phrase.";
    return;
  }
  finishedAt = performance.now();
  window.clearInterval(timerId);
  phraseRecorded = true;
  const target = session.phrases[session.index];
  const seconds = elapsedSeconds();
  const error = 100 * levenshteinDistance(typedText.trim(), target) / target.length;
  const result = {
    mode: session.mode, hand: session.hand, thumbCm: session.thumbCm,
    calibration: session.calibration.map(Boolean).join("|"),
    phraseNumber: session.index + 1, target, typedText,
    seconds: Number(seconds.toFixed(2)),
    wpm: Number(wpm(seconds, typedText).toFixed(2)),
    errorPercent: Number(error.toFixed(2)), backspaces
  };
  completedTrials.push(result);
  $("errorValue").textContent = `${error.toFixed(1)}%`;
  $("finishPhrase").disabled = true;
  $("resetPhrase").disabled = true;
  $("trialMessage").textContent = "Phrase saved. Continue or stop the session.";
  if (session.index + 1 < session.phrases.length) $("nextPhrase").classList.remove("hidden");
  else stopSession();
  renderTrial();
}

function nextPhrase() {
  if (!session || !phraseRecorded || session.index + 1 >= session.phrases.length) return;
  session.index++;
  loadPhrase();
}

function stopSession() {
  if (!session) return;
  window.clearInterval(timerId);
  session = null;
  $("trialArea").classList.add("hidden");
  $("startSession").disabled = false;
  $("phraseCount").disabled = false;
  $("thumbLength").disabled = false;
  $("startCalibration").disabled = false;
  document.querySelectorAll(".mode-option, .hand-option").forEach(button => button.disabled = false);
  if (completedTrials.length) {
    const avg = key => completedTrials.reduce((sum, item) => sum + item[key], 0) / completedTrials.length;
    $("resultsSummary").textContent = `${completedTrials.length} completed phrase(s) · Average WPM: ${avg("wpm").toFixed(1)} · Average final error: ${avg("errorPercent").toFixed(1)}% · Average backspaces: ${avg("backspaces").toFixed(1)}. Unfinished phrases are not included.`;
    const body = $("resultsRows");
    body.replaceChildren();
    completedTrials.forEach(item => {
      const row = document.createElement("tr");
      [item.phraseNumber, item.wpm.toFixed(1), `${item.errorPercent.toFixed(1)}%`, item.backspaces].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    $("resultsPanel").classList.remove("hidden");
    $("sessionStatus").textContent = "Session ended. View results below or start another session.";
  } else {
    $("resultsPanel").classList.add("hidden");
    $("sessionStatus").textContent = "Session ended without completed phrases.";
  }
}

function exportCsv() {
  if (!completedTrials.length) return;
  const columns = ["mode", "hand", "thumbCm", "calibration", "phraseNumber", "target", "typedText", "seconds", "wpm", "errorPercent", "backspaces"];
  const escapeCell = value => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [columns.join(","), ...completedTrials.map(item => columns.map(key => escapeCell(item[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"}));
  const a = document.createElement("a");
  a.href = url;
  a.download = `adaptive-qwerty-${Date.now()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initialize() {
  createKeyboard();
  document.querySelectorAll(".hand-option").forEach(button => button.addEventListener("click", () => {
    hand = button.dataset.hand;
    selectButtons(".hand-option", "hand", hand);
    invalidateCalibration();
  }));
  document.querySelectorAll(".mode-option").forEach(button => button.addEventListener("click", () => {
    mode = button.dataset.mode;
    selectButtons(".mode-option", "mode", mode);
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
  $("startSession").addEventListener("click", startSession);
  $("resetPhrase").addEventListener("click", resetPhrase);
  $("finishPhrase").addEventListener("click", finishPhrase);
  $("nextPhrase").addEventListener("click", nextPhrase);
  $("stopSession").addEventListener("click", stopSession);
  $("exportCsv").addEventListener("click", exportCsv);
  updateKeyboardLayout();
  renderTrial();
}

initialize();
