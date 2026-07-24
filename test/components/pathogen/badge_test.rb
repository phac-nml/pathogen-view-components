# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class BadgeTest < ViewComponent::TestCase
    test 'renders neutral badge by default with required text' do
      render_inline(Pathogen::Badge.new(text: 'Queued'))

      assert_selector 'span[data-view-component]'
      assert_text 'Queued'
      assert_includes root_class_list, 'bg-[var(--pvc-color-surface-muted)]'
      assert_includes root_class_list, 'whitespace-nowrap'
      assert_includes root_class_list, 'rounded-[var(--pvc-radius-control)]'
      assert_includes root_class_list, 'text-[length:var(--type-meta)]'
      assert_no_selector '[role="status"]'
    end

    Pathogen::Badge::TONE_OPTIONS.each do |tone|
      test "renders #{tone} tone classes" do
        render_inline(Pathogen::Badge.new(text: tone.to_s.capitalize, tone: tone))

        distinctive = Pathogen::Badge::TONE_CLASSES.fetch(tone).split.find { |token| token.start_with?('bg-') }

        assert_includes root_class_list, distinctive
        assert_text tone.to_s.capitalize
      end
    end

    test 'success soft fill uses readable text colour for AA contrast' do
      render_inline(Pathogen::Badge.new(text: 'Ready', tone: :success))

      assert_includes root_class_list, 'text-[var(--pvc-color-text)]'
      assert_includes root_class_list, 'bg-[color-mix(in_oklab,var(--pvc-color-success)_20%,var(--pvc-color-surface))]'
      assert_not_includes root_class_list, 'text-[var(--pvc-color-success)]'
    end

    test 'strips surrounding whitespace from text' do
      render_inline(Pathogen::Badge.new(text: '  Ready  '))

      assert_equal 'Ready', page.find('span[data-view-component] span').text
    end

    test 'raises when text is blank' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Badge.new(text: '   '))
      end

      assert_equal 'text is required', error.message
    end

    test 'raises when text is nil' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Badge.new(text: nil))
      end

      assert_equal 'text is required', error.message
    end

    test 'falls back to neutral for invalid tone when fallback_raises is disabled' do
      original_fallback_raises = Pathogen::FetchOrFallbackHelper.fallback_raises
      Pathogen::FetchOrFallbackHelper.fallback_raises = false
      begin
        render_inline(Pathogen::Badge.new(text: 'Legacy', tone: :fuchsia))

        assert_includes root_class_list, 'bg-[var(--pvc-color-surface-muted)]'
        assert_text 'Legacy'
      ensure
        Pathogen::FetchOrFallbackHelper.fallback_raises = original_fallback_raises
      end
    end

    test 'raises for invalid tone when fallback_raises is enabled' do
      error = assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) do
        render_inline(Pathogen::Badge.new(text: 'Legacy', tone: :fuchsia))
      end

      assert_match(/invalid value/i, error.message)
    end

    test 'renders leading visual as decorative beside text' do
      render_inline(Pathogen::Badge.new(text: 'Required', tone: :accent)) do |badge|
        badge.with_leading_visual { '<svg data-test-icon="asterisk"></svg>'.html_safe }
      end

      assert_selector 'span[aria-hidden="true"] svg[data-test-icon="asterisk"]'
      assert_text 'Required'
    end

    test 'merges custom classes via classes argument' do
      render_inline(Pathogen::Badge.new(text: 'Custom', classes: 'token-status'))

      assert_includes root_class_list, 'token-status'
      assert_text 'Custom'
    end

    test 'raises when class argument is provided' do
      %i[class Class CLASS].each do |class_key|
        error = assert_raises(ArgumentError) do
          render_inline(Pathogen::Badge.new(text: 'Custom', class_key => 'nope'))
        end

        assert_match(/`class` is an invalid argument/i, error.message)
      end
    end

    test 'passes test_selector through in non-production' do
      render_inline(Pathogen::Badge.new(text: 'Ready', test_selector: 'export-status'))

      assert_selector '[data-test-selector="export-status"]', text: 'Ready'
    end

    test 'does not set role status by default' do
      render_inline(Pathogen::Badge.new(text: 'Ready'))

      assert_nil page.find('span[data-view-component]')['role']
    end

    test 'allows host-opted live status role via system arguments' do
      render_inline(Pathogen::Badge.new(text: 'Ready', role: 'status'))

      assert_selector 'span[role="status"]', text: 'Ready'
    end

    test 'rejects tabindex because badges are not focusable' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Badge.new(text: 'Ready', tabindex: 0))
      end

      assert_match(/`tabindex` is an invalid argument/i, error.message)
    end

    test 'rejects interactive roles because badges are not controls' do
      %w[button Button BUTTON].each do |role|
        error = assert_raises(ArgumentError) do
          render_inline(Pathogen::Badge.new(text: 'Ready', role: role))
        end

        assert_match(/interactive role/i, error.message)
      end
    end

    test 'rejects href because badges are not links' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Badge.new(text: 'Ready', href: '/status'))
      end

      assert_match(/`href` is an invalid argument/i, error.message)
    end

    test 'rejects direct event handler attributes' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Badge.new(text: 'Ready', onclick: 'submitBadge()'))
      end

      assert_match(/event handler/i, error.message)
    end

    test 'rejects Stimulus actions in nested data arguments' do
      %i[action Action ACTION].each do |action_key|
        error = assert_raises(ArgumentError) do
          render_inline(Pathogen::Badge.new(text: 'Ready', data: { action_key => 'click->badge#activate' }))
        end

        assert_match(/Stimulus action/i, error.message)
      end
    end

    test 'rejects direct Stimulus action attributes' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Badge.new(text: 'Ready', 'data-action': 'click->badge#activate'))
      end

      assert_match(/Stimulus action/i, error.message)
    end

    test 'allows non-interactive Stimulus metadata' do
      render_inline(Pathogen::Badge.new(text: 'Ready', data: { controller: 'status', status_target: 'badge' }))

      assert_selector(
        'span[data-controller="status"][data-status-target="badge"]', text: 'Ready'
      )
    end

    test 'view helper maps pathogen_badge to Pathogen::Badge' do
      assert_equal 'Pathogen::Badge', Pathogen::ViewHelper::PATHOGEN_COMPONENT_HELPERS[:badge]
      assert_includes Pathogen::ViewHelper.instance_methods(false), :pathogen_badge
    end

    test 'passes axe-core checks for each tone' do
      Pathogen::Badge::TONE_OPTIONS.each do |tone|
        render_inline(Pathogen::Badge.new(text: "#{tone} state", tone: tone))

        assert_axe_structural_accessible rendered_content, context: "#{tone} badge"
      end
    end

    test 'passes axe-core checks with leading visual' do
      render_inline(Pathogen::Badge.new(text: 'Required', tone: :accent)) do |badge|
        badge.with_leading_visual { '<svg aria-hidden="true"></svg>'.html_safe }
      end

      assert_axe_structural_accessible rendered_content, context: 'badge with leading visual'
    end

    private

    def root_class_list
      page.find('span[data-view-component]')['class'].to_s.split
    end
  end
end
