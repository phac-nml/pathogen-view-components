# frozen_string_literal: true

require 'json'
require 'test_helper'
require 'yaml'

class ShippedFilesJavaScriptTest < ActiveSupport::TestCase
  JAVASCRIPT_ROOT = PROJECT_ROOT.join('app/assets/javascripts')
  MAIN_JAVASCRIPT_FILE = JAVASCRIPT_ROOT.join('pathogen_view_components.js')

  class ImportmapPins
    attr_reader :pins

    def initialize
      @pins = {}
    end

    def pin(name, to:, **)
      @pins[name] = to
    end
  end

  test 'every shipped JavaScript file has an importmap pin' do
    expected_pins = JAVASCRIPT_ROOT.glob('**/*.js').to_h do |path|
      relative_path = path.relative_path_from(JAVASCRIPT_ROOT).to_s
      [relative_path.delete_suffix('.js'), relative_path]
    end

    assert_equal expected_pins, local_importmap_pins
  end

  test 'shipped controllers are imported, exported, registered, and pinned' do
    source = MAIN_JAVASCRIPT_FILE.read
    imports = source.scan(/import\s+(\w+)\s+from\s+"([^"]+)"/).to_h
    registrations = source.scan(/application\.register\("([^"]+)",\s*(\w+)\)/).to_h
    exports = source.scan(/export\s*\{([^}]+)\}/m).flat_map { |match| match.first.split(',') }.map(&:strip)

    expected_imports = {}
    expected_registrations = {}

    JAVASCRIPT_ROOT.glob('pathogen_view_components/*_controller.js').each do |path|
      module_name = path.relative_path_from(JAVASCRIPT_ROOT).to_s.delete_suffix('.js')
      basename = path.basename('.js').to_s.delete_suffix('_controller')
      class_name = "#{basename.camelize}Controller"
      expected_imports[class_name] = module_name
      expected_registrations["pathogen--#{basename.dasherize}"] = class_name
    end

    assert_equal expected_imports, imports
    assert_equal expected_registrations, registrations
    assert_empty expected_imports.keys - exports
    assert_includes exports, 'registerPathogenControllers'
    assert_empty expected_imports.values - local_importmap_pins.keys
  end

  test 'JavaScript imports from this gem have importmap pins' do
    local_imports = JAVASCRIPT_ROOT.glob('**/*.js').flat_map do |path|
      path.read.scan(%r{from\s+"(pathogen_view_components(?:/[^"]+)?)"}).flatten
    end.uniq

    assert_empty local_imports - local_importmap_pins.keys
  end

  test 'importmap package versions match the pnpm lockfile' do
    assert_equal locked_external_versions, external_importmap_versions
  end

  test 'README dependency versions match package.json' do
    package = JSON.parse(PROJECT_ROOT.join('package.json').read)
    package_requirements = package.fetch('dependencies').merge(package.fetch('peerDependencies'))
    dependency_section = PROJECT_ROOT.join('README.md').read[
      /^JavaScript dependencies.*?\n(?<section>.*?)(?=^## )/m,
      :section
    ]
    assert dependency_section, 'README must include a JavaScript dependencies section'
    documented_requirements = dependency_section.scan(/^- `([^`]+)` \*\*([^*]+)\*\*/).to_h

    assert_equal package_requirements, documented_requirements
  end

  test 'README controller example uses the main JavaScript file' do
    registration_section = PROJECT_ROOT.join('README.md').read[
      /^### Controller Registration\n(?<section>.*?)(?=^### |\z)/m,
      :section
    ]
    assert registration_section, 'README must include a Controller Registration section'

    example = registration_section[/```javascript\n(?<example>.*?)```/m, :example]
    assert example, 'README Controller Registration section must include a JavaScript example'
    assert_match(
      /import \{ registerPathogenControllers \} from "pathogen_view_components";/,
      example
    )
    assert_match(/^registerPathogenControllers\(application\);$/, example)
  end

  private

  def importmap_pins
    collector = ImportmapPins.new
    collector.instance_eval(PROJECT_ROOT.join('config/importmap.rb').read, 'config/importmap.rb')
    collector.pins
  end

  def local_importmap_pins
    importmap_pins.reject { |_name, target| target.start_with?('http') }
  end

  def external_importmap_versions
    importmap_pins.filter_map do |name, target|
      next unless target.start_with?('https://cdn.jsdelivr.net/npm/')

      match = target.match(%r{/npm/(?<package>@[^/]+/[^@]+|[^@/]+)@(?<version>[^/]+)/})
      [name, match[:version]] if match
    end.to_h
  end

  def locked_external_versions
    lockfile = YAML.safe_load(PROJECT_ROOT.join('pnpm-lock.yaml').read)
    dependencies = lockfile.dig('importers', '.', 'dependencies')
    versions = locked_direct_versions(dependencies)
    versions.merge!(locked_floating_versions(lockfile, versions.fetch('@floating-ui/dom')))
  end

  def locked_direct_versions(dependencies)
    {
      'uuid' => resolved_version(dependencies.fetch('uuid').fetch('version')),
      '@floating-ui/dom' => resolved_version(dependencies.fetch('@floating-ui/dom').fetch('version'))
    }
  end

  def locked_floating_versions(lockfile, dom_version)
    dependencies = lockfile.dig('snapshots', "@floating-ui/dom@#{dom_version}", 'dependencies')
    utils_version = resolved_version(dependencies.fetch('@floating-ui/utils'))

    {
      '@floating-ui/core' => resolved_version(dependencies.fetch('@floating-ui/core')),
      '@floating-ui/utils' => utils_version,
      '@floating-ui/utils/dom' => utils_version
    }
  end

  def resolved_version(version)
    version.to_s.split('(', 2).first
  end
end
