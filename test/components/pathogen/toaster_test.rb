# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ToasterTest < ViewComponent::TestCase
    test 'renders persistent list with polite and assertive live regions' do
      render_inline(Pathogen::Toaster.new) do
        '<li data-pathogen--toaster-target="toast">Saved</li>'.html_safe
      end

      assert_selector 'section#flashes-toaster[data-controller~="pathogen--toaster"][data-turbo-permanent="true"]'
      assert_selector 'ol#flashes[aria-label="Notifications"]'
      assert_no_selector 'ol#flashes[aria-live]'
      assert_selector 'div[data-pathogen--toaster-target="polite"][role="status"][aria-live="polite"]',
                      visible: :all
      assert_selector 'div[data-pathogen--toaster-target="assertive"][role="alert"][aria-live="assertive"]',
                      visible: :all
    end

    test 'derives turbo-permanent id from the list id' do
      render_inline(Pathogen::Toaster.new(list_id: 'flash-stack'))

      assert_selector 'section#flash-stack-toaster[data-turbo-permanent="true"]'
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

    test 'corner positions use mobile-safe bounds and recover shrink-wrap on larger screens' do
      render_inline(Pathogen::Toaster.new(position: :bottom_right)) do
        '<li data-pathogen--toaster-target="toast">Saved</li>'.html_safe
      end

      assert_selector 'section.bottom-4.right-4.left-4.sm\\:left-auto.sm\\:w-max.max-w-md'
      assert_no_selector 'section.w-full'
    end

    test 'center positions keep full width for anchoring' do
      render_inline(Pathogen::Toaster.new(position: :bottom_center)) do
        '<li data-pathogen--toaster-target="toast">Saved</li>'.html_safe
      end

      assert_selector 'section.bottom-4.left-1\\/2.-translate-x-1\\/2.w-full.max-w-md.px-4'
    end

    test 'passes axe structural checks' do
      render_inline(Pathogen::Toaster.new) do
        '<li data-pathogen--toaster-target="toast">Saved</li>'.html_safe
      end

      assert_axe_structural_accessible rendered_content
    end
  end
end
