# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class LinkTest < ViewComponent::TestCase
    test 'renders with Pathogen link styling' do
      render_inline(Pathogen::Link.new(href: '/samples')) { 'Samples' }

      assert_selector 'a.font-semibold.underline[href="/samples"]'
      assert_text 'Samples'
    end

    test 'emits token-based text color utility' do
      render_inline(Pathogen::Link.new(href: '/samples')) { 'Samples' }

      assert_selector "a[class*='text-neutral-900']"
    end

    test 'merges custom class with link classes' do
      render_inline(Pathogen::Link.new(href: '/samples', class: 'my-custom')) { 'Samples' }

      assert_selector 'a.my-custom.font-semibold'
    end

    test 'renders translated portal aria-label on tooltip controller wrapper' do
      render_inline(Pathogen::Link.new(href: '/samples')) do |component|
        component.with_tooltip(text: 'More info') { 'Samples' }
      end

      assert_selector(
        "div[data-controller='pathogen--tooltip']" \
        "[data-pathogen--tooltip-portal-aria-label-value='#{Pathogen::Tooltip.portal_aria_label}']"
      )
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
