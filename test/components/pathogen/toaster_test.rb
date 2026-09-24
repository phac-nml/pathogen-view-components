# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ToasterTest < ViewComponent::TestCase
    test 'renders persistent polite and assertive live regions' do
      render_inline(Pathogen::Toaster.new) do
        '<li data-pathogen--toaster-target="toast">Saved</li>'.html_safe
      end

      assert_selector 'section[data-controller~="pathogen--toaster"][data-turbo-permanent="true"]'
      assert_selector 'ol#flashes[aria-live="polite"][aria-relevant="additions text"][aria-atomic="false"]'
      assert_selector 'div[data-pathogen--toaster-target="assertive"][role="alert"][aria-live="assertive"]',
                      visible: :all
    end

    test 'supports position presets and list id override' do
      render_inline(Pathogen::Toaster.new(position: :top_center, list_id: 'flash-stack')) do
        '<li data-pathogen--toaster-target="toast">Running sync</li>'.html_safe
      end

      assert_selector 'section.left-1\\/2.-translate-x-1\\/2.top-4'
      assert_selector 'ol#flash-stack'
    end

    test 'supports container anchored strategy and non-persistent mode' do
      render_inline(Pathogen::Toaster.new(strategy: :absolute, turbo_permanent: false)) do
        '<li data-pathogen--toaster-target="toast">Saved</li>'.html_safe
      end

      assert_selector 'section.absolute'
      assert_no_selector 'section[data-turbo-permanent]'
    end

    test 'applies max visible value for stack management' do
      render_inline(Pathogen::Toaster.new(max_visible: 4))

      assert_selector 'section[data-pathogen--toaster-max-visible-value="4"]'
    end

    test 'passes axe structural checks' do
      render_inline(Pathogen::Toaster.new) do
        '<li data-pathogen--toaster-target="toast">Saved</li>'.html_safe
      end

      assert_axe_structural_accessible rendered_content
    end
  end
end
