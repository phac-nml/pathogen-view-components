# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    # Test suite for Text component
    class TextTest < ViewComponent::TestCase
      test 'renders paragraph tag by default' do
        render_inline(Text.new) { 'Test text' }

        assert_selector 'p', text: 'Test text'
      end

      test 'renders custom tag when specified' do
        render_inline(Text.new(tag: :div)) { 'Test text' }

        assert_selector 'div', text: 'Test text'
        assert_no_selector 'p'
      end

      test 'applies base text size' do
        render_inline(Text.new) { 'Test' }

        assert_selector 'p[class*="--type-body"]'
      end

      test 'applies normal leading' do
        render_inline(Text.new) { 'Test' }

        assert_selector 'p.leading-normal'
      end

      test 'applies default variant color classes' do
        render_inline(Text.new) { 'Test' }

        assert_selector 'p[class*="text-neutral-900"]'
      end

      test 'applies muted variant color classes' do
        render_inline(Text.new(variant: :muted)) { 'Test' }

        assert_selector 'p[class*="text-neutral-500"]'
      end

      test 'applies subdued variant color classes' do
        render_inline(Text.new(variant: :subdued)) { 'Test' }

        assert_selector 'p[class*="text-neutral-600/80"]'
      end

      test 'applies inverse variant color classes' do
        render_inline(Text.new(variant: :inverse)) { 'Test' }

        assert_selector 'p.text-white'
      end

      test 'merges custom classes' do
        render_inline(Text.new(class: 'custom-text mb-4')) { 'Test' }

        assert_selector 'p.custom-text.mb-4[class*="--type-body"]'
      end

      test 'accepts additional HTML attributes' do
        render_inline(Text.new(id: 'intro', data: { test: 'value' })) { 'Test' }

        assert_selector 'p#intro[data-test="value"]'
      end

      test 'raises error for invalid variant in development' do
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) do
          Text.new(variant: :invalid)
        end
      end

      test 'supports span tag for inline text' do
        render_inline(Text.new(tag: :span)) { 'Inline text' }

        assert_selector 'span[class*="--type-body"]', text: 'Inline text'
      end

      test 'supports article tag for semantic markup' do
        render_inline(Text.new(tag: :article)) { 'Article content' }

        assert_selector 'article[class*="--type-body"]', text: 'Article content'
      end
    end
  end
end
