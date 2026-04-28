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

        assert_selector 'p.pathogen-typography--callout'
        assert_selector 'p.pathogen-typography--size-lg'
      end

      test 'applies default color class' do
        render_inline(Callout.new) { 'Test' }

        assert_selector 'p.pathogen-typography--color-default'
      end

      test 'applies muted color variant' do
        render_inline(Callout.new(variant: :muted)) { 'Test' }

        assert_selector 'p.pathogen-typography--color-muted'
      end

      test 'applies leading and font classes' do
        render_inline(Callout.new) { 'Test' }

        assert_selector 'p.pathogen-typography--leading-body'
        assert_selector 'p.pathogen-typography--font-ui'
      end

      test 'renders with custom tag' do
        render_inline(Callout.new(tag: :div)) { 'Test' }

        assert_selector 'div.pathogen-typography--callout'
      end

      test 'merges custom class' do
        render_inline(Callout.new(class: 'my-callout')) { 'Test' }

        assert_selector 'p.my-callout.pathogen-typography--callout'
      end

      test 'does not emit Tailwind utility classes' do
        render_inline(Callout.new) { 'Test' }

        tailwind_patterns = %w[text-lg text-base text-slate-900 leading-normal font-sans]
        tailwind_patterns.each do |cls|
          assert_no_selector "p[class*='#{cls}']"
        end
      end
    end
  end
end
