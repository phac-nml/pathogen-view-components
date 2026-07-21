# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class DisclosureTest < ViewComponent::TestCase
    test 'renders button and panel with disclosure wiring' do
      render_inline(Pathogen::Disclosure.new(id: 'advanced', label: 'Advanced options')) do
        'Extra settings'
      end

      assert_selector 'div#advanced[data-controller~="pathogen--disclosure"][data-state="closed"]'
      assert_selector 'div#advanced[data-pathogen--disclosure-open-value="false"]'
      assert_selector 'button[type="button"][aria-expanded="false"][aria-controls="advanced-panel"]',
                      text: 'Advanced options'
      assert_selector 'div#advanced-panel[hidden][data-pathogen--disclosure-target="panel"]',
                      text: 'Extra settings',
                      visible: :all
    end

    test 'renders open state when open is true' do
      render_inline(Pathogen::Disclosure.new(id: 'open-one', label: 'Open section', open: true)) do
        'Visible content'
      end

      assert_selector 'div#open-one[data-state="open"][data-pathogen--disclosure-open-value="true"]'
      assert_selector 'button[aria-expanded="true"][aria-controls="open-one-panel"]'
      assert_selector 'div#open-one-panel:not([hidden])', text: 'Visible content'
    end

    test 'uses an explicit accessible name for a custom trigger slot' do
      render_inline(Pathogen::Disclosure.new(id: 'custom', aria_label: 'Custom trigger')) do |disclosure|
        disclosure.with_trigger { 'Custom trigger' }
        'Panel body'
      end

      assert_selector 'button[aria-label="Custom trigger"]', text: 'Custom trigger'
      assert_selector 'div#custom-panel', text: 'Panel body', visible: :all
    end

    test 'includes focus-visible outline token on the trigger' do
      render_inline(Pathogen::Disclosure.new(id: 'focus', label: 'Focus me')) do
        'Content'
      end

      assert_selector "button[class*='focus-visible:outline-[var(--pvc-color-focus)]']"
    end

    test 'marks chevron as decorative' do
      render_inline(Pathogen::Disclosure.new(id: 'icon', label: 'With icon')) do
        'Content'
      end

      assert_selector 'button span[aria-hidden="true"] svg[aria-hidden="true"]', visible: :all
    end

    test 'merges host data attributes and controllers on the root element' do
      render_inline(
        Pathogen::Disclosure.new(
          id: 'merge-data',
          label: 'Merged',
          data: {
            controller: 'host-controller analytics',
            state: 'external-state',
            'qa-hook' => 'disclosure-root'
          }
        )
      ) do
        'Panel body'
      end

      assert_selector 'div#merge-data[data-controller~="host-controller"][data-controller~="analytics"]' \
                      '[data-controller~="pathogen--disclosure"]'
      assert_selector 'div#merge-data[data-qa-hook="disclosure-root"]'
      assert_selector 'div#merge-data[data-state="closed"]'
      assert_selector 'div#merge-data[data-pathogen--disclosure-open-value="false"]'
    end

    test 'raises when neither label nor trigger is provided' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Disclosure.new(id: 'missing')) { 'Panel' }
      end

      assert_match(/label: or a trigger slot/, error.message)
    end

    test 'raises when a custom trigger has no accessible name' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Disclosure.new(id: 'unnamed')) do |disclosure|
          disclosure.with_trigger { tag.span('', aria: { hidden: true }) }
          'Panel'
        end
      end

      assert_match(/trigger slot requires aria_label:/, error.message)
    end

    test 'raises when panel content is missing' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Disclosure.new(id: 'empty', label: 'Empty'))
      end

      assert_match(/content block/, error.message)
    end

    test 'generates an id when none is provided' do
      render_inline(Pathogen::Disclosure.new(label: 'Auto id')) { 'Panel' }

      root = page.find('[data-controller~="pathogen--disclosure"]')
      assert_match(/\Adisclosure-/, root[:id])
      panel = page.find('[data-pathogen--disclosure-target="panel"]', visible: :all)
      assert_equal "#{root[:id]}-panel", panel[:id]
    end
  end
end
