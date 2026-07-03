# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    class HeadingGroupTest < ViewComponent::TestCase
      test 'renders heading slot' do
        render_inline(HeadingGroup.new(level: 2)) do |group|
          group.with_heading { 'Section title' }
        end

        assert_selector 'h2', text: 'Section title'
      end

      test 'renders heading and metadata slots' do
        render_inline(HeadingGroup.new(level: 1)) do |group|
          group.with_heading { 'Article title' }
          group.with_metadata { 'Published January 15, 2024' }
        end

        assert_selector 'h1', text: 'Article title'
        assert_selector 'p', text: 'Published January 15, 2024'
        assert_type_role 'p', :meta
      end

      test 'metadata defaults to muted variant and meta size' do
        render_inline(HeadingGroup.new(level: 2)) do |group|
          group.with_heading { 'Title' }
          group.with_metadata { 'Metadata' }
        end

        assert_selector 'p[class*="--pvc-color-text-muted"]'
        assert_type_role 'p', :meta
      end

      test 'applies spacing classes' do
        render_inline(HeadingGroup.new(level: 2, spacing: :compact)) do |group|
          group.with_heading { 'Title' }
        end

        assert_selector 'div.space-y-1'
      end

      test 'forwards heading variant to heading slot' do
        render_inline(HeadingGroup.new(level: 2, heading_variant: :muted)) do |group|
          group.with_heading { 'Title' }
        end

        assert_selector 'h2[class*="--pvc-color-text-muted"]'
      end

      test 'metadata slot accepts size override' do
        render_inline(HeadingGroup.new(level: 2)) do |group|
          group.with_heading { 'Title' }
          group.with_metadata(size: :control) { 'Control metadata' }
        end

        assert_type_role 'p', :control
      end
    end
  end
end
