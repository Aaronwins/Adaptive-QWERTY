"use strict";

// Adaptive QWERTY uses a heuristic algorithm, not a trained ML model.
// Reach responses and thumb length estimate reach comfort.
// Thumb-pad width limits keyboard shrinking to help preserve key size.
// These are experimental design rules, not validated ergonomic thresholds.

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
  "every student finished the quiz",
  "the package arrived earlier than expected",
  "we watched a movie last night",
  "the morning traffic was unusually light",
  "please check the meeting schedule",
  "the children played in the park",
  "a gentle breeze moved the curtains",
  "my laptop needs a new charger",
  "the bakery sells fresh bread",
  "we should leave before sunset",
  "the teacher explained the problem",
  "this book has an interesting ending",
  "he placed the keys near the door",
  "the doctor called this afternoon",
  "a red bicycle passed the shop",
  "she prepared dinner for everyone",
  "the printer ran out of paper",
  "our flight departs early tomorrow",
  "the concert starts at seven",
  "i sent a message to my brother",
  "the blue jacket fits perfectly",
  "they discovered a quiet restaurant",
  "the bus stopped near the station",
  "please remember your appointment",
  "the little cat climbed the stairs",
  "the computer finished the update",
  "i found a comfortable chair",
  "the flowers smell wonderful today",
  "we crossed the street carefully",
  "the classroom was very quiet",
  "she ordered a glass of water",
  "the neighbor repaired the fence",
  "the grocery store closes tonight",
  "this recipe uses fresh tomatoes",
  "please leave your shoes outside",
  "my friend bought a new camera",
  "we visited the city museum",
  "he carried the heavy suitcase",
  "the sunset painted the clouds",
  "the restaurant served warm soup",
  "the student answered the question",
  "a short walk helped me relax",
  "the musician practiced every day",
  "the train crossed the bridge",
  "remember to charge your phone",
  "the office opens at nine",
  "i read the article yesterday",
  "the puppy slept beside the sofa",
  "we took pictures near the lake",
  "the instructions were easy to follow",
  "the window overlooks the garden"
];

const X_POSITIONS = [0.17, 0.50, 0.83];
const Y_POSITIONS = [0.27, 0.73];
const CALIBRATION_POINTS = Y_POSITIONS.flatMap(y =>
  X_POSITIONS.map(x => ({ x, y }))
);

const $ = id => document.getElementById(id);
const clamp = (value, low, high) =>
  Math.min(high, Math.max(low, value));

const STORAGE_KEY = "adaptiveQwertyHistoryV1";

let hand = "right";
let mode = "standard";
let thumbCm = 6.5;
let thumbWidthMm = 18;

let responses = [];
let calibrationIndex = 0;
let chosenLayout = null;

let session = null;
let completedTrials = [];
let savedSessions = [];
let storageAvailable = true;

let typedText = "";
let startedAt = null;
let finishedAt = null;
let backspaces = 0;
let autocorrections = 0;
let mlCorrections = 0;
let preparingSession = false;
let timerId = null;
let phraseRecorded = false;

// ------------------------------
// Keyboard setup
// ------------------------------

