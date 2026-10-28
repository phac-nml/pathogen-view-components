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

examples = [
  { id: 'button', path: 'button', title: 'Buttons', source: File.join(CATALOG, 'examples/button.html.erb') },
  { id: 'tabs', path: 'tabs', title: 'Tabs', source: File.join(CATALOG, 'examples/tabs.html.erb') },
  { id: 'form', path: 'form', title: 'Form controls', source: File.join(CATALOG, 'examples/form.html.erb') },
  {
    id: 'link',
    path: 'link',
    title: 'Links',
    source: File.join(ROOT, 'test/components/previews/pathogen/link_preview/overview.html.erb')
  }
]

deferred_preview_templates = %w[
  button/accessibility
  button/overview
  data_grid/virtual_infinite_scroll
  tabs/turbo_frame_lazy_load
  tooltip/in_context
  tooltip/overview
].freeze

preview_templates = Dir[File.join(ROOT,
                                  'test/components/previews/pathogen/*_preview/**/*.html.erb')].filter_map do |source|
  component = File.basename(File.dirname(source)).delete_suffix('_preview')
  scenario = File.basename(source, '.html.erb')
  next if deferred_preview_templates.include?("#{component}/#{scenario}")
  next if component == 'link' && scenario == 'overview'

  component_title = component.split('_').map(&:capitalize).join(' ')
  scenario_title = scenario.tr('_', ' ').capitalize
  {
    id: "#{component}-#{scenario.tr('_', '-')}",
    path: "#{component}/#{scenario.tr('_', '-')}",
    title: "#{component_title}: #{scenario_title}",
    source:
  }
end

(examples + preview_templates).each do |example|
  id = example.fetch(:id)
  path = example.fetch(:path)
  title = example.fetch(:title)
  source = File.read(example.fetch(:source))
  rendered = ActionController::Base.renderer.render(inline: source, layout: false)
  frames = %w[light dark].map do |theme|
    filename = "#{id}-#{theme}.html"
    html = ERB.new(File.read(File.join(CATALOG, 'layout.html.erb'))).result(binding)
    File.write(File.join(CATALOG, 'public/examples', filename), html)
    <<~MARKDOWN
      ## #{theme.capitalize} preview

      <iframe title="#{title} — #{theme} preview" src="#{BASE}/examples/#{filename}" loading="lazy" style="display:block;width:100%;height:260px;border:1px solid currentColor;border-radius:4px;"></iframe>

      [Open #{theme} preview](#{BASE}/examples/#{filename})
    MARKDOWN
  end.join("\n")
  page = File.join(output, 'components', "#{path}.md")
  FileUtils.mkdir_p(File.dirname(page))
  File.write(page, <<~MARKDOWN)
    ---
    title: "#{title}"
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

puts "Rendered #{examples.size + preview_templates.size} examples in light/dark and three design-system documents (without Lookbook)."
