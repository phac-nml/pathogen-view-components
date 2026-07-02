# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class CopyableValueTest < ViewComponent::TestCase
    test 'raises for blank value' do
      assert_raises(ArgumentError) { Pathogen::CopyableValue.new(value: '') }
    end

    test 'raises for nil value' do
      assert_raises(ArgumentError) { Pathogen::CopyableValue.new(value: nil) }
    end

    test 'renders value text in monospace container' do
      render_inline(Pathogen::CopyableValue.new(value: 'INXT_PRJ_A2G6VVJNCN'))

      assert_selector 'span[data-controller="pathogen--copyable-value"][class*="font-mono"]'
      assert_text 'INXT_PRJ_A2G6VVJNCN'
      assert_selector 'span[data-pathogen--copyable-value-target="text"]',
                      text: 'INXT_PRJ_A2G6VVJNCN'
    end

    test 'renders copy button with correct aria-label' do
      render_inline(Pathogen::CopyableValue.new(value: 'ABC123'))

      assert_selector 'button[type="button"][aria-label="Copy ABC123 to clipboard"]'
    end

    test 'copy button meets small icon-only touch target and ghost-lane hover styles' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'button[class*="min-h-6"][class*="min-w-6"]'
      assert_selector 'button[class*="border-l"][class*="border-[var(--pvc-color-border)]"]'
      assert_selector 'button[class*="interactive-hover:bg-[var(--pvc-color-surface-raised)]"]'
      assert_selector 'button[class*="interactive-hover:text-[var(--pvc-color-text)]"]'
      assert_selector 'button[class*="focus-visible:outline-offset-2"]'
      assert_no_selector 'button[class*="interactive-hover:border-"]'
    end

    test 'clips action lane to container radius' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'span[class*="overflow-hidden"][class*="rounded-[var(--pvc-radius-action)]"]'
    end

    test 'uses shared inline code surface tokens' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'span[class*="bg-[var(--pvc-color-surface-muted)]"]'
      assert_selector 'span[class*="border-[var(--pvc-color-border)]"]'
    end

    test 'includes sr-only aria-live region for announcements' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'span.sr-only[aria-live="polite"][aria-atomic="true"]'
    end

    test 'uses default copied message from i18n' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector(
        'span[data-pathogen--copyable-value-copied-message-value="Copied to clipboard"]'
      )
    end

    test 'accepts custom copied_message' do
      render_inline(Pathogen::CopyableValue.new(value: 'test', copied_message: 'ID copied!'))

      assert_selector(
        'span[data-pathogen--copyable-value-copied-message-value="ID copied!"]'
      )
    end

    test 'merges custom system_arguments classes' do
      render_inline(Pathogen::CopyableValue.new(value: 'test', class: 'my-custom-class'))

      assert_selector 'span.my-custom-class'
    end

    test 'merges custom data attributes' do
      render_inline(Pathogen::CopyableValue.new(value: 'test', data: { custom: 'value' }))

      assert_selector 'span[data-custom="value"]'
    end

    test 'appends copyable-value controller to existing data controllers' do
      render_inline(Pathogen::CopyableValue.new(value: 'test', data: { controller: 'alpha beta' }))

      assert_selector 'span[data-controller="alpha beta pathogen--copyable-value"]'
    end

    test 'deduplicates copyable-value controller when already present' do
      render_inline(
        Pathogen::CopyableValue.new(value: 'test', data: { controller: 'pathogen--copyable-value' })
      )

      assert_selector 'span[data-controller="pathogen--copyable-value"]'
    end

    test 'renders with idle data-state on root element' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'span[data-controller="pathogen--copyable-value"][data-state="idle"]'
    end

    test 'includes reset delay stimulus value' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'span[data-pathogen--copyable-value-reset-delay-value="2000"]'
    end

    test 'accepts custom reset_delay' do
      render_inline(Pathogen::CopyableValue.new(value: 'test', reset_delay: 1500))

      assert_selector 'span[data-pathogen--copyable-value-reset-delay-value="1500"]'
    end

    test 'renders clipboard icon and success icon targets' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'svg[data-pathogen--copyable-value-target="icon"]', visible: :all
      assert_selector 'svg[data-pathogen--copyable-value-target="successIcon"]', visible: :all
    end

    test 'copy button has click action wired to controller' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'button[data-action="click->pathogen--copyable-value#copy"]'
    end

    test 'value span has select-all class for easy manual selection' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'span.select-all[data-pathogen--copyable-value-target="text"]',
                      text: 'test'
      assert_includes rendered_content, 'font-variant-numeric:tabular-nums'
    end

    test 'renders with view-component data attribute' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'span[data-view-component]'
    end
  end
end
