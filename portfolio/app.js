
(function () {
  "use strict";

  const DATA_URL = "data.yaml";

  /* ---------------------------------------------------------------------
   * Utilities
   * ------------------------------------------------------------------- */

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /** "core_programming" -> "Core Programming" */
  function humanizeKey(key) {
    return key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function todayDateline() {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /* ---------------------------------------------------------------------
   * Theme (Day / Night)
   * ------------------------------------------------------------------- */

  function safeStorage() {
    try {
      const k = "__theme_test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return localStorage;
    } catch (e) {
      return null; // private browsing / storage disabled — theme just won't persist
    }
  }

  const storage = safeStorage();

  function getStoredTheme() {
    return storage ? storage.getItem("theme") : null;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === theme));
    });
  }

  function setTheme(theme, persist) {
    applyTheme(theme);
    if (persist && storage) storage.setItem("theme", theme);
  }

  function initThemeToggle(container) {
    // `container` isn't attached to the document yet at this point, so sync
    // its buttons directly rather than through a document-wide query.
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const buttons = container.querySelectorAll("[data-theme-choice]");
    buttons.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === current));
      btn.addEventListener("click", () => setTheme(btn.dataset.themeChoice, true));
    });

    // If the user hasn't chosen manually, keep following the system setting live.
    if (!getStoredTheme() && window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          if (!getStoredTheme()) applyTheme(e.matches ? "dark" : "light");
        });
    }
  }

  /* ---------------------------------------------------------------------
   * Section builders
   * ------------------------------------------------------------------- */

  function buildMasthead(data) {
    const hero = data.hero || {};
    const masthead = data.masthead || {};

    const wrap = el("header", "masthead wrap");

    const dateline = el("div", "masthead__dateline");
    dateline.innerHTML = `
      <span class="masthead__dateline-group">
        <span>${escapeHtml(masthead.edition || "")}</span>
        <span>${escapeHtml(todayDateline())}</span>
      </span>
      <span class="masthead__dateline-group">
        <span>${escapeHtml(masthead.location || "")}</span>
        <span class="theme-toggle" role="group" aria-label="Toggle color theme">
          <button type="button" data-theme-choice="light" aria-pressed="false">Light</button>
          <button type="button" data-theme-choice="dark" aria-pressed="false">Dark</button>
        </span>
      </span>
    `;

    const nameplate = el("div", "masthead__nameplate");
    nameplate.innerHTML = `
      <h1 class="masthead__name">${escapeHtml(hero.name || "")}</h1>
      <div class="masthead__subline">
        <span>${escapeHtml(hero.alias || "")}</span>
        ${hero.status_badge ? '<span class="divider"></span>' : ""}
        ${hero.status_badge ? `<span class="badge badge--accent">${escapeHtml(hero.status_badge)}</span>` : ""}
        ${masthead.founded_year ? '<span class="divider"></span>' : ""}
        ${masthead.founded_year ? `<span> ${escapeHtml(masthead.founded_year)}</span>` : ""}
      </div>
    `;

    wrap.appendChild(dateline);
    wrap.appendChild(nameplate);
    initThemeToggle(dateline);
    return wrap;
  }

  function buildHeroBody(data) {
    const hero = data.hero || {};
    const socials = hero.socials || [];

    const section = el("section", "hero wrap reveal");
    const body = el("div", "hero__body");

    const main = el("div", "hero__main");
    main.innerHTML = `
      <p class="hero__headline">${escapeHtml(hero.headline || "")}</p>
      <p class="hero__bio">${escapeHtml(hero.bio || "")}</p>
    `;

    const aside = el("div", "hero__aside");
    const label = el("div", "hero__aside-label", "Connect");
    const list = el("ul", "social-list");
    socials.forEach((s) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = s.url || "#";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<span>${escapeHtml(s.label || "")}</span><span class="arrow">&#8599;</span>`;
      li.appendChild(a);
      list.appendChild(li);
    });
    aside.appendChild(label);
    aside.appendChild(list);

    body.appendChild(main);
    body.appendChild(aside);
    section.appendChild(body);
    return section;
  }

  function buildLedger(data) {
    const metrics = data.impact_metrics || [];
    const section = el("section", "section wrap reveal");
    section.innerHTML = `<div class="eyebrow">By the numbers</div>`;

    const ledger = el("div", "ledger");
    metrics.forEach((m) => {
      const item = el(
        "div",
        "ledger__item",
        `<div class="ledger__number">${escapeHtml(m.number)}</div>
         <div class="ledger__label">${escapeHtml(m.label)}</div>`
      );
      ledger.appendChild(item);
    });
    section.appendChild(ledger);
    return section;
  }

  function buildSkills(data) {
    const skills = data.skills || {};
    const section = el("section", "section wrap reveal");
    section.innerHTML =
      `<div class="eyebrow">Toolkit</div>` +
      `<h2 class="section-title">Skills &amp; areas of focus</h2>`;

    const columns = el("div", "columns");
    Object.keys(skills).forEach((key) => {
      const col = el("div", "column");
      col.innerHTML = `<div class="column__head">${escapeHtml(humanizeKey(key))}</div>`;
      const list = el("ul", "column__list");
      (skills[key] || []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      col.appendChild(list);
      columns.appendChild(col);
    });
    section.appendChild(columns);
    return section;
  }

  function buildProjects(data) {
    const projects = data.featured_projects || [];
    const section = el("section", "section wrap reveal");
    section.innerHTML =
      `<div class="eyebrow">Featured work</div>` +
      `<h2 class="section-title">Projects &amp; systems </h2>`;

    const grid = el("div", "projects");
    projects.forEach((p) => {
      const card = el("article", "project-card");
      card.innerHTML = `
        <span class="badge">${escapeHtml(p.badge || "")}</span>
        <h3 class="project-card__title">${escapeHtml(p.title || "")}</h3>
        <p class="project-card__desc">${escapeHtml(p.description || "")}</p>
        <a class="project-card__link" href="${escapeHtml(p.github || "#")}" target="_blank" rel="noopener noreferrer">
          View on GitHub <span aria-hidden="true">&#8599;</span>
        </a>
      `;
      grid.appendChild(card);
    });
    section.appendChild(grid);
    return section;
  }

  function buildExperience(data) {
    const experience = data.experience || [];
    const section = el("section", "section wrap reveal");
    section.innerHTML =
      `<div class="eyebrow">Track record</div>` +
      `<h2 class="section-title">Experience</h2>`;

    const timeline = el("div", "timeline");
    experience.forEach((e) => {
      const item = el("div", "timeline__item");
      item.innerHTML = `
        <div class="timeline__period">${escapeHtml(e.period || "")}</div>
        <div class="timeline__content">
          <div class="timeline__role">${escapeHtml(e.role || "")}</div>
          <div class="timeline__org">${escapeHtml(e.organization || "")}</div>
          <p class="timeline__details">${escapeHtml(e.details || "")}</p>
        </div>
      `;
      timeline.appendChild(item);
    });
    section.appendChild(timeline);
    return section;
  }

  function buildColophon(data) {
    const interests = data.personal_interests || {};
    const section = el("section", "section wrap reveal");
    section.innerHTML = `
      <div class="colophon">
        <div class="eyebrow" style="justify-content:center;">${escapeHtml(interests.category || "")}</div>
        <p class="colophon__title">${escapeHtml(interests.title || "")}</p>
        <p class="colophon__desc">${escapeHtml(interests.description || "")}</p>
      </div>
    `;
    return section;
  }

  function buildFooter(data) {
    const hero = data.hero || {};
    const masthead = data.masthead || {};
    const footer = el("footer", "site-footer wrap");
    footer.innerHTML = `
      <span>&copy; ${new Date().getFullYear()} ${escapeHtml(hero.name || "")}</span>
      <span>${escapeHtml(masthead.edition || "")} &mdash; ${escapeHtml(masthead.location || "")}</span>
    `;
    return footer;
  }

  /* ---------------------------------------------------------------------
   * Render + reveal-on-scroll
   * ------------------------------------------------------------------- */

  function render(data) {
    const root = document.getElementById("app-root");
    root.innerHTML = "";

    root.appendChild(buildMasthead(data));
    root.appendChild(buildHeroBody(data));
    root.appendChild(buildLedger(data));
    root.appendChild(buildSkills(data));
    root.appendChild(buildProjects(data));
    root.appendChild(buildExperience(data));
    root.appendChild(buildColophon(data));
    root.appendChild(buildFooter(data));

    initScrollReveal();
  }

  function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || targets.length === 0) {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((t) => observer.observe(t));
  }

  function renderError(message) {
    const root = document.getElementById("app-root");
    root.innerHTML = `
      <div class="wrap" style="padding-block:80px; text-align:center; font-family: var(--font-mono);">
        <p style="color: var(--color-accent);">Couldn't load data.yaml</p>
        <p style="color: var(--color-muted); margin-top:8px; font-size:13px;">${escapeHtml(message)}</p>
      </div>
    `;
  }

  /* ---------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${DATA_URL}`);
        return res.text();
      })
      .then((text) => {
        const data = jsyaml.load(text);
        render(data);
      })
      .catch((err) => {
        console.error(err);
        renderError(err.message);
      });
  });
})();
