(function () {
  'use strict';

  const PROFILE_URL = 'data/profile.json';
  const PROJECTS_URL = 'data/projects.json';
  const SOCIALS_URL = 'data/socials.json';

  const LABELS = {
    fa: {
      back: 'بازگشت به سایت',
      print: 'ذخیره به صورت PDF',
      printHint: 'برای حذف آدرس از PDF، در پنجرهٔ چاپ گزینه «Headers and footers» را غیرفعال کنید.',
      about: 'درباره من',
      skills: 'مهارت‌ها',
      experience: 'سوابق کاری',
      projects: 'پروژه‌ها',
      otherProjects: 'سایر پروژه‌ها',
      education: 'تحصیلات',
      certifications: 'گواهینامه‌ها',
      languages: 'زبان‌ها'
    },
    en: {
      back: 'Back to site',
      print: 'Save as PDF',
      printHint: 'To remove the URL from the PDF, turn off "Headers and footers" in the print dialog.',
      about: 'About',
      skills: 'Skills',
      experience: 'Experience',
      projects: 'Projects',
      otherProjects: 'Other projects',
      education: 'Education',
      certifications: 'Certifications',
      languages: 'Languages'
    }
  };

  function getLang() {
    if (new URLSearchParams(window.location.search).get('lang') === 'en') return 'en';
    if (typeof document.referrer === 'string' && document.referrer.includes('lang=en')) return 'en';
    return 'fa';
  }

  function setPageLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  }

  function esc(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function render(profile, projects, socials, lang) {
    const isFa = lang === 'fa';
    const L = LABELS[lang];
    const p = profile.personal || {};
    const name = isFa && p.name_fa ? p.name_fa : (p.name || p.shortName);
    const title = isFa && p.title_fa ? p.title_fa : p.title;
    const location = isFa && p.location_fa ? p.location_fa : p.location;

    let html = '<header class="resume-header">';
    html += '<img src="assets/images/resume-img.jpeg" alt="" class="resume-photo" width="140" height="140" />';
    html += '<h1>' + esc(name) + '</h1>';
    html += '<p class="subtitle">' + esc(title) + '</p>';
    html += '<p class="contact-line">';
    html += '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a> · ';
    html += '<a href="tel:' + (p.phoneRaw || p.phone || '').replace(/\s/g, '') + '">' + esc(p.phone) + '</a> · ';
    html += esc(location);
    html += '</p>';
    if (socials && Array.isArray(socials) && socials.length) {
      const withUrl = socials.filter(function (s) {
        return s.url && s.url.trim() && s.label !== 'Email' && s.label !== 'Phone';
      });
      if (withUrl.length) {
        html += '<p class="contact-line contact-socials">';
        withUrl.forEach(function (s, i) {
          if (i) html += ' · ';
          html += '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a>';
        });
        html += '</p>';
      }
    }
    html += '</header>';

    const about = isFa && profile.about_fa ? profile.about_fa : profile.about;
    if (about) {
      html += '<section><h2>' + esc(L.about) + '</h2><p>' + esc(about) + '</p></section>';
    }

    const skills = isFa && profile.skills_fa ? profile.skills_fa : profile.skills;
    if (skills && typeof skills === 'object') {
      html += '<section><h2>' + esc(L.skills) + '</h2>';
      for (const [cat, list] of Object.entries(skills)) {
        if (!Array.isArray(list)) continue;
        html += '<div class="skill-cat">' + esc(cat) + '</div>';
        html += '<div class="skill-tags">';
        list.forEach(s => {
          const name = typeof s === 'string' ? s : (s && s.name ? s.name : '');
          const level = typeof s === 'object' && s && s.level ? s.level : '';
          html += '<span>' + esc(name) + (level ? ' <span class="skill-level">(' + esc(level) + ')</span>' : '') + '</span>';
        });
        html += '</div>';
      }
      html += '</section>';
    }

    const exp = profile.experience;
    if (exp && exp.length) {
      html += '<section><h2>' + esc(L.experience) + '</h2>';
      exp.forEach(job => {
        const role = isFa && job.role_fa ? job.role_fa : job.role;
        const company = isFa && job.company_fa ? job.company_fa : job.company;
        const period = isFa && job.period_fa ? job.period_fa : job.period;
        const points = isFa && job.points_fa ? job.points_fa : (job.points || []);
        html += '<div class="job">';
        html += '<div class="job-title">' + esc(role) + '</div>';
        html += '<div class="job-meta">' + esc(company) + ' · ' + esc(period) + '</div>';
        html += '<ul class="points">';
        points.forEach(pt => { html += '<li>' + esc(pt) + '</li>'; });
        html += '</ul></div>';
      });
      html += '</section>';
    }

    const featured = projects && projects.featured && projects.featured.length ? projects.featured : (Array.isArray(projects) ? projects : []);
    const other = projects && projects.other && projects.other.length ? projects.other : [];

    if (featured.length) {
      html += '<section><h2>' + esc(L.projects) + '</h2>';
      featured.forEach(proj => {
        const title = isFa && proj.title_fa ? proj.title_fa : proj.title;
        const desc = isFa && proj.description_fa ? proj.description_fa : (proj.description || '');
        const techs = Array.isArray(proj.technologies) ? proj.technologies : [];
        const links = proj.links || {};
        const github = (links.github || '').trim();
        const demo = (links.demo || '').trim();
        html += '<div class="job">';
        html += '<div class="job-title">' + esc(title) + '</div>';
        if (desc) html += '<p class="job-meta">' + esc(desc) + '</p>';
        if (techs.length) html += '<div class="skill-tags" style="margin-top:0.35rem">' + techs.map(t => '<span>' + esc(t) + '</span>').join('') + '</div>';
        if (github || demo) {
          html += '<p class="job-meta" style="margin-top:0.35rem">';
          if (github) html += '<a href="' + esc(github) + '" target="_blank" rel="noopener">' + (isFa ? 'گیت‌هاب' : 'GitHub') + '</a>';
          if (github && demo) html += ' · ';
          if (demo) html += '<a href="' + esc(demo) + '" target="_blank" rel="noopener">' + (isFa ? 'دمو' : 'Demo') + '</a>';
          html += '</p>';
        }
        html += '</div>';
      });
      html += '</section>';
    }

    if (other.length) {
      html += '<section><h2>' + esc(L.otherProjects) + '</h2><p class="job-meta">';
      other.forEach((proj, i) => {
        const title = isFa && proj.title_fa ? proj.title_fa : proj.title;
        const github = proj.links && proj.links.github ? proj.links.github.trim() : '';
        if (i) html += ' · ';
        if (github) html += '<a href="' + esc(github) + '" target="_blank" rel="noopener">' + esc(title) + '</a>';
        else html += esc(title);
      });
      html += '</p></section>';
    }

    const edu = profile.education;
    if (edu && edu.length) {
      html += '<section><h2>' + esc(L.education) + '</h2>';
      edu.forEach(ed => {
        const degree = isFa && ed.degree_fa ? ed.degree_fa : ed.degree;
        const institution = isFa && ed.institution_fa ? ed.institution_fa : ed.institution;
        const period = isFa && ed.period_fa ? ed.period_fa : ed.period;
        html += '<div class="edu-item">';
        html += '<div class="edu-degree">' + esc(degree) + '</div>';
        html += '<div class="edu-meta">' + esc(institution) + ' · ' + esc(period) + '</div>';
        html += '</div>';
      });
      html += '</section>';
    }

    const certs = profile.certifications;
    if (certs && certs.length) {
      html += '<section><h2>' + esc(L.certifications) + '</h2><ul class="cert-list">';
      certs.forEach(c => {
        const name = isFa && c.name_fa ? c.name_fa : c.name;
        const issuer = isFa && c.issuer_fa ? c.issuer_fa : c.issuer;
        const date = isFa && c.date_fa ? c.date_fa : c.date;
        const link = c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(name) + '</a>' : esc(name);
        html += '<li>' + link + ' – ' + esc(issuer) + ' (' + esc(date) + ')</li>';
      });
      html += '</ul></section>';
    }

    const langs = profile.languages;
    if (langs && langs.length) {
      html += '<section><h2>' + esc(L.languages) + '</h2><ul class="lang-list">';
      langs.forEach(l => {
        const name = isFa && l.name_fa ? l.name_fa : l.name;
        const level = isFa && l.level_fa ? l.level_fa : l.level;
        const details = isFa && l.details_fa ? l.details_fa : l.details;
        html += '<li><strong>' + esc(name) + '</strong>: ' + esc(level) + (details ? ' – ' + esc(details) : '') + '</li>';
      });
      html += '</ul></section>';
    }

    return html;
  }

  function setToolbarLabels(lang) {
    const L = LABELS[lang];
    const backLink = document.getElementById('toolbar-back');
    const backText = document.getElementById('toolbar-back-text');
    const printText = document.getElementById('toolbar-print-text');
    const backIcon = backLink ? backLink.querySelector('i.fas') : null;
    const printHint = document.getElementById('resume-print-hint');
    if (backLink) backLink.href = lang === 'en' ? 'index.html?lang=en' : 'index.html';
    if (backText) backText.textContent = L.back;
    if (printText) printText.textContent = L.print;
    if (backIcon) backIcon.className = lang === 'en' ? 'fas fa-arrow-left' : 'fas fa-arrow-right';
    if (printHint) { printHint.textContent = L.printHint; printHint.setAttribute('aria-hidden', 'false'); }
  }

  async function init() {
    const lang = getLang();
    setPageLang(lang);
    setToolbarLabels(lang);
    document.title = lang === 'fa' ? 'رزومه | محمد حسام کاظمی' : 'Resume | Mohammad Hesam Kazemi';

    const container = document.getElementById('resume-body');
    if (!container) return;

    container.innerHTML = lang === 'fa' ? '<p class="text-center text-gray-500">در حال بارگذاری…</p>' : '<p class="text-center text-gray-500">Loading…</p>';

    try {
      const [profileRes, projectsRes, socialsRes] = await Promise.all([fetch(PROFILE_URL), fetch(PROJECTS_URL), fetch(SOCIALS_URL)]);
      const profile = profileRes.ok ? await profileRes.json() : null;
      const projects = projectsRes.ok ? await projectsRes.json() : null;
      const socials = socialsRes.ok ? await socialsRes.json() : null;
      if (profile) {
        container.innerHTML = render(profile, projects, socials, lang);
      } else {
        container.innerHTML = lang === 'fa' ? '<p class="text-center text-gray-500">امکان بارگذاری رزومه وجود نداشت.</p>' : '<p class="text-center text-gray-500">Could not load resume.</p>';
      }
    } catch (e) {
      container.innerHTML = lang === 'fa' ? '<p class="text-center text-gray-500">امکان بارگذاری رزومه وجود نداشت.</p>' : '<p class="text-center text-gray-500">Could not load resume.</p>';
    }

    const printBtn = document.getElementById('toolbar-print');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  }

  init();
})();
