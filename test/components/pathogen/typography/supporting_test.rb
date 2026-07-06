# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    # Test suite for Supporting component
    class SupportingTest < ViewComponent::TestCase
      test 'renders paragraph tag by default' do
        render_inline(Supporting.new) { 'Supporting text' }

        assert_selector 'p', text: 'Supporting text'
      end

      test 'renders custom tag when specified' do
        render_inline(Supporting.new(tag: :span)) { 'Supporting text' }

        assert_selector 'span', text: 'Supporting text'
        assert_no_selector 'p'
      end

      test 'applies control scale by default' do
        render_inline(Supporting.new) { 'Test' }

        assert_type_role 'p', :control
      end

      test 'applies meta scale when requested' do
        render_inline(Supporting.new(size: :meta)) { 'Test' }

        assert_type_role 'p', :meta
      end

      test 'applies normal leading' do
        render_inline(Supporting.new) { 'Test' }

        assert_selector 'p.leading-normal'
      end

      test 'applies default variant color classes' do
        render_inline(Supporting.new) { 'Test' }

        assert_selector 'p[class*="--pvc-color-text"]'
      end

      test 'applies muted variant color classes' do
        render_inline(Supporting.new(variant: :muted)) { 'Test' }

        assert_selector 'p[class*="--pvc-color-text-muted"]'
      end

      test 'applies subdued variant color classes' do
        render_inline(Supporting.new(variant: :subdued)) { 'Test' }

        assert_selector 'p[class*="--pvc-color-text-muted"]'
      end

      test 'applies inverse variant color classes' do
        render_inline(Supporting.new(variant: :inverse)) { 'Test' }

        assert_selector 'p.text-white'
      end

      test 'merges custom classes' do
        render_inline(Supporting.new(class: 'mt-1')) { 'Test' }

        assert_selector 'p.mt-1[class*="--type-control"]'
      end

      test 'accepts additional HTML attributes' do
        render_inline(Supporting.new(id: 'help-text', role: 'note')) { 'Test' }

        assert_selector 'p#help-text[role="note"]'
      end

      test 'raises error for invalid variant in development' do
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) do
          Supporting.new(variant: :invalid)
        end
      end

      test 'raises error for invalid size in development' do
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) do
          Supporting.new(size: :invalid)
        end
      end

      test 'supports label tag for form labels' do
        render_inline(Supporting.new(tag: :label, for: 'email')) { 'Email address' }

        assert_selector 'label[for="email"][class*="--type-control"]', text: 'Email address'
      end

      test 'supports div tag for captions' do
        render_inline(Supporting.new(tag: :div)) { 'Image caption' }

        assert_selector 'div[class*="--type-control"]', text: 'Image caption'
      end
    end
  end
end
