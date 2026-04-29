# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class IconTest < ViewComponent::TestCase
    test 'icon validator returns Tailwind color class for valid color' do
      assert_equal 'text-[var(--pathogen-color-text-default)]', Pathogen::IconValidator::COLORS[:default]
      assert_equal 'text-[var(--pathogen-color-brand-600)]', Pathogen::IconValidator::COLORS[:primary]
      assert_equal 'text-[var(--pathogen-color-danger-500)]', Pathogen::IconValidator::COLORS[:danger]
    end

    test 'icon validator returns Tailwind size class for valid size' do
      assert_equal 'size-4', Pathogen::IconValidator::SIZES[:sm]
      assert_equal 'size-6', Pathogen::IconValidator::SIZES[:md]
      assert_equal 'size-8', Pathogen::IconValidator::SIZES[:lg]
      assert_equal 'size-10', Pathogen::IconValidator::SIZES[:xl]
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

    test 'icon renderer includes layout base classes' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:default, :md, nil)
      assert_match(/\binline-block\b/, classes)
      assert_match(/\bshrink-0\b/, classes)
    end

    test 'icon renderer includes color class in pathogen classes' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:primary, :md, nil)
      assert_match(/--pathogen-color-brand-600/, classes)
    end

    test 'icon renderer includes size class in pathogen classes' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:default, :lg, nil)
      assert_match(/\bsize-8\b/, classes)
    end

    test 'icon renderer uses token-based color utilities' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:default, :md, nil)
      assert_match(/text-\[var\(--pathogen-color-text-default\)\]/, classes)
    end

    test 'icon renderer uses Tailwind size utilities' do
      classes = Pathogen::IconRenderer.build_pathogen_classes(:default, :md, nil)
      assert_match(/\bsize-6\b/, classes)
    end
  end
end
