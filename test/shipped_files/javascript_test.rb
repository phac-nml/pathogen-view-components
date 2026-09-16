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
end
