# frozen_string_literal: true

require 'test_helper'

module Pathogen
  # Test suite for Pathogen::ViewHelper preset functionality
  class ViewHelperTest < ViewComponent::TestCase
    test 'raises error for invalid preset' do
      error = assert_raises(ArgumentError) do
        preset_config = Pathogen::Typography::Constants::PRESETS[:invalid_preset]
        raise ArgumentError, 'Unknown typography preset: invalid_preset' unless preset_config
      end

      assert_equal 'Unknown typography preset: invalid_preset', error.message
    end

    test 'article preset has correct configuration' do
      preset = Pathogen::Typography::Constants::PRESETS[:article]

      assert_equal 1, preset[:heading_level]
      assert_equal :default, preset[:heading_variant]
      assert_equal :muted, preset[:metadata_variant]
      assert_equal :default, preset[:spacing]
    end

    test 'card preset has correct configuration' do
      preset = Pathogen::Typography::Constants::PRESETS[:card]

      assert_equal 3, preset[:heading_level]
      assert_equal :default, preset[:heading_variant]
      assert_equal :compact, preset[:spacing]
    end

    test 'section preset has correct configuration' do
      preset = Pathogen::Typography::Constants::PRESETS[:section]

      assert_equal 2, preset[:heading_level]
      assert_equal :default, preset[:spacing]
    end

    test 'dialog preset has correct configuration' do
      preset = Pathogen::Typography::Constants::PRESETS[:dialog]

      assert_equal 2, preset[:heading_level]
      assert_equal :compact, preset[:spacing]
    end

    test 'form_section preset has correct configuration' do
      preset = Pathogen::Typography::Constants::PRESETS[:form_section]

      assert_equal 3, preset[:heading_level]
      assert_equal :compact, preset[:spacing]
    end

    test 'sidebar helper map includes sidebar component' do
      assert_equal 'Pathogen::Sidebar', Pathogen::ViewHelper::PATHOGEN_COMPONENT_HELPERS[:sidebar]
    end

    test 'sidebar boot helper emits storage key and html data attributes' do
      helper = ActionView::Base.empty
      helper.extend(Pathogen::ViewHelper)
      html = helper.pathogen_sidebar_boot_tag(id: 'lab-sidebar')

      assert_includes html, 'pathogen.sidebar.lab-sidebar.open'
      assert_includes html, 'data-pathogen-sidebar-open'
    end
  end
end
