# Pathogen View Components — Lookbook Demo

A self-contained Rails app that runs [Lookbook](https://lookbook.build) so you can browse and interact with all Pathogen ViewComponents in the browser.

## Requirements

- Ruby 3.3+
- Bundler

## Getting started

```bash
cd demo
bundle install
bin/dev
```

This starts Rails on port 3001 and the Tailwind CSS watcher via foreman. Open `http://localhost:3001` — it redirects to `/lookbook` automatically.

## How it works

- **Previews** are in `../test/components/previews/pathogen/` (shared with the gem's test suite).
- **Preview layout** is `app/views/layouts/lookbook_preview.html.erb`, which loads Tailwind and Pathogen styles.
- **Port 3001** is hardcoded in `Procfile.dev` to avoid conflicts with other local Rails apps.

## Adding previews

Create a preview class in `test/components/previews/pathogen/` following the ViewComponent preview convention. For examples using `render_with_template`, add a matching `.html.erb` template in a subdirectory of the same name. Lookbook picks up changes automatically via its file watcher.
