/**
 * script.js
 * Fetches data.yaml, parses it with js-yaml, and renders the portfolio
 * entirely from that data — plus theme toggling, sidebar nav generation,
 * and scroll-based active-link tracking.
 */

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
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /* ---------------------------------------------------------------------
   * Theme
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

  function initThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      if (storage) storage.setItem("theme", next);
    });

    // Follow system changes live, but only until the person picks manually.
    if (!(storage && storage.getItem("theme")) && window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!(storage && storage.getItem("theme"))) {
          document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
   * Sidebar nav + scrollspy
   * ------------------------------------------------------------------- */

  function buildSideRail(data) {
    const nav = data.nav || [];
    const list = document.getElementById("side-rail-list");
    if (!list) return;

    list.innerHTML = "";
    nav.forEach((item, i) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${item.id}`;
      a.dataset.navTarget = item.id;
      a.innerHTML = `<span class="side-rail__index">${String(i + 1).padStart(2, "0")}</span><span>${escapeHtml(item.label)}</span>`;
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function initScrollspy(data) {
    const nav = data.nav || [];
    const links = Array.from(document.querySelectorAll("[data-nav-target]"));
    const sections = nav
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (!("IntersectionObserver" in window) || sections.length === 0) return;

    const setActive = (id) => {
      links.forEach((l) => l.classList.toggle("is-active", l.dataset.navTarget === id));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    setActive(nav[0] && nav[0].id);
  }

  /* ---------------------------------------------------------------------
   * Section builders
   * ------------------------------------------------------------------- */

  function buildAbout(data) {
    const hero = data.hero || {};
    const section = el("header", "site-header wrap reveal");
    section.id = "about";

    section.innerHTML = `
      <h1 class="masthead__name">${escapeHtml(hero.name || "")}</h1>
      <div class="masthead__subline">
        <span>${escapeHtml(hero.alias || "")}</span>
        ${hero.status_badge ? '<span class="divider"></span>' : ""}
        ${hero.status_badge ? `<span class="badge badge--accent">${escapeHtml(hero.status_badge)}</span>` : ""}
      </div>
      <p class="hero__headline">${escapeHtml(hero.headline || "")}</p>
      <p class="hero__bio">${escapeHtml(hero.bio || "")}</p>
      <div class="tech-stack">
        ${(hero.tech_stack || []).map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
      </div>
    `;
    return section;
  }

  function buildImpact(data) {
    const metrics = data.impact_metrics || [];
    const section = el("section", "section wrap reveal");
    section.id = "impact";
    section.innerHTML = `<div class="eyebrow">By the numbers</div>`;

    const ledger = el("div", "ledger");
    metrics.forEach((m) => {
      ledger.appendChild(
        el(
          "div",
          "ledger__item",
          `<div class="ledger__number">${escapeHtml(m.number)}</div>
           <div class="ledger__label">${escapeHtml(m.label)}</div>`
        )
      );
    });
    section.appendChild(ledger);
    return section;
  }

  function buildSkills(data) {
    const skills = data.skills || {};
    const section = el("section", "section wrap reveal");
    section.id = "skills";
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
    section.id = "projects";
    section.innerHTML =
      `<div class="eyebrow">Featured work</div>` +
      `<h2 class="section-title">Projects &amp; systems shipped</h2>`;

    const grid = el("div", "projects");
    projects.forEach((p) => {
      const card = el("article", "project-card");
      const tags = p.tags || [];
      card.innerHTML = `
        <div class="project-card__tags">
          ${tags.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
        </div>
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
    section.id = "experience";
    section.innerHTML =
      `<div class="eyebrow">Track record</div>` +
      `<h2 class="section-title">Experience &amp; leadership</h2>`;

    const timeline = el("div", "timeline");
    experience.forEach((e) => {
      const item = el("div", "timeline__item");
      const bullets = e.bullets || [];
      item.innerHTML = `
        <div class="timeline__period">${escapeHtml(e.period || "")}</div>
        <div class="timeline__content">
          <div class="timeline__role">${escapeHtml(e.role || "")}</div>
          <div class="timeline__org">${escapeHtml(e.organization || "")}</div>
          ${bullets.length ? `<ul class="timeline__bullets">${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : ""}
        </div>
      `;
      timeline.appendChild(item);
    });
    section.appendChild(timeline);
    return section;
  }

  function buildEducation(data) {
    const education = data.education || {};
    const degrees = education.degrees || [];
    const certifications = education.certifications || [];

    const section = el("section", "section wrap reveal");
    section.id = "education";
    section.innerHTML =
      `<div class="eyebrow">Academic background</div>` +
      `<h2 class="section-title">Education</h2>`;

    const group = el("div", "education__group");
    degrees.forEach((d) => {
      const item = el("div", "degree-item");
      item.innerHTML = `
        <div class="degree-item__period">${escapeHtml(d.period || "")}</div>
        <div>
          <div class="degree-item__degree">${escapeHtml(d.degree || "")}</div>
          <div class="degree-item__institution">${escapeHtml(d.institution || "")}</div>
          ${d.details ? `<p class="degree-item__details">${escapeHtml(d.details)}</p>` : ""}
        </div>
      `;
      group.appendChild(item);
    });
    section.appendChild(group);

    // Only render the certifications sub-section once there's something to show.
    if (certifications.length > 0) {
      const certWrap = el("div", "certifications");
      certWrap.innerHTML = `<div class="certifications__head">Certifications &amp; programs</div>`;
      certifications.forEach((c) => {
        certWrap.appendChild(
          el(
            "div",
            "cert-item",
            `<span class="cert-item__name">${escapeHtml(c.name || "")}</span>
             <span class="cert-item__meta">${escapeHtml([c.issuer, c.year].filter(Boolean).join(" — "))}</span>`
          )
        );
      });
      section.appendChild(certWrap);
    }

    return section;
  }

  function buildResearch(data) {
    const interests = data.research_interests || {};
    const section = el("section", "section wrap reveal");
    section.id = "research";
    section.innerHTML = `
      <div class="colophon">
        <div class="eyebrow" style="justify-content:center;">${escapeHtml(interests.category || "")}</div>
        <p class="colophon__title">${escapeHtml(interests.title || "")}</p>
        <p class="colophon__desc">${escapeHtml(interests.description || "")}</p>
      </div>
    `;
    return section;
  }

  function buildContact(data) {
    const contact = data.contact || {};
    const socials = contact.socials || [];

    const section = el("section", "section wrap reveal");
    section.id = "contact";
    section.innerHTML =
      `<div class="eyebrow">Get in touch</div>` +
      `<h2 class="section-title">Contact</h2>` +
      (contact.email
        ? `<a class="contact__email" href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>`
        : "");

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
    section.appendChild(list);

    const resumes = buildResumeDownloads(data);
    if (resumes) section.appendChild(resumes);

    return section;
  }

  function buildResumeDownloads(data) {
    const meta = data.metadata || {};
    const tracks = meta.cv_focus_tracks || [];
    if (tracks.length === 0) return null;

    const wrap = el("div", "resume-downloads");
    wrap.innerHTML = `<div class="resume-downloads__label">Tailored résumés</div>`;

    const list = el("ul", "social-list resume-downloads__list");
    const allEntries = [
      { id: "master", label: "Complete Profile", cv_file: meta.master_cv_file || "cv_master.html" },
      ...tracks,
    ];
    allEntries.forEach((t) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = t.cv_file;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<span>${escapeHtml(t.label || t.id)}</span><span class="arrow">&#8599;</span>`;
      li.appendChild(a);
      list.appendChild(li);
    });
    wrap.appendChild(list);
    return wrap;
  }

  function buildFooter(data) {
    const site = data.site || {};
    const hero = data.hero || {};
    const footer = el("footer", "site-footer");
    footer.innerHTML = `
      <div class="site-footer__group">
        <span>${escapeHtml(site.version || "")}</span>
        <span>${escapeHtml(site.location || "")}</span>
      </div>
      <div class="site-footer__group">
        <span>Updated ${escapeHtml(todayDateline())}</span>
        <span>&copy; ${new Date().getFullYear()} ${escapeHtml(hero.name || "")}</span>
      </div>
    `;
    return footer;
  }

  /* ---------------------------------------------------------------------
   * Render + reveal-on-scroll
   * ------------------------------------------------------------------- */

  // Maps each possible `nav` id (from data.yaml) to the builder that renders
  // it. Adding/removing/reordering sections is now purely a data.yaml edit —
  // render() no longer hardcodes a fixed sequence of appendChild calls.
  const SECTION_BUILDERS = {
    about: buildAbout,
    impact: buildImpact,
    skills: buildSkills,
    projects: buildProjects,
    experience: buildExperience,
    education: buildEducation,
    research: buildResearch,
    contact: buildContact,
  };

  function buildViewBanner(data) {
    if (!data.activeTrack) return null;
    const banner = el("div", "view-banner");
    banner.innerHTML = `
      <span>Viewing tailored profile: <strong>${escapeHtml(data.activeTrack.label)}</strong></span>
      <a href="${location.pathname}">See full profile &times;</a>
    `;
    return banner;
  }

  function render(data) {
    const root = document.getElementById("app-root");
    root.innerHTML = "";

    const banner = buildViewBanner(data);
    if (banner) root.appendChild(banner);

    (data.nav || []).forEach((item) => {
      const build = SECTION_BUILDERS[item.id];
      if (!build) return; // unknown nav id in data.yaml — skip rather than fail
      root.appendChild(build(data));
    });

    root.appendChild(buildFooter(data));

    buildSideRail(data);
    initScrollspy(data);
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
      <div class="wrap" style="padding-block:120px; text-align:center; font-family: var(--font-mono);">
        <p style="color: var(--accent-color);">Couldn't load data.yaml</p>
        <p style="color: var(--text-secondary); margin-top:8px; font-size:13px;">${escapeHtml(message)}</p>
      </div>
    `;
  }

  /* ---------------------------------------------------------------------
   * ?view=<track> filtering — mirrors generate_cv.py's focus-tag filtering
   * so the live site and the compiled CVs never fall out of sync.
   * ------------------------------------------------------------------- */

  function filterDataForView(data, viewId) {
    if (!viewId || viewId === "master") return data;

    const tracks = (data.metadata && data.metadata.cv_focus_tracks) || [];
    const activeTrack = tracks.find((t) => t.id === viewId);
    if (!activeTrack) return data; // unknown ?view= value — fail open, show everything

    const matchesFocus = (item) => Array.isArray(item.focus) && item.focus.includes(viewId);

    return Object.assign({}, data, {
      experience: (data.experience || []).filter(matchesFocus),
      featured_projects: (data.featured_projects || []).filter(matchesFocus),
      activeTrack,
    });
  }

  /* ---------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();

    fetch(DATA_URL, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${DATA_URL}`);
        return res.text();
      })
      .then((text) => {
        const data = jsyaml.load(text);
        const viewId = new URLSearchParams(window.location.search).get("view");
        render(filterDataForView(data, viewId));
      })
      .catch((err) => {
        console.error(err);
        renderError(err.message);
      });
  });
})();
