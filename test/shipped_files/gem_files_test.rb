# frozen_string_literal: true

require 'fileutils'
require 'open3'
require 'rubygems/package'
require 'test_helper'
require 'tmpdir'

class ShippedFilesGemTest < ActiveSupport::TestCase
  # Exact paths host apps rely on. If the gemspec stops packaging one of these,
  # installs break in an obvious way.
  REQUIRED_FILES = %w[
    app/assets/stylesheets/pathogen_view_components.css
    config/importmap.rb
  ].freeze
  # Folders that must ship at least one file. We do not list every file here;
  # we only fail if a whole public area disappears from the built gem.
  REQUIRED_ROOTS = %w[
    app/assets/javascripts
    app/components
    config/locales
    lib
  ].freeze

  setup do
    @temporary_directory = Dir.mktmpdir('pathogen-view-components-gem-')
    @gem_path = File.join(@temporary_directory, 'pathogen_view_components.gem')
    stdout, stderr, status = Open3.capture3(
      'gem', 'build', 'pathogen_view_components.gemspec', '--output', @gem_path,
      chdir: PROJECT_ROOT.to_s
    )

    assert status.success?, "Could not build packaged gem:\n#{stdout}#{stderr}"

    @packaged_files = Gem::Package.new(@gem_path).contents
  end

  teardown do
    FileUtils.remove_entry(@temporary_directory) if @temporary_directory
  end

  test 'gem includes files used by applications' do
    missing_files = REQUIRED_FILES.reject { |path| @packaged_files.include?(path) }
    missing_roots = REQUIRED_ROOTS.reject do |root|
      @packaged_files.any? { |path| path == root || path.start_with?("#{root}/") }
    end

    assert_empty missing_files, "Gem is missing shipped files:\n#{missing_files.join("\n")}"
    assert_empty missing_roots, "Gem is missing shipped roots:\n#{missing_roots.join("\n")}"
  end
end
