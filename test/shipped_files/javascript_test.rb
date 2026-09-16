# frozen_string_literal: true

require 'json'
require 'test_helper'

class ShippedFilesJavaScriptTest < ActiveSupport::TestCase
  JAVASCRIPT_ROOT = PROJECT_ROOT.join('app/assets/javascripts')
  MAIN_JAVASCRIPT_FILE = JAVASCRIPT_ROOT.join('pathogen_view_components.js')

  test 'shipped controllers are imported, exported, and registered by the main entrypoint' do
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

  test 'README esbuild example aliases match the shipped host packages' do
    shipped_aliases = PROJECT_ROOT.join('scripts/pathogen-esbuild-options.mjs').read[
      /alias:\s*\{(?<block>.*?)\}/m,
      :block
    ]
    assert shipped_aliases, 'pathogen-esbuild-options.mjs must define an alias block'
    # Identity aliases (key mapped to the same quoted string) are the host-owned packages.
    shipped_host_packages = shipped_aliases
                            .scan(/(?:"([^"]+)"|(\w+)):\s*"([^"]+)"/)
                            .filter_map { |quoted_key, bare_key, value| value if (quoted_key || bare_key) == value }
                            .sort

    documented = PROJECT_ROOT.join('README.md').read[/const hostPackages = \[(?<list>[^\]]*)\]/, :list]
    assert documented, 'README esbuild example must define a hostPackages array'
    documented_host_packages = documented.scan(/"([^"]+)"/).flatten.sort

    assert_equal shipped_host_packages, documented_host_packages
  end
end
