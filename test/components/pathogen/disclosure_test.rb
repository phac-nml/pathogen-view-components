# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class DisclosureTest < ViewComponent::TestCase
    test 'renders button and panel with disclosure wiring' do
      render_inline(Pathogen::Disclosure.new(id: 'advanced', label: 'Advanced options')) do
        'Extra settings'
      end

      assert_selector 'div#advanced.pathogen-disclosure[data-controller~="pathogen--disclosure"]'
      assert_selector 'div#advanced[data-pathogen--disclosure-open-value="false"]'
      assert_selector 'button[type="button"][aria-expanded="false"][aria-controls="advanced-panel"]',
                      text: 'Advanced options'
      assert_selector 'button[data-pathogen--disclosure-target="button"]'
      refute_selector 'button[aria-label]'
      assert_selector 'div#advanced-panel[hidden][data-pathogen--disclosure-target="panel"]',
                      text: 'Extra settings',
                      visible: :all
      assert_selector 'button .pathogen-disclosure__icon[aria-hidden="true"]', visible: :all
    end

    test 'renders open state when open is true' do
      render_inline(Pathogen::Disclosure.new(id: 'open-one', label: 'Open section', open: true)) do
        'Visible content'
      end

      assert_selector 'div#open-one[data-pathogen--disclosure-open-value="true"]'
      assert_selector 'button[aria-expanded="true"][aria-controls="open-one-panel"]'
      assert_selector 'div#open-one-panel:not([hidden])', text: 'Visible content'
    end

    test 'uses visible custom trigger text as the accessible name by default' do
      render_inline(Pathogen::Disclosure.new(id: 'custom')) do |disclosure|
        disclosure.with_trigger { 'Metadata templates (3)' }
        'Panel body'
      end

      assert_selector 'button', text: 'Metadata templates (3)'
      refute_selector 'button[aria-label]'
      assert_selector 'div#custom-panel', text: 'Panel body', visible: :all
    end

    test 'allows aria_label when it includes the visible trigger text' do
      render_inline(
        Pathogen::Disclosure.new(
          id: 'named',
          aria_label: 'Metadata templates, 3 available'
        )
      ) do |disclosure|
        disclosure.with_trigger { 'Metadata templates (3)' }
        'Panel body'
      end

      assert_selector 'button[aria-label="Metadata templates, 3 available"]', text: 'Metadata templates (3)'
    end

    test 'includes focus-visible outline tokens on the trigger' do
      render_inline(Pathogen::Disclosure.new(id: 'focus', label: 'Focus me')) do
        'Content'
      end

      assert_selector "button[class*='focus-visible:outline']"
      assert_selector "button[class*='focus-visible:outline-2']"
      assert_selector "button[class*='focus-visible:outline-[var(--pvc-color-focus)]']"
    end

    test 'medium size meets the 44px minimum target' do
      render_inline(Pathogen::Disclosure.new(id: 'medium', label: 'Medium')) { 'Panel' }

      assert_selector "button[class*='min-h-11']"
    end

    test 'small size meets the 24px minimum target' do
      render_inline(Pathogen::Disclosure.new(id: 'small', label: 'Small', size: :small)) { 'Panel' }

      assert_selector "button[class*='min-h-6']"
    end

    test 'wraps the trigger button in a heading when heading_level is set' do
      render_inline(
        Pathogen::Disclosure.new(id: 'headed', label: 'Project settings', heading_level: 3)
      ) do
        'Panel'
      end

      assert_selector 'h3.pathogen-disclosure__heading > button #headed-label', text: 'Project settings'
    end

    test 'merges host data attributes and controllers on the root element' do
      render_inline(
        Pathogen::Disclosure.new(
          id: 'merge-data',
          label: 'Merged',
          data: {
            controller: 'host-controller analytics',
            'qa-hook' => 'disclosure-root'
          }
        )
      ) do
        'Panel body'
      end

      assert_selector 'div#merge-data[data-controller~="host-controller"][data-controller~="analytics"]' \
                      '[data-controller~="pathogen--disclosure"]'
      assert_selector 'div#merge-data[data-qa-hook="disclosure-root"]'
      assert_selector 'div#merge-data[data-pathogen--disclosure-open-value="false"]'
    end

    test 'merges trigger_arguments and panel_arguments' do
      render_inline(
        Pathogen::Disclosure.new(
          id: 'args',
          label: 'Args',
          trigger_arguments: { class: 'host-trigger', data: { 'qa-hook' => 'trigger' } },
          panel_arguments: { class: 'host-panel', data: { 'qa-hook' => 'panel' } }
        )
      ) do
        'Panel body'
      end

      assert_selector 'button.host-trigger[data-qa-hook="trigger"]'
      assert_selector 'div#args-panel.host-panel[data-qa-hook="panel"]', text: 'Panel body', visible: :all
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
          disclosure.with_trigger { '<span aria-hidden="true"></span>'.html_safe }
          'Panel'
        end
      end

      assert_match(/visible trigger text or aria_label:/, error.message)
    end

    test 'raises when aria_label omits the visible trigger text' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Disclosure.new(id: 'mismatch', aria_label: 'Something else')) do |disclosure|
          disclosure.with_trigger { 'Visible label' }
          'Panel'
        end
      end

      assert_match(/Label in Name/, error.message)
    end

    test 'raises when the trigger slot contains interactive content' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Disclosure.new(id: 'nested')) do |disclosure|
          disclosure.with_trigger { '<a href="#">Bad link</a>'.html_safe }
          'Panel'
        end
      end

      assert_match(/cannot contain interactive elements/, error.message)
    end

    test 'raises when panel content is missing' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Disclosure.new(id: 'empty', label: 'Empty'))
      end

      assert_match(/content block/, error.message)
    end

    test 'raises for an invalid heading_level' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Disclosure.new(id: 'bad-h', label: 'Bad', heading_level: 1)) { 'Panel' }
      end

      assert_match(/heading_level/, error.message)
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
