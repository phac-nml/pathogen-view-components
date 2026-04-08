# frozen_string_literal: true

require 'test_helper'

module Pathogen
  # Test suite for Pathogen::Icon component and IconValidator
  class IconTest < ViewComponent::TestCase
    test 'icon validator returns Pathogen color class for valid color' do
      assert_equal 'pathogen-icon--color-default', Pathogen::IconValidator::COLORS[:default]
      assert_equal 'pathogen-icon--color-primary', Pathogen::IconValidator::COLORS[:primary]
      assert_equal 'pathogen-icon--color-danger', Pathogen::IconValidator::COLORS[:danger]
    end

    test 'icon validator returns Pathogen size class for valid size' do
      assert_equal 'pathogen-icon--size-sm', Pathogen::IconValidator::SIZES[:sm]
      assert_equal 'pathogen-icon--size-md', Pathogen::IconValidator::SIZES[:md]
      assert_equal 'pathogen-icon--size-lg', Pathogen::IconValidator::SIZES[:lg]
      assert_equal 'pathogen-icon--size-xl', Pathogen::IconValidator::SIZES[:xl]
    end

    test 'icon validator falls back to :default for unknown color' do
      assert_equal :default, Pathogen::IconValidator.validate_color(:nonexistent)
    end

    test 'icon validator falls back to :md for unknown size' do
      assert_equal :md, Pathogen::IconValidator.validate_size(:nonexistent)
    end

    test 'icon validator returns nil for nil color' do
      assert_nil Pathogen::IconValidator.validate_color(nil)
    end

    test 'icon validator normalizes icon name from symbol' do
      assert_equal 'arrow-up', Pathogen::IconValidator.normalize_icon_name(:arrow_up)
    end

    test 'icon validator raises for nil icon name' do
      assert_raises(ArgumentError) { Pathogen::IconValidator.normalize_icon_name(nil) }
    end

    test 'icon renderer includes pathogen-icon base class in pathogen classes' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:default, :md, nil)
      assert_match(/\bpathogen-icon\b/, classes)
    end

    test 'icon renderer includes color class in pathogen classes' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:primary, :md, nil)
      assert_match(/pathogen-icon--color-primary/, classes)
    end

    test 'icon renderer includes size class in pathogen classes' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:default, :lg, nil)
      assert_match(/pathogen-icon--size-lg/, classes)
    end

    test 'icon renderer does not include Tailwind color classes' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:default, :md, nil)
      assert_no_match(/text-slate-900|fill-slate-900|text-primary-600/, classes)
    end

    test 'icon renderer does not include Tailwind size classes' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:default, :md, nil)
      assert_no_match(/\bsize-4\b|\bsize-6\b|\bsize-8\b|\bsize-10\b/, classes)
    end
  end
end
