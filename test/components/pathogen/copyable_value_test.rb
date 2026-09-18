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

    test 'rounds action lane to container radius without clipping focus' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      assert_selector 'span[class*="rounded-[var(--pvc-radius-action)]"]'
      assert_no_selector 'span[class*="overflow-hidden"]'
      assert_selector 'button[class*="rounded-r-[calc(var(--pvc-radius-action)-1px)]"]'
      assert_selector 'span[class*="min-h-6"]'
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

    test 'preserves string-keyed caller data and deduplicates controllers without modifying the input' do
      data = { 'controller' => 'alpha pathogen--copyable-value', 'custom' => 'value' }.freeze

      render_inline(Pathogen::CopyableValue.new(value: 'test', data: data))

      assert_selector 'span[data-controller="alpha pathogen--copyable-value"][data-custom="value"]'
      assert_equal({ 'controller' => 'alpha pathogen--copyable-value', 'custom' => 'value' }, data)
    end

    test 'normalizes conflicting data keys before applying component-owned attributes' do
      data = {
        controller: 'alpha',
        'controller' => 'beta pathogen--copyable-value',
        'state' => 'success',
        'pathogen--copyable-value-copied-message-value' => 'Stale success message',
        'pathogen--copyable-value-copy-failed-message-value' => 'Stale failure message',
        'pathogen--copyable-value-reset-delay-value' => 1
      }

      render_inline(
        Pathogen::CopyableValue.new(value: 'test', copied_message: 'ID copied!', reset_delay: 1500, data: data)
      )

      expected_data = {
        'controller' => 'beta pathogen--copyable-value',
        'state' => 'idle',
        'pathogen--copyable-value-copied-message-value' => 'ID copied!',
        'pathogen--copyable-value-copy-failed-message-value' => 'Unable to copy to clipboard',
        'pathogen--copyable-value-reset-delay-value' => '1500'
      }

      expected_data.each do |name, value|
        assert_equal 1, rendered_content.scan(/\bdata-#{Regexp.escape(name)}=/).length,
                     "Expected exactly one serialized data-#{name} attribute"
        assert_selector "span[data-#{name}=\"#{value}\"]"
      end
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

    test 'renders clipboard, success, and failure icons hidden from assistive technology' do
      render_inline(Pathogen::CopyableValue.new(value: 'test'))

      %w[icon successIcon errorIcon].each do |target|
        assert_selector 'span[aria-hidden="true"] svg[aria-hidden="true"]' \
                        "[data-pathogen--copyable-value-target=\"#{target}\"]", visible: :all
      end
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
