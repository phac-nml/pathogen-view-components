# frozen_string_literal: true

require 'test_helper'

module Pathogen
  # Test suite for Pathogen::Link component
  class LinkTest < ViewComponent::TestCase
    test 'renders with Pathogen link class' do
      render_inline(Pathogen::Link.new(href: '/samples')) { 'Samples' }

      assert_selector 'a.pathogen-link[href="/samples"]'
      assert_text 'Samples'
    end

    test 'does not emit Tailwind utility classes' do
      render_inline(Pathogen::Link.new(href: '/samples')) { 'Samples' }

      tailwind_patterns = %w[text-grey-900 font-semibold underline hover:decoration-2]
      tailwind_patterns.each do |cls|
        assert_no_selector "a[class*='#{cls}']"
      end
    end

    test 'merges custom class with Pathogen link class' do
      render_inline(Pathogen::Link.new(href: '/samples', class: 'my-custom')) { 'Samples' }

      assert_selector 'a.pathogen-link.my-custom'
    end

    test 'raises error when href is blank' do
      error = assert_raises(ArgumentError) do
        component = Pathogen::Link.new(href: '')
        render_inline(component) { 'No href' }
      end
      assert_match(/href is required/, error.message)
    end
  end
end
