# frozen_string_literal: true

# A minimal rendering host: no Lookbook, demo app, server, or test framework.
ENV['RAILS_ENV'] = 'test'
require 'bundler/setup'
require 'rails'
require 'action_controller/railtie'
require 'action_view/railtie'
require 'erb'
require 'fileutils'

ROOT = File.expand_path('..', __dir__)
CATALOG = File.join(ROOT, 'catalog')
# Same CATALOG_BASE default as base.mjs, which Astro and Playwright read.
BASE = ENV.fetch('CATALOG_BASE', '/pathogen-view-components').chomp('/')

# Build-only Rails host for rendering the engine's components.
class CatalogApplication < Rails::Application
  config.root = ROOT
  config.eager_load = false
  config.secret_key_base = 'static-catalog-build-only'
  config.logger = Logger.new(nil)
end

require_relative '../lib/pathogen/view_components'
CatalogApplication.initialize!

output = File.join(CATALOG, 'src/content/docs')
FileUtils.mkdir_p(["#{output}/components", "#{output}/design-system", "#{CATALOG}/public/examples"])

{ 'button' => 'Buttons', 'tabs' => 'Tabs', 'form' => 'Form controls' }.each do |slug, title|
  source = File.read(File.join(CATALOG, 'examples', "#{slug}.html.erb"))
  rendered = ActionController::Base.renderer.render(inline: source, layout: false)
  frames = %w[light dark].map do |theme|
    filename = "#{slug}-#{theme}.html"
    html = ERB.new(File.read(File.join(CATALOG, 'layout.html.erb'))).result(binding)
    File.write(File.join(CATALOG, 'public/examples', filename), html)
    <<~MARKDOWN
      ## #{theme.capitalize} preview

      <iframe title="#{title} — #{theme} preview" src="#{BASE}/examples/#{filename}" loading="lazy" style="display:block;width:100%;height:260px;border:1px solid currentColor;border-radius:4px;"></iframe>

      [Open #{theme} preview](#{BASE}/examples/#{filename})
    MARKDOWN
  end.join("\n")
  File.write("#{output}/components/#{slug}.md", <<~MARKDOWN)
    ---
    title: #{title}
    ---

    Rendered from the actual Ruby components. Try the controls with a keyboard.

    #{frames}

    ## Usage

    ```erb
    #{source.rstrip}
    ```
  MARKDOWN
end

# Preserve the existing documents and their Lookbook page IDs without loading Lookbook.
documents = Dir[File.join(ROOT, 'docs/lookbook/design_system/*.md.erb')]
page_ids = documents.index_by do |path|
  "design-system-#{File.basename(path).sub(/^\d+-/, '').sub('.md.erb', '')}"
end
context = Object.new
exported_ids = %w[design-system-overview design-system-design-contract design-system-review-checklist]
context.define_singleton_method(:page_path) do |id|
  raise "Unknown documentation page: #{id}" unless page_ids.key?(id)

  if exported_ids.include?(id)
    "#{BASE}/design-system/#{id}/"
  else
    "https://github.com/phac-nml/pathogen-view-components/blob/main/#{page_ids.fetch(id).delete_prefix("#{ROOT}/")}"
  end
end
# Keep the spike to prose docs; token swatches need their own isolated styling.
exported_ids.each do |id|
  content = ERB.new(File.read(page_ids.fetch(id))).result(context.instance_eval { binding })
  # Starlight renders the frontmatter title as the page H1, so drop the document's own.
  content = content.sub(/\A(---\n.*?\n---\n)\s*# [^\n]*\n/m, '\\1')
  File.write("#{output}/design-system/#{id}.md", content)
end

puts 'Rendered three examples in light/dark and three design-system documents (without Lookbook).'
