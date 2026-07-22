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

    test 'renders translated portal aria-label on tooltip controller wrapper' do
      render_inline(Pathogen::Link.new(href: '/samples')) do |component|
        component.with_tooltip(text: 'More info') { 'Samples' }
      end

      assert_selector(
        "div[data-controller='pathogen--tooltip']" \
        "[data-pathogen--tooltip-portal-aria-label-value='#{Pathogen::Tooltip.portal_aria_label}']"
      )
    end

    test 'with_tooltip associates via aria-describedby by default' do
      render_inline(Pathogen::Link.new(href: '/samples')) do |component|
        component.with_tooltip(text: 'More info') { 'Samples' }
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='describedby']"
      assert_selector 'a[aria-describedby][data-pathogen--tooltip-target="trigger"]'
      tooltip_id = page.find('a')['aria-describedby']
      assert_selector "div##{tooltip_id}[role='tooltip']", text: 'More info'
    end

    test 'with_tooltip infers visual-only when the tooltip repeats the aria-label' do
      render_inline(Pathogen::Link.new(href: '/samples', aria: { label: 'View samples' })) do |component|
        component.with_tooltip(text: 'View samples') { 'icon' }
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='none']"
      assert_selector 'a[aria-label="View samples"]'
      assert_no_selector 'a[aria-describedby]'
    end

    test 'with_tooltip infers visual-only from visible text when the tooltip repeats it' do
      render_inline(Pathogen::Link.new(href: '/samples')) do |component|
        component.with_tooltip(text: 'Samples')
        'Samples'
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='none']"
      assert_no_selector 'a[aria-describedby]'
      assert_selector 'a', text: 'Samples'
    end

    test 'with_tooltip infers visual-only when the tooltip repeats markup-wrapped visible text' do
      render_inline(Pathogen::Link.new(href: '/samples')) do |component|
        component.with_tooltip(text: 'Samples')
        '<span class="icon"></span>  Samples  '.html_safe
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='none']"
      assert_no_selector 'a[aria-describedby]'
    end

    test 'with_tooltip infers describedby when the tooltip adds information' do
      render_inline(Pathogen::Link.new(href: '/samples', aria: { label: 'Samples' })) do |component|
        component.with_tooltip(text: 'View all 12 samples') { 'icon' }
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='describedby']"
      assert_selector 'a[aria-describedby]'
      tooltip_id = page.find('a')['aria-describedby']
      assert_selector "div##{tooltip_id}[role='tooltip']", text: 'View all 12 samples'
    end

    test 'with_tooltip(describe: false) keeps an icon-only link visual-only' do
      render_inline(Pathogen::Link.new(href: '/samples', aria: { label: 'View samples' })) do |component|
        component.with_tooltip(text: 'View samples', describe: false) { 'icon' }
      end

      assert_selector "div[data-controller='pathogen--tooltip'][data-pathogen--tooltip-associate-value='none']"
      assert_selector 'a[aria-label="View samples"][data-pathogen--tooltip-target="trigger"]'
      assert_no_selector 'a[aria-describedby]'
      assert_selector 'div[role="tooltip"]', text: 'View samples'
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
