(function () {
  'use strict';

  const DATA_BASE = 'data';
  const PROFILE_URL = `${DATA_BASE}/profile.json`;
  const PROJECTS_URL = `${DATA_BASE}/projects.json`;
  const SOCIALS_URL = `${DATA_BASE}/socials.json`;
  const LANG_EN_URL = `${DATA_BASE}/lang-en.json`;
  const LANG_FA_URL = `${DATA_BASE}/lang-fa.json`;

  const TYPING_SPEED_MS = 80;
  const TYPING_PAUSE_MS = 2000;

  let currentLang = 'fa';
  let translations = { en: null, fa: null };
  let profileData = null;
  let projectsData = null;
  let socialsData = null;
  let typingTimeout = null;

  function getLangFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('lang') === 'en' ? 'en' : 'fa';
  }

  function setLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    const newUrl = new URL(window.location.href);
    if (lang === 'en') newUrl.searchParams.set('lang', 'en');
    else newUrl.searchParams.delete('lang');
    window.history.replaceState({}, '', newUrl.toString());
  }

  function t(path) {
    const keys = path.split('.');
    let v = translations[currentLang];
    for (const k of keys) v = v?.[k];
    return v != null ? String(v) : path;
  }

  function tArray(path) {
    const keys = path.split('.');
    let v = translations[currentLang];
    for (const k of keys) v = v?.[k];
    return Array.isArray(v) ? v : [];
  }

  // --- Data fetching with fallbacks ---
  async function fetchJSON(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (e) {
      console.warn('Failed to load', url, e);
      return null;
    }
  }

  function faClass(icon) {
    const brands = ['github', 'linkedin', 'twitter', 'instagram', 'telegram', 'whatsapp'];
    const prefix = brands.includes(icon) ? 'fa-brands' : 'fa-solid';
    const name = icon === 'envelope' ? 'envelope' : icon === 'phone' ? 'phone' : icon;
    return `${prefix} fa-${name}`;
  }

  // --- Render hero from profile ---
  function renderHero(profile) {
    if (!profile?.personal) return;
    const p = profile.personal;
    const statusEl = document.getElementById('hero-status');
    const nameEl = document.getElementById('hero-name');
    const titleEl = document.getElementById('hero-title');
    const availability = currentLang === 'fa' && p.availability_fa ? p.availability_fa : p.availability;
    const title = currentLang === 'fa' && p.title_fa ? p.title_fa : p.title;
    if (availability && statusEl) {
      statusEl.innerHTML = `<span class="status-badge"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(availability)}</span>`;
      statusEl.classList.remove('hidden');
    }
    if (nameEl) nameEl.textContent = (currentLang === 'fa' && p.name_fa) ? p.name_fa : (p.name || p.shortName);
    if (titleEl) titleEl.textContent = title || 'Full Stack Developer';
    const viewWork = document.getElementById('hero-view-work');
    const contactMe = document.getElementById('hero-contact-me');
    if (viewWork) viewWork.textContent = t('hero.viewWork');
    if (contactMe) contactMe.textContent = t('hero.contactMe');
  }

  // --- Render hero socials from socials.json ---
  function renderHeroSocials(socials) {
    const container = document.getElementById('hero-socials');
    if (!container || !Array.isArray(socials)) return;
    const items = socials.filter(s => s.showInHero && s.url && s.url.trim() !== '');
    container.innerHTML = items.map(s => `
      <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-accent transition" aria-label="${escapeAttr(s.label)}">
        <i class="${faClass(s.icon)} fa-lg" aria-hidden="true"></i>
      </a>
    `).join('');
  }

  // --- About ---
  function renderAbout(profile) {
    const el = document.getElementById('about-text');
    if (!el) return;
    const text = currentLang === 'fa' && profile?.about_fa ? profile.about_fa : profile?.about;
    el.textContent = text || 'Full Stack Developer. Backend & frontend development.';
  }

  // --- Skills (grouped, with level) ---
  function skillDisplayName(skill) {
    if (skill == null) return '';
    if (typeof skill === 'string') return skill;
    return skill.name || '';
  }
  function skillLevel(skill) {
    if (skill == null || typeof skill !== 'object') return '';
    return skill.level || '';
  }
  function renderSkills(profile) {
    const container = document.getElementById('skills-container');
    const skills = (currentLang === 'fa' && profile?.skills_fa) ? profile.skills_fa : profile?.skills;
    if (!container || !skills || typeof skills !== 'object') return;
    container.innerHTML = Object.entries(skills).map(([category, list]) => `
      <div>
        <h3 class="text-sm font-semibold text-accent uppercase tracking-wider mb-3">${escapeHtml(category)}</h3>
        <div class="flex flex-wrap gap-2">
          ${(Array.isArray(list) ? list : []).map(skill => {
            const name = skillDisplayName(skill);
            const level = skillLevel(skill);
            const levelHtml = level ? `<span class="skill-level text-accent/80 text-xs font-medium ml-1">(${escapeHtml(level)})</span>` : '';
            return `<span class="skill-tag px-3 py-1 rounded-full bg-dark-card border border-gray-700 text-gray-300 text-sm inline-flex items-center">${escapeHtml(name)}${levelHtml}</span>`;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  // --- Experience timeline ---
  function renderExperience(profile) {
    const container = document.getElementById('experience-container');
    if (!container || !Array.isArray(profile?.experience)) return;
    const list = profile.experience;
    const isFa = currentLang === 'fa';
    const itemsHtml = list.map((job) => {
      const role = isFa && job.role_fa ? job.role_fa : job.role;
      const company = isFa && job.company_fa ? job.company_fa : job.company;
      const period = isFa && job.period_fa ? job.period_fa : job.period;
      const points = isFa && job.points_fa ? job.points_fa : (job.points || []);
      return `
      <div class="relative pl-6 sm:pl-8 rtl:pl-0 rtl:pr-6 rtl:sm:pr-8">
        <div class="absolute left-0 rtl:left-auto rtl:right-0 w-3 h-3 rounded-full bg-accent -translate-x-[7px] rtl:translate-x-[7px] top-1.5" aria-hidden="true"></div>
        <div class="bg-dark-card border border-gray-700 rounded-lg p-4 sm:p-5 card-hover">
          <p class="text-white font-semibold">${escapeHtml(role)}</p>
          <p class="text-accent text-sm">${escapeHtml(company)} · ${escapeHtml(period)}</p>
          <ul class="mt-3 space-y-1 text-gray-400 text-sm list-disc list-inside">
            ${points.map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    }).join('');
    container.innerHTML = '<div class="timeline-line" aria-hidden="true"></div>' + itemsHtml;
  }

  // --- Projects grid (featured) ---
  function renderProjects(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid || !Array.isArray(projects) || projects.length === 0) return;
    const placeholderImg = 'assets/images/project-placeholder.svg';
    const isFa = currentLang === 'fa';
    grid.innerHTML = projects.map(proj => {
      const img = (proj.image && proj.image.trim()) ? proj.image : placeholderImg;
      const links = proj.links || {};
      const github = (links.github || '').trim();
      const demo = (links.demo || '').trim();
      const techs = Array.isArray(proj.technologies) ? proj.technologies : [];
      const title = isFa && proj.title_fa ? proj.title_fa : proj.title;
      const desc = isFa && proj.description_fa ? proj.description_fa : (proj.description || '');
      const githubLabel = t('project.github');
      const demoLabel = t('project.demo');
      const linksPlaceholder = t('project.linksPlaceholder');
      return `
        <article class="bg-dark-card border border-gray-700 rounded-xl overflow-hidden card-hover flex flex-col">
          <div class="aspect-video bg-dark-secondary flex items-center justify-center text-accent/60">
            <img src="${escapeAttr(img)}" alt="" class="w-full h-full object-cover" width="400" height="240" loading="lazy" />
          </div>
          <div class="p-4 flex-1 flex flex-col">
            <h3 class="text-lg font-semibold text-white mb-2">${escapeHtml(title)}</h3>
            <p class="text-gray-400 text-sm flex-1 mb-3">${escapeHtml(desc)}</p>
            <div class="flex flex-wrap gap-2 mb-4">
              ${techs.map(tech => `<span class="px-2 py-0.5 rounded bg-accent-muted text-accent text-xs font-mono">${escapeHtml(tech)}</span>`).join('')}
            </div>
            <div class="flex flex-wrap gap-3">
              ${github ? `<a href="${escapeAttr(github)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent hover:text-white transition-colors">${escapeHtml(githubLabel)}</a>` : ''}
              ${demo ? `<a href="${escapeAttr(demo)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent hover:text-white transition-colors">${escapeHtml(demoLabel)}</a>` : ''}
              ${!github && !demo ? `<span class="text-gray-500 text-sm">${escapeHtml(linksPlaceholder)}</span>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // --- Other projects (compact list) ---
  function renderOtherProjects(other) {
    const container = document.getElementById('projects-other-container');
    const listEl = document.getElementById('projects-other');
    if (!container || !listEl || !Array.isArray(other) || other.length === 0) {
      if (container) container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    const isFa = currentLang === 'fa';
    listEl.innerHTML = other.map(proj => {
      const title = isFa && proj.title_fa ? proj.title_fa : proj.title;
      const github = (proj.links && proj.links.github) ? proj.links.github.trim() : '';
      if (!github) return `<span class="text-gray-500">${escapeHtml(title)}</span>`;
      return `<a href="${escapeAttr(github)}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">${escapeHtml(title)}</a>`;
    }).join('');
  }

  // --- Education, certifications, languages ---
  function renderEducation(profile) {
    const listEl = document.getElementById('education-list');
    const certEl = document.getElementById('certifications-list');
    const langEl = document.getElementById('languages-list');
    const isFa = currentLang === 'fa';
    const educationTitle = t('sections.educationTitle');
    if (profile?.education?.length && listEl) {
      listEl.innerHTML = `<h3 class="text-lg font-semibold text-white mb-4">${escapeHtml(educationTitle)}</h3><ul class="space-y-3 text-gray-400"></ul>`;
      const ul = listEl.querySelector('ul');
      profile.education.forEach(ed => {
        const degree = isFa && ed.degree_fa ? ed.degree_fa : ed.degree;
        const institution = isFa && ed.institution_fa ? ed.institution_fa : ed.institution;
        const period = isFa && ed.period_fa ? ed.period_fa : ed.period;
        ul.insertAdjacentHTML('beforeend', `<li><strong class="text-gray-300">${escapeHtml(degree)}</strong> – ${escapeHtml(institution)} (${escapeHtml(period)})</li>`);
      });
    }
    if (profile?.certifications?.length && certEl) {
      certEl.innerHTML = profile.certifications.map(c => {
        const name = isFa && c.name_fa ? c.name_fa : c.name;
        const issuer = isFa && c.issuer_fa ? c.issuer_fa : c.issuer;
        const date = isFa && c.date_fa ? c.date_fa : c.date;
        const link = c.url ? `<a href="${escapeAttr(c.url)}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">${escapeHtml(name)}</a>` : escapeHtml(name);
        return `<li>${link} – ${escapeHtml(issuer)} (${escapeHtml(date)})</li>`;
      }).join('');
    }
    if (profile?.languages?.length && langEl) {
      langEl.innerHTML = profile.languages.map(l => {
        const name = isFa && l.name_fa ? l.name_fa : l.name;
        const level = isFa && l.level_fa ? l.level_fa : l.level;
        const details = isFa && l.details_fa ? l.details_fa : l.details;
        return `<li><strong class="text-gray-300">${escapeHtml(name)}</strong>: ${escapeHtml(level)}${details ? ` – ${escapeHtml(details)}` : ''}</li>`;
      }).join('');
    }
  }

  // --- Contact links and resume ---
  function renderContact(socials, profile) {
    const container = document.getElementById('contact-links');
    if (container && Array.isArray(socials)) {
      const items = socials.filter(s => s.showInContact && s.url && s.url.trim() !== '');
      container.innerHTML = items.map(s => `
        <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-gray-400 hover:text-accent transition">
          <i class="${faClass(s.icon)} w-5" aria-hidden="true"></i>
          <span>${escapeHtml(s.label)}</span>
        </a>
      `).join('');
    }
    const resumeLink = document.getElementById('resume-download');
    if (resumeLink) resumeLink.href = currentLang === 'en' ? 'resume.html?lang=en' : 'resume.html';
  }

  // --- Formspree: ensure form action is configurable via data or leave placeholder ---
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function () {
      // Formspree handles submit; optional: show thank-you message via Formspree redirect or JS
    });
  }

  // --- Typing effect for hero tagline ---
  function startTypingEffect() {
    if (typingTimeout) clearTimeout(typingTimeout);
    const el = document.getElementById('hero-tagline');
    if (!el) return;
    const phrases = tArray('typingPhrases');
    if (phrases.length === 0) return;
    let phraseIndex = 0;
    function typeNext() {
      const phrase = phrases[phraseIndex % phrases.length];
      let i = 0;
      el.textContent = '';
      function typeChar() {
        if (i <= phrase.length) {
          el.textContent = phrase.slice(0, i);
          i++;
          typingTimeout = setTimeout(typeChar, TYPING_SPEED_MS);
        } else {
          typingTimeout = setTimeout(deleteAndNext, TYPING_PAUSE_MS);
        }
      }
      function deleteAndNext() {
        if (el.textContent.length > 0) {
          el.textContent = el.textContent.slice(0, -1);
          typingTimeout = setTimeout(deleteAndNext, TYPING_SPEED_MS / 2);
        } else {
          phraseIndex++;
          typingTimeout = setTimeout(typeNext, 400);
        }
      }
      typeChar();
    }
    typeNext();
  }

  // --- Mobile menu ---
  function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    const icon = btn?.querySelector('i.fas');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      menu.classList.toggle('hidden');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', function () {
        menu.classList.add('hidden');
        if (icon) {
          icon.classList.add('fa-bars');
          icon.classList.remove('fa-times');
        }
      });
    });
  }

  // --- Smooth scroll for nav links ---
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      a.addEventListener('click', function (e) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // --- Active section highlighting ---
  function initSectionSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            link.classList.toggle('active', href === `#${id}`);
          });
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach(s => observer.observe(s));
  }

  // --- Fade-in on scroll ---
  function initScrollAnimations() {
    const els = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0 }
    );
    els.forEach(el => observer.observe(el));
  }

  // --- Update all UI strings from translations ---
  function updateUIText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
  }

  // --- Footer year (and full footer text for i18n) ---
  function setFooterYear() {
    const footerEl = document.getElementById('footer-text');
    if (footerEl) footerEl.textContent = t('footer').replace('{year}', new Date().getFullYear());
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // --- Language switcher (smooth transition) ---
  const LANG_SWITCH_FADE_MS = 280;

  function initLangSwitcher() {
    const appContent = document.getElementById('app-content');
    let switching = false;

    function updateSwitcherActive(lang) {
      const faLink = document.getElementById('lang-switch-fa');
      const enLink = document.getElementById('lang-switch-en');
      const faMobile = document.getElementById('lang-switch-fa-mobile');
      const enMobile = document.getElementById('lang-switch-en-mobile');
      if (faLink) { faLink.classList.toggle('text-accent', lang === 'fa'); faLink.classList.toggle('text-gray-400', lang !== 'fa'); }
      if (enLink) { enLink.classList.toggle('text-accent', lang === 'en'); enLink.classList.toggle('text-gray-400', lang !== 'en'); }
      if (faMobile) { faMobile.classList.toggle('text-accent', lang === 'fa'); faMobile.classList.toggle('text-gray-400', lang !== 'fa'); }
      if (enMobile) { enMobile.classList.toggle('text-accent', lang === 'en'); enMobile.classList.toggle('text-gray-400', lang !== 'en'); }
    }

    function applyLangAndRender(lang) {
      setLang(lang);
      updateUIText();
      if (profileData) {
        renderHero(profileData);
        renderAbout(profileData);
        renderSkills(profileData);
        renderExperience(profileData);
        renderEducation(profileData);
        renderContact(socialsData || [], profileData);
      }
      renderHeroSocials(socialsData || []);
      if (projectsData) {
        const featured = Array.isArray(projectsData) ? projectsData : (projectsData.featured || []);
        const other = Array.isArray(projectsData) ? [] : (projectsData.other || []);
        if (featured.length) renderProjects(featured);
        if (other.length) renderOtherProjects(other);
      }
      setFooterYear();
      startTypingEffect();
      updateSwitcherActive(lang);
    }

    function switchTo(lang) {
      if (switching || lang === currentLang) return;
      switching = true;
      appContent?.classList.add('lang-switching');
      updateSwitcherActive(lang);

      setTimeout(() => {
        applyLangAndRender(lang);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            appContent?.classList.remove('lang-switching');
            switching = false;
          });
        });
      }, LANG_SWITCH_FADE_MS);
    }

    [['lang-switch-fa', 'fa'], ['lang-switch-en', 'en'], ['lang-switch-fa-mobile', 'fa'], ['lang-switch-en-mobile', 'en']].forEach(([id, lang]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { e.preventDefault(); switchTo(lang); });
    });
  }

  // --- Run all ---
  async function init() {
    const [profile, projects, socials, langEn, langFa] = await Promise.all([
      fetchJSON(PROFILE_URL),
      fetchJSON(PROJECTS_URL),
      fetchJSON(SOCIALS_URL),
      fetchJSON(LANG_EN_URL),
      fetchJSON(LANG_FA_URL)
    ]);

    profileData = profile;
    projectsData = projects;
    socialsData = socials;
    translations.en = langEn || {};
    translations.fa = langFa || {};

    currentLang = getLangFromUrl();
    setLang(currentLang);

    updateUIText();

    if (profile) {
      renderHero(profile);
      renderAbout(profile);
      renderSkills(profile);
      renderExperience(profile);
      renderEducation(profile);
      renderContact(socials || [], profile);
    }
    renderHeroSocials(socials || []);
    if (projects) {
      const featured = Array.isArray(projects) ? projects : (projects.featured || []);
      const other = Array.isArray(projects) ? [] : (projects.other || []);
      if (featured.length) renderProjects(featured);
      if (other.length) renderOtherProjects(other);
    }

    setFooterYear();
    initMobileMenu();
    initSmoothScroll();
    initSectionSpy();
    initScrollAnimations();
    initContactForm();
    initLangSwitcher();
    startTypingEffect();
    initWaveGrid();

    const lang = currentLang;
    const faLink = document.getElementById('lang-switch-fa');
    const enLink = document.getElementById('lang-switch-en');
    const faMobile = document.getElementById('lang-switch-fa-mobile');
    const enMobile = document.getElementById('lang-switch-en-mobile');
    if (faLink) { faLink.classList.toggle('text-accent', lang === 'fa'); faLink.classList.toggle('text-gray-400', lang !== 'fa'); }
    if (enLink) { enLink.classList.toggle('text-accent', lang === 'en'); enLink.classList.toggle('text-gray-400', lang !== 'en'); }
    if (faMobile) { faMobile.classList.toggle('text-accent', lang === 'fa'); faMobile.classList.toggle('text-gray-400', lang !== 'fa'); }
    if (enMobile) { enMobile.classList.toggle('text-accent', lang === 'en'); enMobile.classList.toggle('text-gray-400', lang !== 'en'); }
  }

  // --- Interactive wave background: random lines (not a grid) ---
  function initWaveGrid() {
    const canvas = document.getElementById('wave-grid-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let mouseX = -1e5;
    let mouseY = -1e5;
    let time = 0;
    let lines = [];

    const WAVE_AMPLITUDE = 10;
    const WAVE_SPEED = 0.025;
    const WAVE_FREQ = 0.012;
    const MOUSE_RADIUS = 200;
    const MOUSE_STRENGTH = 14;
    const LINE_OPACITY = 0.08;
    const NUM_LINES = 120;
    const MIN_LENGTH = 80;
    const MAX_LENGTH = 280;
    const SEGMENTS_PER_LINE = 24;

    function getWaveOffset(x, y) {
      const wave = Math.sin(x * WAVE_FREQ + time) * WAVE_AMPLITUDE + Math.sin(y * 0.008 + time * 0.6) * 5;
      const dx = x - mouseX;
      const dy = y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influence = dist < MOUSE_RADIUS ? (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH : 0;
      const angle = Math.atan2(dy, dx);
      const mx = Math.cos(angle) * influence;
      const my = Math.sin(angle) * influence;
      return { x: mx, y: wave + my };
    }

    function randomBetween(a, b) {
      return a + Math.random() * (b - a);
    }

    function generateLines() {
      lines = [];
      for (let i = 0; i < NUM_LINES; i++) {
        const x1 = randomBetween(-50, width + 50);
        const y1 = randomBetween(-50, height + 50);
        const angle = Math.random() * Math.PI * 2;
        const length = randomBetween(MIN_LENGTH, MAX_LENGTH);
        const x2 = x1 + Math.cos(angle) * length;
        const y2 = y1 + Math.sin(angle) * length;
        lines.push({ x1, y1, x2, y2 });
      }
    }

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      generateLines();
    }

    function draw() {
      time += WAVE_SPEED;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = `rgba(45, 212, 191, ${LINE_OPACITY})`;
      ctx.lineWidth = 1;

      for (let i = 0; i < lines.length; i++) {
        const { x1, y1, x2, y2 } = lines[i];
        ctx.beginPath();
        for (let s = 0; s <= SEGMENTS_PER_LINE; s++) {
          const t = s / SEGMENTS_PER_LINE;
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t;
          const o = getWaveOffset(x, y);
          const px = x + o.x;
          const py = y + o.y;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    function loop() {
      draw();
      requestAnimationFrame(loop);
    }

    function onMouseMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }

    function onMouseLeave() {
      mouseX = -1e5;
      mouseY = -1e5;
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    loop();
  }

  init();
})();
