# frozen_string_literal: true

require 'fileutils'
require 'open3'
require 'rubygems/package'
require 'test_helper'
require 'tmpdir'

class ShippedFilesGemTest < ActiveSupport::TestCase
  REQUIRED_GLOBS = %w[
    app/components/**/*
    app/helpers/**/*
    app/assets/javascripts/**/*
    config/locales/**/*
    lib/**/*
  ].freeze
  REQUIRED_FILES = %w[
    app/assets/stylesheets/pathogen_view_components.css
    config/importmap.rb
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
    expected_files = REQUIRED_GLOBS.flat_map do |pattern|
      PROJECT_ROOT.glob(pattern).select(&:file?).map { |path| path.relative_path_from(PROJECT_ROOT).to_s }
    end
    expected_files.concat(REQUIRED_FILES)

    missing_files = expected_files.uniq.sort - @packaged_files

    assert_empty missing_files, "Gem is missing files used by applications:\n#{missing_files.join("\n")}"
  end
end
