(function () {
  'use strict';

  const DATA_BASE = 'data';
  const PROFILE_URL = `${DATA_BASE}/profile.json`;
  const PROJECTS_URL = `${DATA_BASE}/projects.json`;
  const SOCIALS_URL = `${DATA_BASE}/socials.json`;
  const LANG_EN_URL = `${DATA_BASE}/lang-en.json`;
  const LANG_FA_URL = `${DATA_BASE}/lang-fa.json`;
  const FORMSPREE_PLACEHOLDER = 'YOUR_FORM_ID';

  const TYPING_SPEED_MS = 80;
  const TYPING_PAUSE_MS = 2000;
  const BENTO_SPANS = [
    'bento-span-0',
    'bento-span-1',
    'bento-span-2',
    'bento-span-3',
    'bento-span-4',
    'bento-span-5',
    'bento-span-6'
  ];
  const FEATURED_PROJECT_STORAGE_KEY = 'portfolio-featured-project-index';
  const PROJECT_ROTATE_MS = 4000;
  let featuredProjectIndex = 0;
  let featuredProjectsList = [];
  let projectRotateTimerId = null;
  let projectRotatePaused = false;

  let currentLang = 'fa';
  let translations = { en: null, fa: null };
  let profileData = null;
  let projectsData = null;
  let socialsData = null;
  let typingTimeout = null;
  let waveRunning = false;
  let waveRafId = null;
  let smokeRunning = false;
  let smokeRafId = null;
  let gsapContext = null;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

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

  async function fetchJSON(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
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

  function socialIconMarkup(icon, sizeClass) {
    if (icon === 'bale') {
      return `<span class="social-icon-bale ${escapeAttr(sizeClass || 'fa-lg')}" aria-hidden="true"></span>`;
    }
    const cls = sizeClass === 'w-5' ? `${faClass(icon)} fa-fw w-5` : `${faClass(icon)} fa-lg`;
    return `<i class="${cls}" aria-hidden="true"></i>`;
  }

  function socialLabel(social) {
    if (social.icon === 'bale') {
      return currentLang === 'fa' ? 'بله @HessiKz' : 'Bale @HessiKz';
    }
    return social.label || '';
  }

  function buildResumeUrl(lang, print) {
    const params = new URLSearchParams();
    if (lang === 'en') params.set('lang', 'en');
    if (print) params.set('print', '1');
    const query = params.toString();
    return query ? `resume.html?${query}` : 'resume.html';
  }

  function updateResumeLinks(lang) {
    const viewEl = document.getElementById('resume-download');
    const pdfEl = document.getElementById('resume-save-pdf');
    if (viewEl) {
      viewEl.href = buildResumeUrl(lang, false);
      if (viewEl.hasAttribute('data-i18n')) viewEl.textContent = t('contact.viewResume');
    }
    if (pdfEl) {
      pdfEl.href = buildResumeUrl(lang, true);
      if (pdfEl.hasAttribute('data-i18n')) pdfEl.textContent = t('contact.saveAsPdf');
    }
  }

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
    }
    if (nameEl) nameEl.textContent = (currentLang === 'fa' && p.name_fa) ? p.name_fa : (p.name || p.shortName);
    if (titleEl) titleEl.textContent = title || 'Full Stack Developer';
    const viewWork = document.getElementById('hero-view-work');
    const resumeBtn = document.getElementById('hero-resume');
    if (viewWork) {
      const label = viewWork.querySelector('[data-i18n="hero.viewWork"]') || viewWork.querySelector('span');
      if (label) label.textContent = t('hero.viewWork');
    }
    if (resumeBtn) {
      const label = resumeBtn.querySelector('[data-i18n="hero.downloadResume"]') || resumeBtn.querySelector('span');
      if (label) label.textContent = t('hero.downloadResume');
      resumeBtn.href = buildResumeUrl(currentLang, false);
    }
    updateResumeLinks(currentLang);
  }

  function renderHeroSocials(socials) {
    const container = document.getElementById('hero-socials');
    if (!container || !Array.isArray(socials)) return;
    const items = socials.filter(s => s.showInHero && s.url && s.url.trim() !== '');
    container.innerHTML = items.map(s => `
      <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(socialLabel(s))}">
        ${socialIconMarkup(s.icon, 'fa-lg')}
      </a>
    `).join('');
  }

  function renderAbout(profile) {
    const el = document.getElementById('about-text');
    if (!el) return;
    const text = currentLang === 'fa' && profile?.about_fa ? profile.about_fa : profile?.about;
    el.textContent = text || 'Full Stack Developer. Backend and frontend development.';
  }

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
            const levelHtml = level ? `<span class="skill-level text-accent/80 text-xs font-medium ms-1">(${escapeHtml(level)})</span>` : '';
            return `<span class="skill-tag px-3 py-1 rounded-full bg-dark-card border border-gray-700 text-gray-300 inline-flex items-center">${escapeHtml(name)}${levelHtml}</span>`;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

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
        <div class="experience-card bg-dark-card border border-gray-700 rounded-lg p-4 sm:p-5 card-hover">
          <p class="text-white font-semibold">${escapeHtml(role)}</p>
          <p class="text-accent text-sm font-mono">${escapeHtml(company)} · ${escapeHtml(period)}</p>
          <ul class="mt-3 space-y-1 text-gray-400 text-sm list-disc list-inside">
            ${points.map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    }).join('');
    container.innerHTML = '<div class="timeline-line" aria-hidden="true"></div>' + itemsHtml;
  }

  function getStoredFeaturedIndex(max) {
    try {
      const raw = sessionStorage.getItem(FEATURED_PROJECT_STORAGE_KEY);
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0 && n < max) return n;
    } catch (_) { /* ignore */ }
    return 0;
  }

  function assignBentoSpans(projectCount, featuredIdx) {
    const assignments = new Array(projectCount);
    assignments[featuredIdx] = BENTO_SPANS[0];
    let slot = 1;
    for (let i = 0; i < projectCount; i++) {
      if (i === featuredIdx) continue;
      assignments[i] = BENTO_SPANS[Math.min(slot, BENTO_SPANS.length - 1)];
      slot += 1;
    }
    return assignments;
  }

  function buildProjectCard(proj, bentoClass, options) {
    const opts = options || {};
    const isFeatured = !!opts.isFeatured;
    const projectIndex = opts.projectIndex;
    const placeholderImg = 'assets/images/project-placeholder.svg';
    const img = (proj.image && proj.image.trim()) ? proj.image : placeholderImg;
    const video = (proj.video || '').trim();
    const links = proj.links || {};
    const github = (links.github || '').trim();
    const demo = (links.demo || '').trim();
    const techs = Array.isArray(proj.technologies) ? proj.technologies : [];
    const isFa = currentLang === 'fa';
    const title = isFa && proj.title_fa ? proj.title_fa : proj.title;
    const desc = isFa && proj.description_fa ? proj.description_fa : (proj.description || '');
    const githubLabel = t('project.github');
    const demoLabel = t('project.demo');
    const linksPlaceholder = t('project.linksPlaceholder');
    const spanClass = bentoClass ? ` ${bentoClass}` : '';
    const modeClass = isFeatured ? ' project-card--featured' : ' project-card--compact project-card--swap';
    const swapHint = t('project.swapHint');
    const featuredLabel = t('project.featuredLabel');
    const reducedMotion = prefersReducedMotion();
    const playFeaturedVideo = isFeatured && !reducedMotion;
    const mediaHtml = video
      ? `<video src="${escapeAttr(video)}" class="project-card-img" poster="${escapeAttr(img)}" muted loop playsinline${playFeaturedVideo ? ' autoplay' : ''} aria-label=""></video>`
      : `<img src="${escapeAttr(img)}" alt="" class="project-card-img" width="640" height="400" loading="lazy" decoding="async" />`;
    const indexAttr = projectIndex != null ? ` data-project-index="${projectIndex}"` : '';
    const featuredAttr = isFeatured ? ' data-featured="true"' : '';
    const swapAttrs = isFeatured
      ? ` aria-label="${escapeAttr(featuredLabel)}"`
      : ` role="button" tabindex="0" aria-label="${escapeAttr(title)}. ${escapeAttr(swapHint)}"`;
    const visibleTechs = isFeatured ? techs : techs.slice(0, 4);
    const extraTechCount = isFeatured ? 0 : Math.max(0, techs.length - visibleTechs.length);
    const techHtml = visibleTechs.map(tech =>
      `<span class="px-2 py-0.5 rounded bg-accent-muted text-accent text-xs font-mono">${escapeHtml(tech)}</span>`
    ).join('') + (extraTechCount
      ? `<span class="px-2 py-0.5 rounded bg-dark-card border border-gray-700 text-gray-500 text-xs font-mono">+${extraTechCount}</span>`
      : '');
    return `
      <article class="project-card card-hover${spanClass}${modeClass}"${indexAttr}${featuredAttr}${swapAttrs}>
        <div class="card-bezel-outer">
          <div class="card-bezel-inner">
            <div class="project-image-wrap">
              ${mediaHtml}
            </div>
            <div class="p-4 flex-1 flex flex-col">
              <h3 class="text-lg font-semibold text-white mb-2">${escapeHtml(title)}</h3>
              <p class="project-card-desc text-gray-400 text-sm flex-1 mb-3 line-clamp-3">${escapeHtml(desc)}</p>
              <div class="project-card-tech flex flex-wrap gap-2 mb-4">
                ${techHtml}
              </div>
              <div class="flex flex-wrap gap-3">
                ${github ? `<a href="${escapeAttr(github)}" target="_blank" rel="noopener noreferrer" class="project-link-btn inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors">${escapeHtml(githubLabel)}</a>` : ''}
                ${demo ? `<a href="${escapeAttr(demo)}" target="_blank" rel="noopener noreferrer" class="project-link-btn inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors">${escapeHtml(demoLabel)}</a>` : ''}
                ${!github && !demo ? `<span class="text-gray-500 text-sm">${escapeHtml(linksPlaceholder)}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function syncFeaturedProjectVideos(grid) {
    if (!grid) return;
    grid.querySelectorAll('video.project-card-img').forEach((video) => {
      const isFeaturedCard = video.closest('[data-featured="true"]');
      if (isFeaturedCard && !prefersReducedMotion()) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }

  function stopProjectAutoRotate() {
    if (projectRotateTimerId != null) {
      clearInterval(projectRotateTimerId);
      projectRotateTimerId = null;
    }
  }

  function rotateFeaturedProjectNext() {
    const count = featuredProjectsList.length;
    if (count < 2) return;
    swapFeaturedProject((featuredProjectIndex + 1) % count, { persist: false, smooth: true });
  }

  function captureProjectCardRects(grid) {
    const rects = new Map();
    if (!grid) return rects;
    grid.querySelectorAll('.project-card[data-project-index]').forEach((card) => {
      rects.set(card.dataset.projectIndex, card.getBoundingClientRect());
    });
    return rects;
  }

  function playProjectFlipAnimation(grid, firstRects) {
    if (!grid || !firstRects || !firstRects.size || prefersReducedMotion()) return;

    const cards = Array.from(grid.querySelectorAll('.project-card[data-project-index]'));
    let flippingCount = 0;

    cards.forEach((card) => {
      const first = firstRects.get(card.dataset.projectIndex);
      if (!first) return;

      const last = card.getBoundingClientRect();
      const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
      const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
      const sx = first.width / (last.width || 1);
      const sy = first.height / (last.height || 1);

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.008 && Math.abs(sy - 1) < 0.008) {
        return;
      }

      card.style.transformOrigin = 'center center';
      card.style.willChange = 'transform';
      card.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      card.classList.add('project-card--flipping');
      flippingCount += 1;
    });

    if (!flippingCount) return;

    grid.classList.add('is-auto-swapping');

    const cleanup = () => {
      grid.classList.remove('is-auto-swapping');
      cards.forEach((card) => {
        card.style.transform = '';
        card.style.transformOrigin = '';
        card.style.willChange = '';
        card.classList.remove('project-card--flipping');
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cards.forEach((card) => {
          if (card.classList.contains('project-card--flipping')) {
            card.style.transform = 'translate(0, 0) scale(1, 1)';
          }
        });
      });
    });

    let done = 0;
    const finishOne = () => {
      done += 1;
      if (done >= flippingCount) cleanup();
    };

    window.setTimeout(cleanup, 650);

    cards.forEach((card) => {
      if (!card.classList.contains('project-card--flipping')) return;
      card.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName !== 'transform') return;
        card.removeEventListener('transitionend', onEnd);
        finishOne();
      });
    });
  }

  function startProjectAutoRotate() {
    stopProjectAutoRotate();
    if (prefersReducedMotion() || featuredProjectsList.length < 2 || projectRotatePaused) return;
    projectRotateTimerId = window.setInterval(() => {
      if (projectRotatePaused || document.hidden) return;
      rotateFeaturedProjectNext();
    }, PROJECT_ROTATE_MS);
  }

  function restartProjectAutoRotate() {
    stopProjectAutoRotate();
    startProjectAutoRotate();
  }

  function initProjectAutoRotate() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    if (grid.dataset.rotateBound !== '1') {
      grid.dataset.rotateBound = '1';
      grid.addEventListener('mouseenter', () => { projectRotatePaused = true; });
      grid.addEventListener('mouseleave', () => {
        projectRotatePaused = false;
        restartProjectAutoRotate();
      });
      grid.addEventListener('focusin', () => { projectRotatePaused = true; });
      grid.addEventListener('focusout', (e) => {
        if (!grid.contains(e.relatedTarget)) {
          projectRotatePaused = false;
          restartProjectAutoRotate();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) restartProjectAutoRotate();
      });
    }

    restartProjectAutoRotate();
  }

  function swapFeaturedProject(clickedIndex, options) {
    const opts = options || {};
    const persist = opts.persist !== false;
    const smooth = opts.smooth === true;
    if (!featuredProjectsList.length) return;
    if (clickedIndex === featuredProjectIndex) return;
    if (clickedIndex < 0 || clickedIndex >= featuredProjectsList.length) return;
    const grid = document.getElementById('projects-grid');
    const useFlip = smooth && grid && !prefersReducedMotion();
    const firstRects = useFlip ? captureProjectCardRects(grid) : null;

    featuredProjectIndex = clickedIndex;
    if (persist) {
      try {
        sessionStorage.setItem(FEATURED_PROJECT_STORAGE_KEY, String(featuredProjectIndex));
      } catch (_) { /* ignore */ }
    }

    renderProjects(featuredProjectsList);

    if (useFlip && firstRects) {
      playProjectFlipAnimation(grid, firstRects);
    } else if (!smooth && grid) {
      grid.classList.add('is-swapping');
      window.setTimeout(() => grid.classList.remove('is-swapping'), 420);
    }

    restartProjectAutoRotate();
  }

  function initProjectSwap() {
    const grid = document.getElementById('projects-grid');
    if (!grid || grid.dataset.swapBound === '1') return;
    grid.dataset.swapBound = '1';

    function handleSwapActivate(card) {
      if (!card || card.dataset.featured === 'true') return;
      const idx = parseInt(card.dataset.projectIndex, 10);
      if (!Number.isFinite(idx)) return;
      swapFeaturedProject(idx);
    }

    grid.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      const card = e.target.closest('.project-card--swap');
      if (!card) return;
      e.preventDefault();
      handleSwapActivate(card);
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.project-card--swap');
      if (!card) return;
      e.preventDefault();
      handleSwapActivate(card);
    });
  }

  function renderProjects(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid || !Array.isArray(projects) || projects.length === 0) return;

    featuredProjectsList = projects;
    if (featuredProjectIndex >= projects.length) featuredProjectIndex = 0;

    const assignments = assignBentoSpans(projects.length, featuredProjectIndex);
    const renderOrder = [
      featuredProjectIndex,
      ...projects.map((_, i) => i).filter((i) => i !== featuredProjectIndex)
    ];

    grid.innerHTML = renderOrder.map((i) => {
      const isFeatured = i === featuredProjectIndex;
      return buildProjectCard(projects[i], assignments[i], {
        isFeatured,
        projectIndex: i
      });
    }).join('');

    syncFeaturedProjectVideos(grid);
    initProjectSwap();
    initProjectAutoRotate();
    initProjectMotion();
  }

  function renderPortfolio25(list) {
    const container = document.getElementById('projects-portfolio25-container');
    const listEl = document.getElementById('projects-portfolio25');
    const toggleWrap = document.getElementById('projects-portfolio25-toggle-wrap');
    if (!container || !listEl || !Array.isArray(list) || list.length === 0) {
      if (container) container.classList.add('hidden');
      if (toggleWrap) toggleWrap.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    const PORTFOLIO25_INITIAL = 6;
    const isFa = currentLang === 'fa';
    const openLabel = isFa ? 'باز کردن' : 'Open';
    const hasToggle = list.length > PORTFOLIO25_INITIAL;
    const visibleCount = hasToggle ? PORTFOLIO25_INITIAL : list.length;

    listEl.dataset.expanded = 'false';

    listEl.innerHTML = list.map((proj, i) => {
      const title = isFa && proj.title_fa ? proj.title_fa : proj.title;
      const desc = isFa && proj.description_fa ? proj.description_fa : (proj.description || '');
      const category = proj.category || '';
      const techs = Array.isArray(proj.technologies) ? proj.technologies : [];
      const github = (proj.links && proj.links.github) ? proj.links.github.trim() : '';
      const demo = (proj.links && proj.links.demo) ? proj.links.demo.trim() : '';
      const primaryUrl = demo || github;
      const techHtml = techs.length
        ? `<div class="portfolio25-tech">${techs.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>`
        : '';
      const body = `
        <div class="portfolio25-card-head">
          <h4 class="portfolio25-title">${escapeHtml(title)}</h4>
          ${category ? `<span class="portfolio25-cat">${escapeHtml(category)}</span>` : ''}
        </div>
        ${desc ? `<p class="portfolio25-desc">${escapeHtml(desc)}</p>` : ''}
        ${techHtml}
        ${primaryUrl ? `<p class="portfolio25-links"><span class="portfolio25-open">${escapeHtml(openLabel)}</span></p>` : ''}`;
      const extraClass = i >= visibleCount ? ' portfolio25-card--hidden' : '';
      if (!primaryUrl) {
        return `<article class="portfolio25-card portfolio25-card--static${extraClass}">${body}</article>`;
      }
      return `<a class="portfolio25-card${extraClass}" href="${escapeAttr(primaryUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(title)}">${body}</a>`;
    }).join('');

    if (toggleWrap) {
      if (hasToggle) {
        toggleWrap.classList.remove('hidden');
      } else {
        toggleWrap.classList.add('hidden');
      }
    }
  }

  function initPortfolio25Toggle() {
    const btn = document.getElementById('projects-portfolio25-toggle');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', () => {
      const listEl = document.getElementById('projects-portfolio25');
      const label = btn.querySelector('.portfolio25-toggle-label');
      if (!listEl) return;
      const isExpanded = listEl.dataset.expanded === 'true';
      const hiddenCards = listEl.querySelectorAll('.portfolio25-card--hidden');

      if (isExpanded) {
        hiddenCards.forEach((card) => {
          card.classList.add('portfolio25-card--collapsing');
          const onEnd = () => {
            card.classList.remove('portfolio25-card--collapsing');
            card.classList.add('portfolio25-card--hidden');
            card.style.maxHeight = '';
            card.removeEventListener('transitionend', onEnd);
          };
          card.addEventListener('transitionend', onEnd);
          card.style.maxHeight = card.scrollHeight + 'px';
          requestAnimationFrame(() => { card.style.maxHeight = '0px'; });
        });
        listEl.dataset.expanded = 'false';
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('is-expanded');
        if (label) label.textContent = t('sections.portfolio25More');
      } else {
        hiddenCards.forEach((card) => {
          card.classList.remove('portfolio25-card--hidden');
          card.classList.add('portfolio25-card--expanding');
          card.style.maxHeight = '0px';
          requestAnimationFrame(() => {
            card.style.maxHeight = card.scrollHeight + 'px';
          });
          const onEnd = () => {
            card.classList.remove('portfolio25-card--expanding');
            card.style.maxHeight = '';
            card.removeEventListener('transitionend', onEnd);
          };
          card.addEventListener('transitionend', onEnd);
        });
        listEl.dataset.expanded = 'true';
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('is-expanded');
        if (label) label.textContent = t('sections.portfolio25Less');
      }
    });
  }

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
        ul.insertAdjacentHTML('beforeend', `<li><strong class="text-gray-300">${escapeHtml(degree)}</strong> - ${escapeHtml(institution)} (${escapeHtml(period)})</li>`);
      });
    }
    if (profile?.certifications?.length && certEl) {
      certEl.innerHTML = profile.certifications.map(c => {
        const name = isFa && c.name_fa ? c.name_fa : c.name;
        const issuer = isFa && c.issuer_fa ? c.issuer_fa : c.issuer;
        const date = isFa && c.date_fa ? c.date_fa : c.date;
        const link = c.url ? `<a href="${escapeAttr(c.url)}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">${escapeHtml(name)}</a>` : escapeHtml(name);
        return `<li>${link} - ${escapeHtml(issuer)} (${escapeHtml(date)})</li>`;
      }).join('');
    }
    if (profile?.languages?.length && langEl) {
      langEl.innerHTML = profile.languages.map(l => {
        const name = isFa && l.name_fa ? l.name_fa : l.name;
        const level = isFa && l.level_fa ? l.level_fa : l.level;
        const details = isFa && l.details_fa ? l.details_fa : l.details;
        return `<li><strong class="text-gray-300">${escapeHtml(name)}</strong>: ${escapeHtml(level)}${details ? ` - ${escapeHtml(details)}` : ''}</li>`;
      }).join('');
    }
  }

  function renderContact(socials, profile) {
    const container = document.getElementById('contact-links');
    if (container && Array.isArray(socials)) {
      const items = socials.filter(s => s.showInContact && s.url && s.url.trim() !== '');
      container.innerHTML = items.map(s => `
        <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-gray-400 hover:text-accent transition">
          ${socialIconMarkup(s.icon, 'w-5')}
          <span>${escapeHtml(socialLabel(s))}</span>
        </a>
      `).join('');
    }
    updateResumeLinks(currentLang);
  }

  function showFormFeedback(message, type) {
    const el = document.getElementById('form-feedback');
    if (!el) return;
    el.textContent = message;
    el.className = `form-feedback is-visible form-feedback--${type}`;
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const usesPlaceholder = form.action.includes(FORMSPREE_PLACEHOLDER);

    form.addEventListener('submit', async function (e) {
      const name = form.querySelector('#contact-name')?.value?.trim();
      const email = form.querySelector('#contact-email')?.value?.trim();
      const message = form.querySelector('#contact-message')?.value?.trim();
      if (!name || !email || !message) {
        e.preventDefault();
        showFormFeedback(t('contact.formError'), 'error');
        return;
      }

      if (usesPlaceholder) {
        e.preventDefault();
        const to = profileData?.personal?.email || 'hessi.kz@gmail.com';
        const subject = encodeURIComponent(`Portfolio: ${name}`);
        const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
        showFormFeedback(t('contact.formSuccess'), 'success');
        window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      }
    });
  }

  function startTypingEffect() {
    if (typingTimeout) clearTimeout(typingTimeout);
    const el = document.getElementById('hero-tagline');
    if (!el) return;
    const phrases = tArray('typingPhrases');
    if (phrases.length === 0) return;

    if (prefersReducedMotion()) {
      el.textContent = phrases[0];
      return;
    }

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

  function setMobileMenuOpen(open) {
    const btn = document.getElementById('mobile-menu-btn');
    const panel = document.getElementById('mobile-menu-panel');
    const closeBtn = document.getElementById('mobile-menu-close');
    if (!panel) return;
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    btn?.classList.toggle('is-open', open);
    btn?.setAttribute('aria-expanded', open ? 'true' : 'false');
    closeBtn?.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-menu-close');
    const panel = document.getElementById('mobile-menu-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => setMobileMenuOpen(true));
    closeBtn?.addEventListener('click', () => setMobileMenuOpen(false));
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => setMobileMenuOpen(false));
    });
    panel.addEventListener('click', (e) => {
      if (e.target === panel) setMobileMenuOpen(false);
    });
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      a.addEventListener('click', function (e) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        }
      });
    });
  }

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

  function destroyProjectMotion() {
    if (gsapContext) {
      gsapContext.revert();
      gsapContext = null;
    }
  }

  function initProjectMotion() {
    destroyProjectMotion();
    if (prefersReducedMotion() || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    gsapContext = gsap.context(() => {
      gsap.utils.toArray('.project-card-img').forEach((img) => {
        gsap.fromTo(
          img,
          { scale: 0.92, opacity: 0.85 },
          {
            scale: 1,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: img,
              start: 'top 88%',
              end: 'top 45%',
              scrub: 0.6,
            },
          }
        );
      });
    }, grid);
  }

  function updateUIText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
    updateThemeToggleLabel();
  }

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

  function getStoredTheme() {
    const params = new URLSearchParams(window.location.search);
    return params.get('theme') || localStorage.getItem('portfolio-theme') || 'default';
  }

  function applyTheme(theme) {
    const isIndustrial = theme === 'industrial';
    if (isIndustrial) {
      document.documentElement.setAttribute('data-theme', 'industrial');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('portfolio-theme', theme);
    updateThemeToggleLabel();
  }

  function updateThemeToggleLabel() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const isIndustrial = document.documentElement.getAttribute('data-theme') === 'industrial';
    btn.textContent = isIndustrial ? t('theme.toggleOff') : t('theme.toggle');
  }

  function initThemeToggle() {
    applyTheme(getStoredTheme());
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'industrial' ? 'default' : 'industrial';
      applyTheme(next);
      const url = new URL(window.location.href);
      if (next === 'industrial') url.searchParams.set('theme', 'industrial');
      else url.searchParams.delete('theme');
      window.history.replaceState({}, '', url.toString());
    });
  }

  const LANG_SWITCH_FADE_MS = 280;

  function initLangSwitcher() {
    const appContent = document.getElementById('app-content');
    const langLive = document.getElementById('lang-live');
    let switching = false;

    function updateSwitcherActive(lang) {
      [['lang-switch-fa', 'fa'], ['lang-switch-en', 'en'], ['lang-switch-fa-mobile', 'fa'], ['lang-switch-en-mobile', 'en']].forEach(([id, code]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('text-accent', lang === code);
        el.classList.toggle('font-medium', lang === code);
        el.classList.toggle('text-gray-400', lang !== code);
      });
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
        const portfolio25 = Array.isArray(projectsData) ? [] : (projectsData.portfolio25 || []);
        if (featured.length) {
          if (featuredProjectIndex >= featured.length) featuredProjectIndex = 0;
          renderProjects(featured);
        }
        if (portfolio25.length) renderPortfolio25(portfolio25);
      }
      initPortfolio25Toggle();
      setFooterYear();
      startTypingEffect();
      updateSwitcherActive(lang);
      if (langLive) langLive.textContent = translations[lang]?.a11y?.langChanged || '';
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

  function initWaveGrid() {
    const canvas = document.getElementById('wave-grid-canvas');
    const wrap = document.getElementById('wave-grid-wrap');
    if (!canvas || !wrap) return;

    if (prefersReducedMotion()) {
      wrap.classList.add('is-paused');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    const NUM_LINES = 100;
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
      return { x: Math.cos(angle) * influence, y: wave + Math.sin(angle) * influence };
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
        lines.push({
          x1,
          y1,
          x2: x1 + Math.cos(angle) * length,
          y2: y1 + Math.sin(angle) * length,
        });
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
          const tSeg = s / SEGMENTS_PER_LINE;
          const x = x1 + (x2 - x1) * tSeg;
          const y = y1 + (y2 - y1) * tSeg;
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
      if (!waveRunning) return;
      draw();
      waveRafId = requestAnimationFrame(loop);
    }

    function startWave() {
      if (waveRunning) return;
      waveRunning = true;
      wrap.classList.remove('is-paused');
      loop();
    }

    function stopWave() {
      waveRunning = false;
      if (waveRafId) cancelAnimationFrame(waveRafId);
      wrap.classList.add('is-paused');
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

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopWave();
      else if (!prefersReducedMotion()) startWave();
    });

    startWave();
  }

  function initWavySmoke() {
    const canvas = document.getElementById('smoke-canvas');
    const wrap = document.getElementById('hero-smoke');
    if (!canvas || !wrap) return;

    if (prefersReducedMotion()) {
      wrap.classList.add('is-paused');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let time = 0;
    let mouseX = 0.5;
    let mouseY = 0.5;

    const SMOKE_SPEED = 0.008;
    const BLUR_PX = 52;

    const puffs = [
      { nx: 0.18, ny: 0.28, rx: 0.22, ry: 0.18, phase: 0, speed: 0.9, color: 'rgba(42, 72, 78, 0.32)' },
      { nx: 0.78, ny: 0.22, rx: 0.2, ry: 0.16, phase: 1.4, speed: 0.75, color: 'rgba(34, 52, 62, 0.36)' },
      { nx: 0.55, ny: 0.62, rx: 0.26, ry: 0.14, phase: 2.1, speed: 0.65, color: 'rgba(48, 82, 86, 0.26)' },
      { nx: 0.32, ny: 0.72, rx: 0.18, ry: 0.2, phase: 0.6, speed: 0.85, color: 'rgba(38, 58, 66, 0.3)' },
      { nx: 0.88, ny: 0.58, rx: 0.16, ry: 0.17, phase: 3.2, speed: 0.7, color: 'rgba(52, 88, 90, 0.22)' },
    ];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawWavySmokeBlob(cx, cy, rx, ry, wobble) {
      const segments = 28;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const waveR =
          1 +
          Math.sin(t * 3 + wobble) * 0.08 +
          Math.sin(t * 5 - wobble * 1.3) * 0.05;
        const px = cx + Math.cos(t) * rx * waveR;
        const py = cy + Math.sin(t) * ry * waveR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    function draw() {
      time += SMOKE_SPEED;
      ctx.clearRect(0, 0, width, height);
      ctx.filter = `blur(${BLUR_PX}px)`;
      ctx.globalCompositeOperation = 'lighter';

      const parallaxX = (mouseX - 0.5) * width * 0.04;
      const parallaxY = (mouseY - 0.5) * height * 0.04;

      puffs.forEach((puff) => {
        const wobble = time * puff.speed + puff.phase;
        const cx =
          puff.nx * width +
          Math.sin(wobble) * width * 0.045 +
          Math.cos(wobble * 0.6) * width * 0.02 +
          parallaxX;
        const cy =
          puff.ny * height +
          Math.cos(wobble * 0.85) * height * 0.04 +
          Math.sin(wobble * 0.5) * height * 0.025 +
          parallaxY;
        const rx = puff.rx * Math.min(width, height) * (1 + Math.sin(wobble * 1.2) * 0.06);
        const ry = puff.ry * Math.min(width, height) * (1 + Math.cos(wobble * 0.9) * 0.05);

        ctx.fillStyle = puff.color;
        drawWavySmokeBlob(cx, cy, rx, ry, wobble);
      });

      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }

    function loop() {
      if (!smokeRunning) return;
      draw();
      smokeRafId = requestAnimationFrame(loop);
    }

    function startSmoke() {
      if (smokeRunning) return;
      smokeRunning = true;
      wrap.classList.remove('is-paused');
      loop();
    }

    function stopSmoke() {
      smokeRunning = false;
      if (smokeRafId) cancelAnimationFrame(smokeRafId);
      wrap.classList.add('is-paused');
    }

    function onMouseMove(e) {
      const w = width || window.innerWidth || 1;
      const h = height || window.innerHeight || 1;
      mouseX = e.clientX / w;
      mouseY = e.clientY / h;
    }

    const heroSection = document.getElementById('hero');

    resize();
    window.addEventListener('resize', resize);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
      if (heroSection) ro.observe(heroSection);
    }
    if (heroSection) {
      heroSection.addEventListener('mousemove', onMouseMove);
      heroSection.addEventListener('mouseleave', () => {
        mouseX = 0.5;
        mouseY = 0.5;
      });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopSmoke();
      else if (!prefersReducedMotion()) startSmoke();
    });

    startSmoke();
  }

  function renderAll() {
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
      const portfolio25 = Array.isArray(projectsData) ? [] : (projectsData.portfolio25 || []);
      if (featured.length) {
        featuredProjectIndex = getStoredFeaturedIndex(featured.length);
        renderProjects(featured);
      }
      if (portfolio25.length) renderPortfolio25(portfolio25);
    }
    initPortfolio25Toggle();
    setFooterYear();
    startTypingEffect();
  }

  async function init() {
    const [coreData, langEn, langFa] = await Promise.all([
      typeof loadPortfolioData === 'function'
        ? loadPortfolioData()
        : Promise.all([fetchJSON(PROFILE_URL), fetchJSON(PROJECTS_URL), fetchJSON(SOCIALS_URL)]).then(
            ([profile, projects, socials]) => ({ profile, projects, socials })
          ),
      fetchJSON(LANG_EN_URL),
      fetchJSON(LANG_FA_URL),
    ]);

    const { profile, projects, socials } = coreData || {};

    profileData = profile;
    projectsData = projects;
    socialsData = socials;
    translations.en = langEn || {};
    translations.fa = langFa || {};

    currentLang = getLangFromUrl();
    setLang(currentLang);
    updateUIText();
    renderAll();

    initMobileMenu();
    initSmoothScroll();
    initSectionSpy();
    initScrollAnimations();
    initContactForm();
    initLangSwitcher();
    initThemeToggle();
    initWaveGrid();
    initWavySmoke();

    const lang = currentLang;
    [['lang-switch-fa', 'fa'], ['lang-switch-en', 'en'], ['lang-switch-fa-mobile', 'fa'], ['lang-switch-en-mobile', 'en']].forEach(([id, code]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('text-accent', lang === code);
      el.classList.toggle('font-medium', lang === code);
      el.classList.toggle('text-gray-400', lang !== code);
    });
  }

  init();
})();
