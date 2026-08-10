# frozen_string_literal: true

require 'view_component_test_case'

class ShippedFilesDocumentationTest < ViewComponentTestCase
  DOCUMENTATION_FILES = [
    PROJECT_ROOT.join('README.md'),
    *PROJECT_ROOT.glob('docs/lookbook/design_system/*.md.erb'),
    *PROJECT_ROOT.glob('app/components/**/*.rb')
  ].freeze
  REMOVED_COMPONENTS = {
    'Pathogen::Typography::Eyebrow' => 'documented as a removed component in the typography migration table'
  }.freeze
  EXAMPLE_APP_PATHS = {
    'app/controllers/projects_controller.rb' => 'example host application controller',
    'app/views/projects/details.turbo_stream.erb' => 'example host application response template'
  }.freeze
  FILE_PATH_PATTERN = %r{(?<![.\w/])(?:app|config|docs|lib|scripts|test)/[A-Za-z0-9_./-]+}

  test 'component names in docs exist' do
    references = DOCUMENTATION_FILES.flat_map do |path|
      path.read.scan(/Pathogen(?:::[A-Z][A-Za-z0-9_]*)+/)
    end.uniq

    missing = references.reject do |reference|
      REMOVED_COMPONENTS.key?(reference) || reference.safe_constantize
    end

    assert_empty missing, "Docs use missing components: #{missing.join(', ')}"
  end

  test 'file paths in docs exist' do
    missing = DOCUMENTATION_FILES.flat_map do |documentation_file|
      documentation_file.read.scan(FILE_PATH_PATTERN).filter_map do |reference|
        reference = reference.delete_suffix('.')
        next if EXAMPLE_APP_PATHS.key?(reference)

        reference unless PROJECT_ROOT.join(reference).exist?
      end
    end.uniq

    assert_empty missing, "Docs use missing file paths: #{missing.join(', ')}"
  end

  test 'README Tabs example works with the current component' do
    tabs_section = PROJECT_ROOT.join('README.md').read[/^#### Tabs\n(?<section>.*?)(?=^#### |^### |\z)/m, :section]
    assert tabs_section, 'README must include a Tabs section'

    example = tabs_section[/```erb\n(?<example>.*?)```/m, :example]
    assert example, 'README Tabs section must include an ERB example'

    rendered = @controller.view_context.render(inline: example)

    assert_includes rendered, 'role="tablist"'
    assert_includes rendered, 'role="tabpanel"'
  end
end
