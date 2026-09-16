# frozen_string_literal: true

require 'json'
require 'test_helper'

class ShippedFilesJavaScriptTest < ActiveSupport::TestCase
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
