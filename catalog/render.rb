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
# Fully generated output; clear stale pages (e.g. old per-scenario subdirectories) before regenerating.
FileUtils.rm_rf(["#{output}/components", "#{output}/design-system", "#{CATALOG}/public/examples"])
FileUtils.mkdir_p(["#{output}/components", "#{output}/design-system", "#{CATALOG}/public/examples"])

# Hand-curated, minimal usage snippets. These are the primary content for their component page;
# auto-discovered scenarios below become collapsed "More examples" instead of separate pages.
curated_examples = [
  { id: 'button', title: 'Buttons', source: File.join(CATALOG, 'examples/button.html.erb') },
  { id: 'tabs', title: 'Tabs', source: File.join(CATALOG, 'examples/tabs.html.erb') },
  { id: 'form', title: 'Form controls', source: File.join(CATALOG, 'examples/form.html.erb') },
  {
    id: 'link',
    title: 'Links',
    source: File.join(ROOT, 'test/components/previews/pathogen/link_preview/overview.html.erb')
  }
]
curated_ids = curated_examples.map { |example| example.fetch(:id) }

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
  # A curated example already covers this component; its "overview" scenario would duplicate it.
  next if curated_ids.include?(component) && scenario == 'overview'

  {
    component:,
    scenario:,
    title: scenario.tr('_', ' ').capitalize,
    source:
  }
end
scenarios_by_component = preview_templates.group_by { |template| template.fetch(:component) }

# Render one iframe pair per theme and return the markdown that embeds them.
render_frame = lambda do |theme, frame_id, title, heading, source|
  filename = "#{frame_id}-#{theme}.html"
  rendered = ActionController::Base.renderer.render(inline: source, layout: false)
  html = ERB.new(File.read(File.join(CATALOG, 'layout.html.erb'))).result_with_hash(
    theme:, title:, rendered:
  )
  File.write(File.join(CATALOG, 'public/examples', filename), html)
  <<~MARKDOWN
    #{heading}#{theme.capitalize} preview

    <iframe title="#{title} — #{theme} preview" src="#{BASE}/examples/#{filename}" loading="lazy" style="display:block;width:100%;height:260px;border:1px solid currentColor;border-radius:4px;"></iframe>

    [Open #{theme} preview](#{BASE}/examples/#{filename})
  MARKDOWN
end

render_frames = lambda do |frame_id, title, heading_level, source|
  heading = heading_level.positive? ? "#{'#' * heading_level} " : ''
  %w[light dark].map { |theme| render_frame.call(theme, frame_id, title, heading, source) }.join("\n")
end

component_details = lambda do |id|
  curated = curated_examples.find { |example| example.fetch(:id) == id }
  component_title = curated ? curated.fetch(:title) : id.split('_').map(&:capitalize).join(' ')
  scenarios = (scenarios_by_component[id] || []).sort_by do |s|
    [s.fetch(:scenario) == 'overview' ? 0 : 1, s.fetch(:scenario)]
  end

  if curated
    primary_source = File.read(curated.fetch(:source))
    extra_scenarios = scenarios
  else
    primary_scenario = scenarios.first
    primary_source = File.read(primary_scenario.fetch(:source))
    extra_scenarios = scenarios[1..] || []
  end

  [component_title, primary_source, extra_scenarios]
end

component_ids = (curated_ids + scenarios_by_component.keys).uniq
component_ids.each do |id|
  component_title, primary_source, extra_scenarios = component_details.call(id)

  frames = render_frames.call(id, component_title, 2, primary_source)
  more_examples = extra_scenarios.map do |scenario|
    scenario_source = File.read(scenario.fetch(:source))
    scenario_frames = render_frames.call("#{id}-#{scenario.fetch(:scenario).tr('_', '-')}",
                                         "#{component_title}: #{scenario.fetch(:title)}", 0, scenario_source)
    <<~MARKDOWN
      <details>
      <summary>#{scenario.fetch(:title)}</summary>

      #{scenario_frames}
      ```erb
      #{scenario_source.rstrip}
      ```

      </details>
    MARKDOWN
  end.join("\n")

  page = File.join(output, 'components', "#{id}.md")
  File.write(page, <<~MARKDOWN)
    ---
    title: "#{component_title}"
    ---

    Rendered from the actual Ruby components. Try the controls with a keyboard.

    #{frames}

    ## Usage

    ```erb
    #{primary_source.rstrip}
    ```
    #{"\n## More examples\n\n#{more_examples}" unless more_examples.empty?}
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

puts "Rendered #{component_ids.size} component pages
" \
  'and three design-system documents (without Lookbook).'
