# Blog Editor

A Git-backed blog editor that saves posts as Markdown files directly to your GitHub repository. No database required — your posts live in version control.

## Features

- **WYSIWYG editor** — bold, italic, headings, lists, blockquotes, code blocks, links, images
- **GitHub API integration** — every save = a commit to your repo
- **Frontmatter management** — title, slug, date, excerpt, tags, draft status
- **Post dashboard** — list, create, edit, and delete posts
- **Zero backend** — runs entirely in the browser

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Run locally

```bash
npm run dev
```

### 3. Connect your GitHub repo

On first load you'll be prompted for:

- **Personal Access Token** — create at GitHub → Settings → Developer settings → Personal access tokens (Classic). Needs `repo` scope.
- **Owner** — your GitHub username or org name
- **Repository** — the repo name (must already exist)
- **Branch** — defaults to `main`
- **Posts folder** — the folder inside your repo where `.md` files will be stored (e.g. `posts`, `content/blog`)

### 4. Deploy

Deploy to Netlify or Vercel by pointing it at this folder:

```bash
npm run build
# Outputs to /dist
```

**Important:** Since this is a SPA with client-side routing, add a redirect rule:

- **Netlify**: Create a `public/_redirects` file: `/* /index.html 200`
- **Vercel**: It handles this automatically

## Post Format

Posts are saved as Markdown with YAML frontmatter:

```markdown
---
title: My First Post
slug: my-first-post
date: 2024-01-15
excerpt: A short description for listing pages
tags: writing, thoughts
---

Your post content here...
```

## Security Note

Your GitHub token is stored in `localStorage` in the browser. This is fine for a personal editor you run yourself, but don't share the deployed URL publicly — anyone who visits it could theoretically extract the token from their own browser session if they know where to look.

For team use, consider adding basic auth via Netlify Identity or similar.

## Connecting Your Public Blog

Your posts are Markdown files in your repo. Popular options for rendering them publicly:

- **Astro** — great Markdown support, fast, static
- **Next.js** — if you want React on the public side too  
- **Hugo** — very fast static site generator
- **Eleventy (11ty)** — flexible, minimal

All of these can read Markdown files from the `posts/` folder and render them as HTML pages. Let Claude know when you're ready to build the public-facing renderer!
