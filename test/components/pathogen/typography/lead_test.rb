# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    # Test suite for Lead component
    class LeadTest < ViewComponent::TestCase
      test 'renders paragraph tag by default' do
        render_inline(Lead.new) { 'Lead paragraph' }

        assert_selector 'p', text: 'Lead paragraph'
      end

      test 'renders custom tag when specified' do
        render_inline(Lead.new(tag: :div)) { 'Lead text' }

        assert_selector 'div', text: 'Lead text'
        assert_no_selector 'p'
      end

      test 'applies larger text size' do
        render_inline(Lead.new) { 'Test' }

        assert_selector 'p.pathogen-typography--size-xl'
      end

      test 'applies relaxed leading for better readability' do
        render_inline(Lead.new) { 'Test' }

        assert_selector 'p.pathogen-typography--leading-relaxed'
      end

      test 'applies default variant color classes' do
        render_inline(Lead.new) { 'Test' }

        assert_selector 'p.pathogen-typography--color-default'
      end

      test 'applies muted variant color classes' do
        render_inline(Lead.new(variant: :muted)) { 'Test' }

        assert_selector 'p.pathogen-typography--color-muted'
      end

      test 'applies subdued variant color classes' do
        render_inline(Lead.new(variant: :subdued)) { 'Test' }

        assert_selector 'p.pathogen-typography--color-subdued'
      end

      test 'applies inverse variant color classes' do
        render_inline(Lead.new(variant: :inverse)) { 'Test' }

        assert_selector 'p.pathogen-typography--color-inverse'
      end

      test 'merges custom classes' do
        render_inline(Lead.new(class: 'mb-6')) { 'Test' }

        assert_selector 'p.mb-6.pathogen-typography--size-xl'
      end

      test 'accepts additional HTML attributes' do
        render_inline(Lead.new(id: 'intro', data: { component: 'lead' })) { 'Test' }

        assert_selector 'p#intro[data-component="lead"]'
      end

      test 'raises error for invalid variant in development' do
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) do
          Lead.new(variant: :invalid)
        end
      end
    end
  end
end
