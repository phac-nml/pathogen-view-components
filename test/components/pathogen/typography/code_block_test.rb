# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    class CodeBlockTest < ViewComponent::TestCase
      test 'renders pre and code tags' do
        render_inline(CodeBlock.new) { 'code content' }

        assert_selector 'pre > code', text: 'code content'
      end

      test 'applies semantic code block surface classes' do
        render_inline(CodeBlock.new) { 'Test' }

        assert_selector 'div.overflow-hidden.rounded-\\[var\\(--pvc-radius-panel\\)\\].text-white'
        assert_selector "div[class*='bg-neutral-950'][class*='--pvc-color-border-strong']"
      end

      test 'applies pre typography classes' do
        render_inline(CodeBlock.new) { 'Test' }

        assert_selector 'pre.overflow-x-auto.font-mono[class*="--type-control"]'
      end

      test 'applies code element classes' do
        render_inline(CodeBlock.new) { 'Test' }

        assert_selector 'code.block.min-w-full.font-mono'
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

        assert_selector 'div.custom-block.overflow-hidden'
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
    end
  end
end
