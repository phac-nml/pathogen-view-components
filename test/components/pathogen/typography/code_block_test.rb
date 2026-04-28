# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    # Test suite for CodeBlock component
    class CodeBlockTest < ViewComponent::TestCase
      test 'renders pre and code tags' do
        render_inline(CodeBlock.new) { 'code content' }

        assert_selector 'pre > code', text: 'code content'
      end

      test 'applies pathogen code-block class to wrapper div' do
        render_inline(CodeBlock.new) { 'Test' }

        assert_selector 'div.pathogen-typography--code-block'
      end

      test 'applies pathogen pre class' do
        render_inline(CodeBlock.new) { 'Test' }

        assert_selector 'pre.pathogen-typography--code-block__pre'
      end

      test 'applies pathogen code class' do
        render_inline(CodeBlock.new) { 'Test' }

        assert_selector 'code.pathogen-typography--code-block__code'
      end

      test 'adds language class when provided' do
        render_inline(CodeBlock.new(language: 'ruby')) { 'def test; end' }

        assert_selector 'code.language-ruby'
      end

      test 'does not add language class when language not provided' do
        render_inline(CodeBlock.new) { 'code' }

        assert_no_selector 'code[class*="language-"]'
      end

      test 'preserves whitespace and line breaks' do
        code = "def example\n  puts 'hello'\nend"
        render_inline(CodeBlock.new) { code }

        assert_selector 'code', text: code
      end

      test 'escapes HTML content' do
        render_inline(CodeBlock.new) { '<script>alert("xss")</script>' }

        assert_selector 'code', text: '<script>alert("xss")</script>'
      end

      test 'merges custom classes on wrapper div' do
        render_inline(CodeBlock.new(class: 'custom-block')) { 'Test' }

        assert_selector 'div.custom-block.pathogen-typography--code-block'
      end

      test 'accepts additional HTML attributes on wrapper div' do
        render_inline(CodeBlock.new(id: 'code-example', data: { syntax: 'ruby' })) { 'Test' }

        assert_selector 'div#code-example[data-syntax="ruby"]'
      end

      test 'supports multiple languages' do
        %w[ruby javascript python html css].each do |lang|
          render_inline(CodeBlock.new(language: lang)) { 'code' }

          assert_selector "code.language-#{lang}"
        end
      end

      test 'does not emit Tailwind utility classes on wrapper' do
        render_inline(CodeBlock.new) { 'Test' }

        tailwind_patterns = %w[rounded-2xl bg-slate-900 text-slate-100 ring-1 shadow-inner overflow-hidden]
        tailwind_patterns.each do |cls|
          assert_no_selector "div[class*='#{cls}']"
        end
      end

      test 'does not emit Tailwind utility classes on pre' do
        render_inline(CodeBlock.new) { 'Test' }

        tailwind_patterns = %w[font-mono text-sm leading-relaxed p-4 overflow-x-auto]
        tailwind_patterns.each do |cls|
          assert_no_selector "pre[class*='#{cls}']"
        end
      end
    end
  end
end
