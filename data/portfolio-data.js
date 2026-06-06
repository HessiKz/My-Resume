(function (global) {
  'use strict';

  const PATHS = {
    profile: 'data/profile.json',
    projects: 'data/projects.json',
    socials: 'data/socials.json',
  };

  function withVersion(url, version) {
    if (!version) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${encodeURIComponent(String(version))}`;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json();
  }

  /**
   * Loads profile, projects, and socials from the same JSON files as the site.
   * Bump profile.contentVersion whenever you change resume/portfolio data so
   * browsers and GitHub Pages pick up the latest copy for PDF export too.
   */
  async function loadPortfolioData() {
    const profile = await fetchJson(PATHS.profile);
    const version = profile && profile.contentVersion ? profile.contentVersion : '';

    const [projects, socials] = await Promise.all([
      fetchJson(withVersion(PATHS.projects, version)),
      fetchJson(withVersion(PATHS.socials, version)),
    ]);

    return { profile, projects, socials };
  }

  global.loadPortfolioData = loadPortfolioData;
})(typeof window !== 'undefined' ? window : globalThis);
