# Pathogen View Components — Lookbook Demo

A self-contained Rails app that runs [Lookbook](https://lookbook.build) so you can browse and interact with all Pathogen ViewComponents in the browser.

## Requirements

- Ruby 3.3+
- Bundler
- pnpm (for the CSS build pipeline)

## Getting started

```bash
cd demo
bundle install
bin/dev
```

This starts Rails on port 3001 plus two CSS watchers via Foreman (Pathogen gem CSS and demo Tailwind CSS). Open `http://localhost:3001` — it redirects to `/lookbook` automatically.

## How it works

- **Previews** are in `../test/components/previews/pathogen/` (shared with the gem's test suite).
- **Preview layout** is `app/views/layouts/lookbook_preview.html.erb`, which loads both `pathogen_view_components.css` (gem CSS) and `tailwind.css` (demo CSS).
- **Gem CSS (host-app surface)** is `../app/assets/stylesheets/pathogen_view_components.css`. Build with `pnpm --dir .. run build:css` or watch with `pnpm --dir .. run build:css:watch` from the repo root.
- **Demo CSS (Lookbook-only)** is compiled from `app/assets/tailwind/application.css` into `app/assets/builds/tailwind.css` by `bin/rails tailwindcss:build` / `bin/rails tailwindcss:watch`.
- **Port 3001** is hardcoded in `Procfile.dev` to avoid conflicts with other local Rails apps.

## CSS development

`Procfile.dev` runs two CSS processes:

- `pathogen-css`: `pnpm --dir .. run build:css:watch` (builds `../app/assets/stylesheets/pathogen_view_components.css` for component styles shared with host apps).
- `tailwindcss`: `bin/rails tailwindcss:watch` (builds `app/assets/builds/tailwind.css` for Lookbook preview/layout utilities).

## Adding previews

Create a preview class in `test/components/previews/pathogen/` following the ViewComponent preview convention. For examples using `render_with_template`, add a matching `.html.erb` template in a subdirectory of the same name. Lookbook picks up changes automatically via its file watcher.