function createKeyboard() {
  ROWS.forEach((letters, rowNumber) => {
    const row = document.querySelector(`[data-row="${rowNumber}"]`);

    for (const letter of letters) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "key";
      button.textContent = letter;
      button.setAttribute("aria-label", letter);
      button.addEventListener("click", () =>
        typeCharacter(letter.toLowerCase())
      );
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

// ------------------------------
// Thumb measurements
// ------------------------------

function getThumbLength() {
  const value = Number($("thumbLength").value);

  if (!Number.isFinite(value) || value < 3 || value > 11) {
    $("thumbLength").value = "6.5";
    return 6.5;
  }

  return value;
}

function getThumbWidth() {
  const value = Number($("thumbWidth").value);

  if (!Number.isFinite(value) || value < 10 || value > 30) {
    $("thumbWidth").value = "18";
    return 18;
  }

  return value;
}

function updateWidthPreference() {
  if (session) return;

  thumbWidthMm = getThumbWidth();

  // Changing width does not erase the six reach responses.
  if (responses.length === CALIBRATION_POINTS.length) {
    chosenLayout = chooseLayout(
      responses,
      thumbCm,
      thumbWidthMm,
      hand
    );
  }

  updateKeyboardLayout();
}

function invalidateCalibration() {
  chosenLayout = null;
  responses = [];
  $("calibrationPanel").classList.add("hidden");
  updateKeyboardLayout();
}

// ------------------------------
// Six-point calibration
// ------------------------------

function startCalibration() {
  if (session) return;

  thumbCm = getThumbLength();
  thumbWidthMm = getThumbWidth();
  responses = [];
  calibrationIndex = 0;
  chosenLayout = null;

  $("calibrationPanel").classList.remove("hidden");
  renderCalibration();

  $("calibrationPanel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderCalibration() {
  const layer = $("calibrationTargets");
  layer.replaceChildren();

  CALIBRATION_POINTS.forEach((point, index) => {
    const dot = document.createElement("span");
    dot.className = "reach-target";

    if (index < responses.length) {
      dot.classList.add(
        responses[index] ? "comfortable" : "difficult"
      );
    } else if (index === calibrationIndex) {
      dot.classList.add("current");
    }

    dot.style.left = `${point.x * 100}%`;
    dot.style.top = `${point.y * 100}%`;

    layer.appendChild(dot);
  });

  $("calibrationProgress").textContent =
    `${calibrationIndex + 1} / ${CALIBRATION_POINTS.length}`;

  $("calibrationPrompt").textContent =
    `Position ${calibrationIndex + 1}: comfortable or difficult with your ${hand} thumb?`;
}

function recordCalibration(comfortable) {
  if ($("calibrationPanel").classList.contains("hidden")) return;

  responses.push(comfortable);
  calibrationIndex++;

  if (calibrationIndex < CALIBRATION_POINTS.length) {
    renderCalibration();
    return;
  }

  chosenLayout = chooseLayout(
    responses,
    thumbCm,
    thumbWidthMm,
    hand
  );

  $("calibrationPanel").classList.add("hidden");
  updateKeyboardLayout();

  $("sessionStatus").textContent =
    "Calibration complete. Select Adaptive and start a typing session.";
}

// ------------------------------
// Adaptation algorithm
// ------------------------------

function comfortProbability(p, answers, lengthCm) {
  // Thumb length adjusts how calibration responses are
  // interpolated across the keyboard area.
  const sigma = clamp(
    0.22 + 0.018 * (lengthCm - 6.5),
    0.16,
    0.30
  );

  let comfortableWeight = 0;
  let totalWeight = 0;

  CALIBRATION_POINTS.forEach((point, i) => {
    const dx = p.x - point.x;
    const dy = p.y - point.y;

    const weight = Math.exp(
      -(dx * dx + dy * dy) / (2 * sigma * sigma)
    );

    comfortableWeight += weight * Number(answers[i]);
    totalWeight += weight;
  });

  return totalWeight
    ? comfortableWeight / totalWeight
    : 0;
}

function keyboardCoverage(width, left, answers, lengthCm) {
  const heights = [0.20, 0.50, 0.80];

  let total = 0;
  let count = 0;

  ROWS.forEach((letters, row) => {
    for (let index = 0; index < letters.length; index++) {
      const x = left + width *
        ((index + 0.5) / letters.length);

      total += comfortProbability(
        { x, y: heights[row] },
        answers,
        lengthCm
      );

      count++;
    }
  });

  return total / count;
}

function chooseLayout(answers, lengthCm, widthMm, selectedHand) {
  // Wider thumb pads restrict how far the keyboard can shrink.
  // This is an approximate design constraint, not a direct
  // conversion between thumb width and physical key size.
  // Larger thumb pads limit how narrow the keyboard can become.
  // The limits are heuristic and have not been experimentally validated.
  const minWidth = clamp(
    0.80 + 0.012 * (widthMm - 16),
    0.78,
    0.97
  );

  let best = null;

  for (let percent = 78; percent <= 100; percent += 2) {
    const width = percent / 100;

    if (width + 1e-9 < minWidth) continue;

    const maxLeft = 1 - width;

    for (let step = 0; step <= 4; step++) {
      const left = maxLeft * step / 4;

      const coverage = keyboardCoverage(
        width,
        left,
        answers,
        lengthCm
      );

      const preferredEdge =
        selectedHand === "right" ? maxLeft : 0;
      // Compare possible keyboard widths and horizontal positions.
      // Give the most weight to estimated reach comfort.
      // Reward wider keyboards to help preserve key size.
      // Slightly favor positioning near the selected hand.
      const score =
        0.82 * coverage +
        0.18 * width -
        0.025 * Math.abs(left - preferredEdge);

      if (!best || score > best.score) {
        best = {
          width,
          left,
          coverage,
          score,
          minWidth
        };
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

    $("layoutSummary").textContent =
      "Standard layout — full width.";

    $("layoutDetails").classList.add("hidden");
    $("keyboardModeLabel").textContent = "STANDARD";

  } else if (!chosenLayout) {
    keyboard.style.width = "100%";
    keyboard.style.marginLeft = "0";

    $("layoutSummary").textContent =
      "Adaptive mode requires thumb-reach calibration first.";

    $("layoutDetails").classList.add("hidden");
    $("keyboardModeLabel").textContent = "CALIBRATION NEEDED";

  } else {
    keyboard.style.width =
      `${(chosenLayout.width * 100).toFixed(1)}%`;

    keyboard.style.marginLeft =
      `${(chosenLayout.left * 100).toFixed(1)}%`;

    $("layoutSummary").textContent =
      `Personalized for the ${hand} hand with thumb length ${thumbCm.toFixed(1)} cm, thumb-pad width ${thumbWidthMm.toFixed(1)} mm, and six reach responses.`;

    $("layoutDetails").textContent =
      `Keyboard width: ${(chosenLayout.width * 100).toFixed(0)}% · ` +
      `left offset: ${(chosenLayout.left * 100).toFixed(0)}% · ` +
      `minimum width constraint: ${(chosenLayout.minWidth * 100).toFixed(0)}% · ` +
      `estimated reach comfort: ${(chosenLayout.coverage * 100).toFixed(0)}%. ` +
      `These are heuristic predictions, not measured accuracy.`;

    $("layoutDetails").classList.remove("hidden");
    $("keyboardModeLabel").textContent = "ADAPTIVE";
  }
}

// ------------------------------
// Typing metrics
// ------------------------------

function elapsedSeconds() {
  return startedAt === null
    ? 0
    : ((finishedAt ?? performance.now()) - startedAt) / 1000;
}

function wpm(seconds, text) {
  return seconds > 0
    ? (Math.max(text.length - 1, 0) / 5) / (seconds / 60)
    : 0;
}

function levenshteinDistance(a, b) {
  const row = Array.from(
    { length: b.length + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const above = row[j];

      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + Number(a[i - 1] !== b[j - 1])
      );

      diagonal = above;
    }
  }

  return row[b.length];
}

// ------------------------------
// Typing session
// ------------------------------

function resetPhrase() {
  window.clearInterval(timerId);

  typedText = "";
  startedAt = null;
  finishedAt = null;
  backspaces = 0;
  autocorrections = 0;
  mlCorrections = 0;
  phraseRecorded = false;

  $("errorValue").textContent = "—";
  $("nextPhrase").classList.add("hidden");
  $("finishPhrase").disabled = false;
  $("resetPhrase").disabled = false;

  $("trialMessage").textContent =
    "The timer starts with your first keypress.";

  renderTrial();
}

function renderTrial() {
  $("typedText").textContent = typedText;

  const seconds = elapsedSeconds();

  $("timeValue").textContent = seconds.toFixed(1);
  $("wpmValue").textContent =
    wpm(seconds, typedText).toFixed(1);

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
  } else if (character === "space") {
    const match = typedText.match(/([a-z]+)$/i);
    const typedWord = match ? match[1] : "";
    const prefix = typedText.slice(0, typedText.length - typedWord.length);
    let replacement = typedWord;

    if (typedWord && session.autocorrectMode !== "off") {
      replacement = HybridAutocorrect.spell(typedWord);
      if (replacement !== typedWord) autocorrections++;
    }

    typedText = prefix + replacement + " ";

    // Contextual ML is deliberately asynchronous; never overwrite text
    // that has changed since the suggestion request was started.
    if (typedWord && session.autocorrectMode === "hybrid" &&
        HybridAutocorrect.isMLReady()) {
      const snapshot = typedText;
      HybridAutocorrect.contextual(typedWord, prefix)
        .then(candidate => {
          if (!candidate || phraseRecorded || !session ||
              typedText !== snapshot || candidate === replacement) return;
          typedText = prefix + candidate + " ";
          if (replacement === typedWord) autocorrections++;
          mlCorrections++;
          renderTrial();
        })
        .catch(() => {});
    }
  } else {
    typedText += character;
  }

  renderTrial();
}

async function startSession() {
  if (session || preparingSession) return;

  if (mode === "adaptive" && !chosenLayout) {
    $("sessionStatus").textContent =
      "Complete the six reach checks before starting Adaptive mode.";
    return;
  }

  const count = Number($("phraseCount").value);
  const autocorrectMode = $("autocorrectMode").value;
  const phraseSeed = Math.max(1, Math.floor(Number($("phraseSeed").value) || 1));

  if (autocorrectMode !== "off") {
    preparingSession = true;
    $("startSession").disabled = true;
    $("autocorrectStatus").textContent = "Loading English dictionary...";
    try {
      await HybridAutocorrect.loadDictionary();
    } catch (error) {
      $("autocorrectStatus").textContent =
        "Dictionary could not load. Check your internet connection.";
      preparingSession = false;
      $("startSession").disabled = false;
      return;
    }
    preparingSession = false;
    $("startSession").disabled = false;
    $("autocorrectStatus").textContent = "Spelling dictionary ready.";
  }

  if (autocorrectMode === "hybrid" && !HybridAutocorrect.isMLReady()) {
    $("autocorrectStatus").textContent =
      "Loading contextual model in background; spelling works meanwhile.";
    HybridAutocorrect.loadML()
      .then(() => {
        $("autocorrectStatus").textContent = "Contextual ML model ready.";
      })
      .catch(() => {
        $("autocorrectStatus").textContent =
          "ML unavailable; spelling correction remains active.";
      });
  }

  // Seeded Fisher-Yates shuffle: same seed gives same phrases.
  let state = phraseSeed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const shuffled = [...PHRASES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selectedPhrases = shuffled.slice(0, count);

  const now = new Date();

  session = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now.toISOString(),
    mode,
    autocorrectMode,
    phraseSeed,
    hand,
    thumbCm: getThumbLength(),
    thumbWidthMm: getThumbWidth(),
    calibration: [...responses],
    keyboardWidthPercent:
      mode === "adaptive"
        ? Number((chosenLayout.width * 100).toFixed(1))
        : 100,
    keyboardLeftPercent:
      mode === "adaptive"
        ? Number((chosenLayout.left * 100).toFixed(1))
        : 0,
    phrases: selectedPhrases,
    index: 0
  };

  completedTrials = [];

  $("trialArea").classList.remove("hidden");
  $("resultsPanel").classList.add("hidden");

  $("startSession").disabled = true;
  $("phraseCount").disabled = true;
  $("autocorrectMode").disabled = true;
  $("phraseSeed").disabled = true;
  $("thumbLength").disabled = true;
  $("thumbWidth").disabled = true;
  $("startCalibration").disabled = true;

  document.querySelectorAll(
    ".mode-option, .hand-option"
  ).forEach(button => button.disabled = true);

  loadPhrase();
}


function loadPhrase() {
  if (!session) return;

  $("targetPhrase").textContent =
    session.phrases[session.index];

  $("sessionStatus").textContent =
    `${session.mode.toUpperCase()} session · Phrase ` +
    `${session.index + 1} of ${session.phrases.length}`;

  resetPhrase();

  // Scroll to the typing area when a session starts
  // or when the user moves to the next phrase.
  requestAnimationFrame(() => {
    $("targetPhrase").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function finishPhrase() {
  if (!session || phraseRecorded) return;

  if (startedAt === null) {
    $("trialMessage").textContent =
      "Type something before finishing this phrase.";
    return;
  }

  // Apply spelling to the final word even when there is no trailing space.
  // Contextual reranking remains optional because it is asynchronous.
  if (session.autocorrectMode !== "off") {
    const finalWord = typedText.match(/([a-z]+)$/i);
    if (finalWord) {
      const original = finalWord[1];
      const corrected = HybridAutocorrect.spell(original);
      if (corrected !== original) {
        typedText = typedText.slice(0, -original.length) + corrected;
        autocorrections++;
        renderTrial();
      }
    }
  }

  finishedAt = performance.now();
  window.clearInterval(timerId);
  phraseRecorded = true;

  const target = session.phrases[session.index];
  const seconds = elapsedSeconds();

  const error =
    100 * levenshteinDistance(typedText.trim(), target) /
    target.length;

  const result = {
    mode: session.mode,
    autocorrectMode: session.autocorrectMode,
    phraseSeed: session.phraseSeed,
    hand: session.hand,
    thumbCm: session.thumbCm,
    thumbWidthMm: session.thumbWidthMm,
    calibration: session.calibration.map(Boolean).join("|"),
    phraseNumber: session.index + 1,
    target,
    typedText,
    seconds: Number(seconds.toFixed(2)),
    wpm: Number(wpm(seconds, typedText).toFixed(2)),
    errorPercent: Number(error.toFixed(2)),
    backspaces,
    autocorrectMode: session.autocorrectMode,
    autocorrections,
    mlCorrections,
    mlModelReady: HybridAutocorrect.isMLReady(),
    phraseSeed: session.phraseSeed
  };

  completedTrials.push(result);

  // Save each completed phrase, even before the session ends.
  archiveCurrentSession();

  $("errorValue").textContent =
    `${error.toFixed(1)}%`;

  $("finishPhrase").disabled = true;
  $("resetPhrase").disabled = true;

  $("trialMessage").textContent =
    "Phrase saved. Continue or stop the session.";

  if (session.index + 1 < session.phrases.length) {
    $("nextPhrase").classList.remove("hidden");
  } else {
    stopSession();
  }

  renderTrial();
}

function nextPhrase() {
  if (
    !session ||
    !phraseRecorded ||
    session.index + 1 >= session.phrases.length
  ) return;

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
  $("autocorrectMode").disabled = false;
  $("phraseSeed").disabled = false;
  $("thumbLength").disabled = false;
  $("thumbWidth").disabled = false;
  $("startCalibration").disabled = false;

  document.querySelectorAll(
    ".mode-option, .hand-option"
  ).forEach(button => button.disabled = false);

  if (completedTrials.length) {
    const avg = key =>
      completedTrials.reduce(
        (sum, item) => sum + item[key], 0
      ) / completedTrials.length;

    $("resultsSummary").textContent =
      `${completedTrials.length} completed phrase(s) · ` +
      `Average WPM: ${avg("wpm").toFixed(1)} · ` +
      `Average final error: ${avg("errorPercent").toFixed(1)}% · ` +
      `Average backspaces: ${avg("backspaces").toFixed(1)}. ` +
      `Unfinished phrases are not included.`;

    const body = $("resultsRows");
    body.replaceChildren();

    completedTrials.forEach(item => {
      const row = document.createElement("tr");

      [
        item.phraseNumber,
        item.wpm.toFixed(1),
        `${item.errorPercent.toFixed(1)}%`,
        item.backspaces
      ].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });

      body.appendChild(row);
    });

    $("resultsPanel").classList.remove("hidden");

    $("sessionStatus").textContent =
      "Session ended. Results have been added to typing history.";
  } else {
    $("resultsPanel").classList.add("hidden");

    $("sessionStatus").textContent =
      "Session ended without completed phrases.";
  }
}

// ------------------------------
// Browser storage and history
// ------------------------------

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    savedSessions = Array.isArray(parsed)
      ? parsed.filter(item =>
          item &&
          typeof item.id === "string" &&
          Array.isArray(item.trials)
        )
      : [];

    storageAvailable = true;
  } catch (error) {
    savedSessions = [];
    storageAvailable = false;

    $("storageStatus").textContent =
      "Browser storage is unavailable or unreadable. " +
      "Export your results before leaving this page.";
  }

  renderHistory();
}

function saveHistory() {
  if (!storageAvailable) return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(savedSessions)
    );
  } catch (error) {
    storageAvailable = false;

    $("storageStatus").textContent =
      "Could not save to browser storage. " +
      "Export your results before leaving this page.";
  }
}

function archiveCurrentSession() {
  if (!session || !completedTrials.length) return;

  const record = {
    id: session.id,
    createdAt: session.createdAt,
    mode: session.mode,
    hand: session.hand,
    thumbCm: session.thumbCm,
    thumbWidthMm: session.thumbWidthMm,
    calibration: [...session.calibration],
    keyboardWidthPercent: session.keyboardWidthPercent,
    keyboardLeftPercent: session.keyboardLeftPercent,
    trials: completedTrials.map(item => ({ ...item }))
  };

  const existing = savedSessions.findIndex(
    item => item.id === record.id
  );

  if (existing >= 0) {
    savedSessions[existing] = record;
  } else {
    savedSessions.push(record);
  }

  saveHistory();
  renderHistory();
}

function renderHistory() {
  const list = $("historyList");
  list.replaceChildren();

  const numTrials = savedSessions.reduce(
    (sum, item) => sum + item.trials.length,
    0
  );

  $("historyCount").textContent =
    `${savedSessions.length} session(s) · ${numTrials} trial(s)`;

  $("exportCsv").disabled = numTrials === 0;
  $("clearHistory").disabled = savedSessions.length === 0;

  if (!savedSessions.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent =
      "No completed typing sessions yet.";
    list.appendChild(empty);
    return;
  }

  // Display newest sessions first.
  [...savedSessions].reverse().forEach(item => {
    const row = document.createElement("div");
    row.className = "history-entry";

    const info = document.createElement("div");

    const label = document.createElement("strong");
    label.textContent =
      `${item.mode === "adaptive" ? "Adaptive" : "Standard"} · ` +
      `${item.trials.length} phrase(s)`;

    const detail = document.createElement("span");
    const time = new Date(item.createdAt);

    detail.textContent =
      `${Number.isNaN(time.getTime()) ? "Unknown date" : time.toLocaleString()} · ` +
      `${item.hand} hand`;

    info.append(label, detail);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary delete-session";
    deleteButton.textContent = "Delete";

    deleteButton.setAttribute(
      "aria-label",
      `Delete ${item.mode} session from ${detail.textContent}`
    );

    deleteButton.addEventListener(
      "click",
      () => deleteSession(item.id)
    );

    row.append(info, deleteButton);
    list.appendChild(row);
  });
}

function deleteSession(id) {
  const selected = savedSessions.find(
    item => item.id === id
  );

  if (!selected) return;

  const confirmed = window.confirm(
    `Delete this ${selected.mode} session with ` +
    `${selected.trials.length} completed phrase(s)? ` +
    `This cannot be undone unless you exported a backup.`
  );

  if (!confirmed) return;

  savedSessions = savedSessions.filter(
    item => item.id !== id
  );

  saveHistory();
  renderHistory();
}

function clearHistory() {
  if (!savedSessions.length) return;

  const confirmed = window.confirm(
    `Permanently delete ${savedSessions.length} ` +
    `saved session(s) from this browser? ` +
    `Export a CSV backup first if you want to keep them.`
  );

  if (!confirmed) return;

  savedSessions = [];

  saveHistory();
  renderHistory();
}

// ------------------------------
// Export all recorded trials
// ------------------------------

function exportCsv() {
  const columns = [
    "sessionId",
    "sessionStartedAt",
    "mode",
    "hand",
    "thumbCm",
    "thumbWidthMm",
    "calibration",
    "keyboardWidthPercent",
    "keyboardLeftPercent",
    "phraseNumber",
    "target",
    "typedText",
    "seconds",
    "wpm",
    "errorPercent",
    "backspaces",
    "autocorrectMode",
    "autocorrections",
    "mlCorrections",
    "mlModelReady",
    "phraseSeed"
  ];

  const rows = savedSessions.flatMap(item =>
    item.trials.map(trial => ({
      sessionId: item.id,
      sessionStartedAt: item.createdAt,
      mode: item.mode,
      hand: item.hand,
      thumbCm: item.thumbCm,
      thumbWidthMm: item.thumbWidthMm ?? "",
      calibration: Array.isArray(item.calibration)
        ? item.calibration.map(Boolean).join("|")
        : "",
      keyboardWidthPercent: item.keyboardWidthPercent,
      keyboardLeftPercent: item.keyboardLeftPercent,
      phraseNumber: trial.phraseNumber,
      target: trial.target,
      typedText: trial.typedText,
      seconds: trial.seconds,
      wpm: trial.wpm,
      errorPercent: trial.errorPercent,
      backspaces: trial.backspaces,
      autocorrectMode: trial.autocorrectMode ?? "off",
      autocorrections: trial.autocorrections ?? 0,
      mlCorrections: trial.mlCorrections ?? 0,
      mlModelReady: trial.mlModelReady ?? false,
      phraseSeed: trial.phraseSeed ?? ""
    }))
  );

  if (!rows.length) return;

  const escapeCell = value => {
    let text = String(value ?? "");

    // Prevent spreadsheet software from evaluating typed
    // text as a formula.
    if (/^[\s\t\r\n]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.join(","),
    ...rows.map(row =>
      columns.map(key => escapeCell(row[key])).join(",")
    )
  ].join("\r\n");

  const url = URL.createObjectURL(
    new Blob(
      ["\ufeff", csv],
      { type: "text/csv;charset=utf-8" }
    )
  );

  const link = document.createElement("a");
  link.href = url;

  link.download =
    `adaptive-qwerty-history-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------------------------
// Event listeners
// ------------------------------

function initialize() {
  createKeyboard();

  document.querySelectorAll(".hand-option").forEach(
    button => button.addEventListener("click", () => {
      hand = button.dataset.hand;

      selectButtons(
        ".hand-option",
        "hand",
        hand
      );

      invalidateCalibration();
    })
  );

  document.querySelectorAll(".mode-option").forEach(
    button => button.addEventListener("click", () => {
      mode = button.dataset.mode;

      selectButtons(
        ".mode-option",
        "mode",
        mode
      );

      updateKeyboardLayout();
    })
  );

  $("thumbWidth").addEventListener(
    "change",
    updateWidthPreference
  );

  $("thumbLength").addEventListener("change", () => {
    const value = getThumbLength();

    if (value !== thumbCm) {
      thumbCm = value;
      invalidateCalibration();
    }
  });

  $("startCalibration").addEventListener(
    "click",
    startCalibration
  );

  $("markComfortable").addEventListener(
    "click",
    () => recordCalibration(true)
  );

  $("markDifficult").addEventListener(
    "click",
    () => recordCalibration(false)
  );

  $("cancelCalibration").addEventListener(
    "click",
    () => $("calibrationPanel").classList.add("hidden")
  );

  document.querySelector(
    '[data-key="space"]'
  ).addEventListener(
    "click",
    () => typeCharacter("space")
  );

  document.querySelector(
    '[data-key="backspace"]'
  ).addEventListener(
    "click",
    () => typeCharacter("backspace")
  );

  $("startSession").addEventListener(
    "click",
    startSession
  );

  $("resetPhrase").addEventListener(
    "click",
    resetPhrase
  );

  $("finishPhrase").addEventListener(
    "click",
    finishPhrase
  );

  $("nextPhrase").addEventListener(
    "click",
    nextPhrase
  );

  $("stopSession").addEventListener(
    "click",
    stopSession
  );

  $("exportCsv").addEventListener(
    "click",
    exportCsv
  );

  $("clearHistory").addEventListener(
    "click",
    clearHistory
  );

  loadHistory();
  updateKeyboardLayout();
  renderTrial();
}

initialize();
