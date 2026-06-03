# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class TooltipTest < ViewComponent::TestCase
    test 'portal_aria_label uses I18n' do
      assert_equal I18n.t('pathogen.tooltip.portal.aria_label'), Pathogen::Tooltip.portal_aria_label
    end

    test 'renders with required parameters' do
      render_inline(Pathogen::Tooltip.new(
                      text: 'Sample tooltip',
                      id: 'tooltip-123'
                    ))

      assert_selector 'div#tooltip-123[role="tooltip"]'
      assert_text 'Sample tooltip'
      assert_selector 'div[data-pathogen--tooltip-target="tooltip"]'
    end

    test 'renders with default placement top' do
      render_inline(Pathogen::Tooltip.new(
                      text: 'Sample tooltip',
                      id: 'tooltip-123'
                    ))

      assert_selector 'div[data-placement="top"]'
      assert_selector 'div[data-pathogen-tooltip-root]'
    end

    %i[bottom left right].each do |placement|
      test "renders with custom placement #{placement}" do
        render_inline(Pathogen::Tooltip.new(
                        text: 'Sample tooltip',
                        id: 'tooltip-123',
                        placement: placement
                      ))

        assert_selector "div[data-placement=\"#{placement}\"]"
        assert_selector 'div[data-pathogen-tooltip-root]'
      end
    end

    test 'raises error for invalid placement value' do
      error = assert_raises(ArgumentError) do
        Pathogen::Tooltip.new(
          text: 'Sample tooltip',
          id: 'tooltip-123',
          placement: :invalid
        )
      end
      assert_equal 'placement must be one of: :top, :bottom, :left, :right', error.message
    end

    test 'renders with Tailwind tooltip layout classes' do
      render_inline(Pathogen::Tooltip.new(
                      text: 'Sample tooltip',
                      id: 'tooltip-123'
                    ))

      assert_selector 'div.fixed.z-50'
    end

    test 'starts with closed state' do
      render_inline(Pathogen::Tooltip.new(
                      text: 'Sample tooltip',
                      id: 'tooltip-123'
                    ))

      assert_selector 'div[data-state="closed"]'
    end

    test 'starts with aria-hidden true' do
      render_inline(Pathogen::Tooltip.new(
                      text: 'Sample tooltip',
                      id: 'tooltip-123'
                    ))

      assert_selector 'div[aria-hidden="true"]'
    end

    test 'renders arrow element with correct target and class' do
      render_inline(Pathogen::Tooltip.new(
                      text: 'Sample tooltip',
                      id: 'tooltip-123'
                    ))

      assert_selector 'span.absolute.size-2[data-pathogen--tooltip-target="arrow"]'
    end

    test 'forwards custom attributes via system_arguments' do
      render_inline(
        Pathogen::Tooltip.new(
          text: 'Sample tooltip',
          id: 'tooltip-123',
          class: 'custom-tooltip-class',
          data: { controller: 'custom-controller', action: 'click->custom#action' },
          aria: { label: 'Additional info', live: 'polite' }
        )
      )

      assert_selector 'div#tooltip-123.custom-tooltip-class'
      assert_selector 'div[data-controller="custom-controller"]'
      assert_selector 'div[data-action="click->custom#action"]'
      assert_selector 'div[aria-label="Additional info"]'
      assert_selector 'div[aria-live="polite"]'

      assert_selector 'div[role="tooltip"]'
      assert_selector 'div[data-pathogen--tooltip-target="tooltip"]'
      assert_selector 'div[data-placement="top"]'
    end
  end
end
