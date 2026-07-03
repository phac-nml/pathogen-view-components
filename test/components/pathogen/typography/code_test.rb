# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    class CodeTest < ViewComponent::TestCase
      test 'renders code tag' do
        render_inline(Code.new) { 'variable_name' }

        assert_selector 'code', text: 'variable_name'
      end

      test 'applies inline code Tailwind classes' do
        render_inline(Code.new) { 'Test' }

        assert_selector 'code.inline-flex.items-center.font-mono[class*="--type-control"]'
      end

      test 'merges custom classes' do
        render_inline(Code.new(class: 'custom-code')) { 'Test' }

        assert_selector 'code.custom-code.inline-flex'
      end

      test 'accepts additional HTML attributes' do
        render_inline(Code.new(id: 'example', data: { lang: 'ruby' })) { 'Test' }

        assert_selector 'code#example[data-lang="ruby"]'
      end

      test 'preserves code content without modification' do
        render_inline(Code.new) { '<script>alert("test")</script>' }

        assert_selector 'code', text: '<script>alert("test")</script>'
      end

      test 'emits token-based background utility' do
        render_inline(Code.new) { 'test' }

        assert_selector "code[class*='--pvc-color-surface-muted']"
      end
    end
  end
end
