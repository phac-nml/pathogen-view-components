# frozen_string_literal: true

require 'test_helper'

class ShippedFilesDocumentationTest < ActiveSupport::TestCase
  DOCUMENTATION_FILES = [
    PROJECT_ROOT.join('README.md'),
    *PROJECT_ROOT.glob('docs/lookbook/design_system/*.md.erb')
  ].freeze
  # Names that docs may still mention on purpose (for example a migration table
  # that says "this old component is gone"). They are not loadable classes, so
  # list them here instead of treating them as broken references.
  REMOVED_COMPONENTS = {
    'Pathogen::Typography::Eyebrow' => 'documented as a removed component in the typography migration table'
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
        reference unless PROJECT_ROOT.join(reference).exist?
      end
    end.uniq

    assert_empty missing, "Docs use missing file paths: #{missing.join(', ')}"
  end
end
