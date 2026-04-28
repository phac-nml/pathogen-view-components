# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    # Test suite for Code component
    class CodeTest < ViewComponent::TestCase
      test 'renders code tag' do
        render_inline(Code.new) { 'variable_name' }

        assert_selector 'code', text: 'variable_name'
      end

      test 'applies pathogen code class' do
        render_inline(Code.new) { 'Test' }

        assert_selector 'code.pathogen-typography--code'
      end

      test 'merges custom classes' do
        render_inline(Code.new(class: 'custom-code')) { 'Test' }

        assert_selector 'code.custom-code.pathogen-typography--code'
      end

      test 'accepts additional HTML attributes' do
        render_inline(Code.new(id: 'example', data: { lang: 'ruby' })) { 'Test' }

        assert_selector 'code#example[data-lang="ruby"]'
      end

      test 'preserves code content without modification' do
        render_inline(Code.new) { '<script>alert("test")</script>' }

        assert_selector 'code', text: '<script>alert("test")</script>'
      end

      test 'does not emit Tailwind utility classes' do
        render_inline(Code.new) { 'test' }

        tailwind_patterns = %w[font-mono text-sm bg-slate-100 text-slate-800 px-2 rounded-md inline-flex]
        tailwind_patterns.each do |cls|
          assert_no_selector "code[class*='#{cls}']"
        end
      end
    end
  end
end
