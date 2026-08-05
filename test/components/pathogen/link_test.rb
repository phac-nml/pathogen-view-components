# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class LinkTest < ViewComponent::TestCase
    test 'renders with Pathogen link styling' do
      render_inline(Pathogen::Link.new(href: '/samples')) { 'Samples' }

      assert_selector 'a.font-semibold.underline[href="/samples"]'
      assert_text 'Samples'
    end

    test 'emits semantic text color utility' do
      render_inline(Pathogen::Link.new(href: '/samples')) { 'Samples' }

      assert_selector "a[class*='text-[var(--pvc-color-text)]']"
    end

    test 'emits design-contract focus outline classes' do
      render_inline(Pathogen::Link.new(href: '/samples')) { 'Samples' }

      assert_selector "a[class*='focus-visible:outline-[var(--pvc-color-focus)]']"
      assert_no_selector "a[class*='focus-visible:outline-black']"
      assert_no_selector "a[class*='dark:focus-visible:outline-white']"
    end

    test 'merges custom class with link classes' do
      render_inline(Pathogen::Link.new(href: '/samples', class: 'my-custom')) { 'Samples' }

      assert_selector 'a.my-custom.font-semibold'
    end

    test 'keeps visible text in the accessible name and announces a new window for external links' do
      render_inline(Pathogen::Link.new(href: 'https://www.w3.org/WAI/')) { 'Accessibility guidance' }

      assert_selector 'a[target="_blank"][rel="noopener noreferrer"]', text: 'Accessibility guidance'
      assert_no_selector 'a[aria-label]'
      assert_selector 'a > span.sr-only', text: I18n.t('pathogen.link.new_window_label')
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
