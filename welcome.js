"use strict";
// React renders only the welcome screen. The experiment and stored results
// remain in script.js and are not reset when users switch views.
(() => {
  const mount = document.getElementById("welcomeRoot");
  if (!mount || !window.React || !window.ReactDOM) return;

  const React = window.React;
  const h = React.createElement;
  const LETTERS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const views = new Set(["lab", "test"]);

  // Hash routes make Back/Forward work and support links like /#lab.
  function route() {
    const destination = location.hash.slice(1).toLowerCase();
    const inLab = views.has(destination);
    document.body.classList.toggle("landing-active", !inLab);
    mount.hidden = inLab;
    mount.setAttribute("aria-hidden", String(inLab));
    const lab = document.getElementById("typingLab");
    if (lab) lab.removeAttribute("aria-hidden");
    requestAnimationFrame(() => {
      if (destination === "test") {
        document.getElementById("testTitle")?.scrollIntoView({ block: "start" });
      } else {
        window.scrollTo(0, 0);
      }
    });
  }

  function go(destination) {
    const hash = destination === "home" ? "#home" : "#" + destination;
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function KeyboardPreview({ adaptive }) {
    const rows = LETTERS.map((line, i) =>
      h("div", { className: "preview-key-row", key: i },
        i === 2 && h("span", { className: "preview-modifier" }, "⇧"),
        [...line].map((letter, j) =>
          h("span", { className: "preview-key", key: j }, letter)
        ),
        i === 2 && h("span", { className: "preview-modifier" }, "⌫")
      )
    );

    return h("div", {
      className: "preview-keyboard " + (adaptive ? "preview-keyboard-adaptive" : "")
    },
      rows,
      h("div", { className: "preview-key-row preview-bottom" },
        h("span", { className: "preview-modifier" }, "123"),
        h("span", { className: "preview-key preview-space" }, "space"),
        h("span", { className: "preview-modifier" }, "return")
      )
    );
  }

  function Phone({ keyboardMode, messageColor }) {
    return h("div", { className: "preview-phone", "aria-label": "Keyboard and message styling preview" },
      h("div", { className: "preview-status-bar" },
        h("span", null, "9:41"),
        h("span", null, "●●● ▰")
      ),
      h("div", { className: "preview-contact" },
        h("span", { className: "preview-back-chevron" }, "‹"),
        h("span", { className: "preview-contact-avatar" }, "AQ"),
        h("span", { className: "preview-contact-title" }, "Keyboard preview")
      ),
      h("div", { className: "preview-conversation" },
        h("p", { className: "preview-date" }, "Today"),
        h("div", { className: "preview-bubble incoming" }, "How does the keyboard work?"),
        h("div", { className: "preview-bubble outgoing " + messageColor },
          keyboardMode === "standard" ? "The keys stay familiar." : "It adjusts to my thumb.")
      ),
      h("div", { className: "preview-compose" },
        h("span", { className: "compose-plus" }, "+"),
        h("span", { className: "compose-field" }, "Message"),
        h("span", { className: "compose-audio" }, "◖))")
      ),
      h("div", { className: "preview-keyboard-base" },
        h(KeyboardPreview, { adaptive: keyboardMode === "adaptive" }),
        h("div", { className: "preview-home-line" })
      )
    );
  }

  function Welcome() {
    const [keyboardMode, setKeyboardMode] = React.useState("standard");
    const [messageColor, setMessageColor] = React.useState("blue");

    return h("div", { className: "welcome-page" },
      h("header", { className: "welcome-topbar" },
        h("span", { className: "welcome-wordmark" }, "Adaptive ", h("span", null, "QWERTY")),
        h("div", { className: "welcome-top-actions" },
          h("a", { href: "https://github.com/Aaronwins/Adaptive-QWERTY", target: "_blank", rel: "noopener noreferrer" }, "GitHub"),
          h("button", { type: "button", className: "welcome-open", onClick: () => go("lab") }, "Open lab")
        )
      ),
      h("main", { className: "welcome-main" },
        h("section", { className: "welcome-introduction" },
          h("span", { className: "welcome-kicker" }, "TYPING RESEARCH / HCI PROJECT"),
          h("h1", null, "The keyboard you know,", h("span", null, " adjusted for you.")),
          h("p", { className: "welcome-description" },
            "Test a familiar QWERTY layout that adapts to your thumb reach. Compare layouts, typing speed, accuracy, and autocorrection in a simple mobile experiment."
          ),
          h("div", { className: "welcome-cta" },
            h("button", { type: "button", className: "welcome-button-primary", onClick: () => go("lab") }, "Set up keyboard", h("span", { "aria-hidden": "true" }, " →")),
            h("button", { type: "button", className: "welcome-button-secondary", onClick: () => go("test") }, "Go to typing test")
          ),
          h("div", { className: "welcome-facts" },
            h("div", null, h("strong", null, "06"), h("span", null, "Reach checks")),
            h("div", null, h("strong", null, "1,000"), h("span", null, "Practice phrases")),
            h("div", null, h("strong", null, "03"), h("span", null, "Correction modes"))
          )
        ),
        h("section", { className: "welcome-demo", "aria-label": "Appearance preview" },
          h("div", { className: "welcome-demo-label" },
            h("strong", null, "Keyboard preview"),
            h("span", null, "Interactive visual only")
          ),
          h(Phone, { keyboardMode, messageColor }),
          h("div", { className: "welcome-demo-controls" },
            h("div", { className: "welcome-switch", role: "group", "aria-label": "Preview keyboard width" },
              ["standard", "adaptive"].map(option =>
                h("button", {
                  key: option, type: "button",
                  className: keyboardMode === option ? "selected" : "",
                  "aria-pressed": keyboardMode === option,
                  onClick: () => setKeyboardMode(option)
                }, option === "standard" ? "Standard" : "Adaptive")
              )
            ),
            h("div", { className: "welcome-color-switch", role: "group", "aria-label": "Preview messaging bubble color" },
              h("button", {
                type: "button", className: "color-dot blue" + (messageColor === "blue" ? " selected" : ""),
                onClick: () => setMessageColor("blue"), "aria-label": "Blue message bubble",
                "aria-pressed": messageColor === "blue"
              }),
              h("button", {
                type: "button", className: "color-dot green" + (messageColor === "green" ? " selected" : ""),
                onClick: () => setMessageColor("green"), "aria-label": "Green message bubble",
                "aria-pressed": messageColor === "green"
              })
            )
          )
        )
      ),
      h("section", { className: "welcome-bottom" },
        h("div", null, h("strong", null, "Find your reach"), h("p", null, "Measure your thumb and mark comfortable positions.")),
        h("div", null, h("strong", null, "Try both layouts"), h("p", null, "Type with Standard or Adaptive QWERTY.")),
        h("div", null, h("strong", null, "Review your results"), h("p", null, "Compare WPM, errors, backspaces, and correction modes."))
      ),
      h("footer", { className: "welcome-footer" },
        h("span", null, "Adaptive QWERTY · Stony Brook HCI project"),
        h("span", null, "Prototype · Not a system keyboard")
      )
    );
  }

  ReactDOM.createRoot(mount).render(h(Welcome));
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  // The lab navigation works independently of React button event closures.
  document.getElementById("homeLink")?.addEventListener("click", event => {
    event.preventDefault();
    go("home");
  });
  route();
})();
