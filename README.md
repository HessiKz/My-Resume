# Hesam Kazemi – Personal Portfolio

A static, single-page portfolio site for **Mohammad Hesam Kazemi** (Full Stack Developer). Built with HTML5, CSS3, and vanilla JavaScript, styled with Tailwind CSS (CDN). Content is driven by JSON files so you can add or edit projects and social links without touching the layout code.

## Deployment on GitHub Pages

1. **Push this folder to a GitHub repository**
   - Create a new repo (e.g. `HessiKz.github.io` for a user site, or any repo name for a project site).
   - Push the contents of this project (including `index.html`, `data/`, `assets/`, `style.css`, `script.js`).

2. **Enable GitHub Pages**
   - Go to **Settings → Pages**.
   - Under **Source**, choose **Deploy from a branch**.
   - Select branch **main** (or your default branch) and folder **/ (root)**.
   - Save. The site will be available at `https://<username>.github.io/<repo>/` (or `https://<username>.github.io/` for a user site).

3. **Custom domain (optional)**
   - In the same **Pages** settings, set **Custom domain** to your domain and follow GitHub’s DNS instructions (CNAME or A records).

No build step is required; the site works as static files.

## Customizing content

### Projects (`data/projects.json`)

Add as many projects as you want. Each item can have:

- `title` – Project name  
- `description` – Short summary  
- `technologies` – Array of tech labels (e.g. `["React", "Node.js"]`)  
- `links` – `github` and/or `demo` URLs (leave `""` if you’ll add later)  
- `image` – Optional image URL; leave `""` to use the default placeholder  

Example:

```json
{
  "title": "My App",
  "description": "A short description.",
  "technologies": ["React", "TypeScript"],
  "links": { "github": "https://github.com/HessiKz/my-app", "demo": "https://myapp.com" },
  "image": ""
}
```

### Social & contact links (`data/socials.json`)

Add as many entries as you want. Each can have:

- `label` – Display name (e.g. "GitHub", "LinkedIn")  
- `url` – Full URL (leave `""` to hide the link)  
- `icon` – Font Awesome name: `github`, `linkedin`, `envelope`, `phone`, `twitter`, etc.  
- `showInHero` – `true` to show in the hero section  
- `showInContact` – `true` to show in the Contact section  

Entries with an empty `url` are not rendered.

### Profile (`data/profile.json`)

Edit personal info, about text, skills (grouped), experience, education, certifications, languages, and `resumeUrl`. The **Download Resume** button uses `resumeUrl` (default: `assets/resume.pdf`). Add your PDF at `assets/resume.pdf` or point `resumeUrl` to another path or URL.

### Contact form (Formspree)

The contact form is set up for [Formspree](https://formspree.io/).

1. Sign up at Formspree and create a form.
2. Copy your form ID (e.g. `xyzabcde`).
3. In `index.html`, find the contact form and set the `action` to your endpoint:

   ```html
   action="https://formspree.io/f/YOUR_FORM_ID"
   ```

   Replace `YOUR_FORM_ID` with your actual form ID.

## Resume page

**`resume.html`** shows your full resume (content from `data/profile.json`) on a simple white page. Use it for viewing and printing.

- **URL:** `resume.html` (Persian) or `resume.html?lang=en` (English).
- **Top bar:** “Back to site”, “Download Resume (PDF)” (links to `assets/resume.pdf`), and “Save as PDF” (opens the print dialog so visitors can choose “Save as PDF”).
- If you add **`assets/resume.pdf`**, the “Download Resume (PDF)” button will offer that file. Otherwise visitors can use “Save as PDF” to export the page as PDF from the browser.

From the main site, the “Download Resume” button in the Contact section links to this resume page (with the current language).

## Project structure

```
├── index.html          # Single-page portfolio
├── resume.html         # Full resume page (white, print-friendly)
├── style.css           # Portfolio theme and animations
├── resume.css          # Resume page and print styles
├── script.js           # Portfolio: data loading, i18n, nav, etc.
├── resume.js           # Resume page: load profile, render, print
├── data/
│   ├── profile.json    # About, skills, experience, education, etc.
│   ├── projects.json   # Featured projects (add as many as you like)
│   ├── socials.json    # Social/contact links (add as many as you like)
│   ├── lang-en.json    # English UI strings
│   └── lang-fa.json    # Persian UI strings
├── assets/
│   ├── images/         # profile-placeholder.svg, project-placeholder.svg
│   └── resume.pdf      # Add your PDF resume here (optional)
└── README.md
```

## Browser support

Targets modern browsers (Chrome, Firefox, Safari, Edge). Uses smooth scrolling, `IntersectionObserver`, and ES6+ JavaScript.
