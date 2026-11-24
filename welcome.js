"use strict";
// React is used only for the welcome screen. The existing plain-JavaScript
// experiment, its data, and its calibration logic remain unchanged.
(() => {
  const mount = document.getElementById("welcomeRoot");
  if (!mount || !window.React || !window.ReactDOM) return;
  const React = window.React;
  const h = React.createElement;
  const LINES = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  function showApp(section) {
    document.body.classList.remove("landing-active");
    mount.setAttribute("aria-hidden", "true");
    window.scrollTo({ top: 0, behavior: "instant" });
    if (section === "test") {
      const test = document.getElementById("testTitle");
      if (test) test.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function showHome() {
    document.body.classList.add("landing-active");
    mount.removeAttribute("aria-hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function MiniKeyboard(props) {
    const rows = LINES.map((letters, i) =>
      h("div", { className: "welcome-mini-row", key: i },
        [...letters].map((letter, j) =>
          h("span", { className: "welcome-mini-key", key: j }, letter)
        )
      )
    );
    rows.push(h("div", { className: "welcome-mini-row welcome-mini-controls", key: "bottom" },
      h("span", { className: "welcome-mini-modifier" }, "123"),
      h("span", { className: "welcome-mini-space" }, "space"),
      h("span", { className: "welcome-mini-modifier" }, "return")
    ));
    return h("div", { className: "welcome-phone" },
      h("div", { className: "welcome-phone-notch" }),
      h("div", { className: "welcome-chat" },
        h("span", { className: "welcome-chat-label" }, "typing preview"),
        h("div", { className: "welcome-chat-bubble" }, "a keyboard that fits your thumb")
      ),
      h("div", { className: "welcome-mini-stage" },
        h("div", {
          className: "welcome-mini-layout " +
            (props.mode === "adaptive" ? "welcome-mini-layout-adaptive" : "")
        }, rows)
      ),
      h("div", { className: "welcome-home-indicator" })
    );
  }

  function Feature(props) {
    return h("article", { className: "welcome-feature" },
      h("span", { className: "welcome-feature-number" }, props.number),
      h("h3", null, props.title),
      h("p", null, props.description)
    );
  }

  function Welcome() {
    const [previewMode, setPreviewMode] = React.useState("standard");
    return h("div", { className: "welcome-page" },
      h("nav", { className: "welcome-nav", "aria-label": "Welcome navigation" },
        h("div", { className: "welcome-brand" },
          h("span", { className: "welcome-brand-icon", "aria-hidden": "true" }, "AQ"),
          h("span", null, "Adaptive QWERTY")
        ),
        h("button", { type: "button", className: "welcome-nav-link", onClick: () => showApp("setup") }, "Open lab")
      ),
      h("div", { className: "welcome-hero" },
        h("div", { className: "welcome-copy" },
          h("span", { className: "welcome-eyebrow" }, "Human–computer interaction · Research prototype"),
          h("h1", null, "One hand.", h("span", null, " Better reach.")),
          h("p", { className: "welcome-intro" },
            "Explore a familiar QWERTY keyboard that adapts its width and position to your thumb comfort, with optional smart autocorrection."
          ),
          h("div", { className: "welcome-actions" },
            h("button", { type: "button", className: "welcome-primary", onClick: () => showApp("setup") }, "Set up my keyboard", h("span", { "aria-hidden": "true" }, " ↗")),
            h("button", { type: "button", className: "welcome-secondary", onClick: () => showApp("test") }, "Explore typing test")
          ),
          h("div", { className: "welcome-proof" },
            h("span", null, "6-point reach calibration"),
            h("span", null, "200 typing phrases"),
            h("span", null, "3 correction modes")
          )
        ),
        h("div", { className: "welcome-visual" },
          h("div", { className: "welcome-preview-switch", role: "group", "aria-label": "Keyboard preview layout" },
            h("button", { type: "button", className: previewMode === "standard" ? "selected" : "", "aria-pressed": previewMode === "standard", onClick: () => setPreviewMode("standard") }, "Standard"),
            h("button", { type: "button", className: previewMode === "adaptive" ? "selected" : "", "aria-pressed": previewMode === "adaptive", onClick: () => setPreviewMode("adaptive") }, "Adaptive")
          ),
          h(MiniKeyboard, { mode: previewMode }),
          h("p", { className: "welcome-preview-caption" }, previewMode === "standard"
            ? "A full-width keyboard using familiar QWERTY positions."
            : "A narrower preview, shifted toward the typing hand.")
        )
      ),
      h("section", { className: "welcome-features", "aria-label": "Project features" },
        h(Feature, { number: "01", title: "Make it yours", description: "Choose a hand, measure your thumb, and mark which positions feel comfortable." }),
        h(Feature, { number: "02", title: "Type naturally", description: "Practice on a compact mobile keyboard with familiar keys and automatic phrase selection." }),
        h(Feature, { number: "03", title: "Compare the data", description: "Test Standard or Adaptive layouts, with autocorrection Off, Spelling, or Hybrid ML." })
      ),
      h("footer", { className: "welcome-footer" },
        h("span", null, "Adaptive QWERTY · HCI research prototype"),
        h("a", { href: "https://github.com/Aaronwins/Adaptive-QWERTY", target: "_blank", rel: "noopener noreferrer" }, "View source on GitHub")
      )
    );
  }

  ReactDOM.createRoot(mount).render(h(Welcome));
  document.body.classList.add("landing-active");
  window.addEventListener("adaptive-qwerty:home", showHome);
  const home = document.getElementById("homeLink");
  if (home) home.addEventListener("click", showHome);
})();
