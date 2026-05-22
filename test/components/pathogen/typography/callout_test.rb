# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    # Test suite for Callout component
    class CalloutTest < ViewComponent::TestCase
      test 'renders as paragraph by default' do
        render_inline(Callout.new) { 'Important callout text.' }

        assert_selector 'p', text: 'Important callout text.'
      end

      test 'applies pathogen callout and size class' do
        render_inline(Callout.new) { 'Test' }

        assert_selector 'p.font-sans'
        assert_selector 'p.text-lg'
      end

      test 'applies default color class' do
        render_inline(Callout.new) { 'Test' }

        assert_selector 'p[class*="text-neutral-900"]'
      end

      test 'applies muted color variant' do
        render_inline(Callout.new(variant: :muted)) { 'Test' }

        assert_selector 'p[class*="text-neutral-500"]'
      end

      test 'applies leading and font classes' do
        render_inline(Callout.new) { 'Test' }

        assert_selector 'p.leading-normal'
        assert_selector 'p.font-sans'
      end

      test 'renders with custom tag' do
        render_inline(Callout.new(tag: :div)) { 'Test' }

        assert_selector 'div.font-sans'
      end

      test 'merges custom class' do
        render_inline(Callout.new(class: 'my-callout')) { 'Test' }

        assert_selector 'p.my-callout.font-sans'
      end
    end
  end
end
