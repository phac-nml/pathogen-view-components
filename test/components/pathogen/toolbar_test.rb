# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ToolbarTest < ViewComponent::TestCase
    test 'renders toolbar root semantics and controller wiring' do
      render_inline(Pathogen::Toolbar.new(label: 'Sample actions')) do
        ActionController::Base.helpers.tag.button(
          'Edit',
          type: 'button',
          tabindex: -1,
          data: { 'pathogen--toolbar-target': 'item' }
        )
      end

      assert_selector(
        'div[role="toolbar"][aria-label="Sample actions"]' \
        '[data-controller~="pathogen--toolbar"]'
      )
      assert_selector(
        'div[role="toolbar"][data-action*="keydown->pathogen--toolbar#handleKeyDown"]' \
        '[data-action*="focusin->pathogen--toolbar#handleFocusIn"]' \
        '[data-action*="click->pathogen--toolbar#handleClick:capture"]'
      )
      assert_selector 'button[data-pathogen--toolbar-target="item"][tabindex="-1"]', text: 'Edit'
    end

    test 'renders aria-labelledby naming when labelled_by is provided' do
      render_inline(Pathogen::Toolbar.new(labelled_by: 'toolbar-heading')) do
        ActionController::Base.helpers.tag.button(
          'Refresh',
          type: 'button',
          tabindex: -1,
          data: { 'pathogen--toolbar-target': 'item' }
        )
      end

      assert_selector 'div[role="toolbar"][aria-labelledby="toolbar-heading"]'
      assert_no_selector 'div[role="toolbar"][aria-label]'
    end

    test 'renders aria-controls when controls is provided' do
      render_inline(Pathogen::Toolbar.new(label: 'Grid actions', controls: 'samples-grid')) do
        ActionController::Base.helpers.tag.button(
          'Filter',
          type: 'button',
          tabindex: -1,
          data: { 'pathogen--toolbar-target': 'item' }
        )
      end

      assert_selector 'div[role="toolbar"][aria-controls="samples-grid"]'
    end

    test 'merges controller and action data values with existing toolbar data keys' do
      render_inline(
        Pathogen::Toolbar.new(
          label: 'Data merge',
          data: {
            controller: 'analytics',
            action: 'mouseenter->analytics#track'
          }
        )
      ) do
        ActionController::Base.helpers.tag.button(
          'Filter',
          type: 'button',
          tabindex: -1,
          data: { 'pathogen--toolbar-target': 'item' }
        )
      end

      assert_selector 'div[data-controller~="analytics"][data-controller~="pathogen--toolbar"]'
      assert_selector 'div[data-action*="mouseenter->analytics#track"]'
      assert_selector 'div[data-action*="click->pathogen--toolbar#handleClick:capture"]'
    end

    test 'merges controller and action data values when caller uses string data keys' do
      render_inline(
        Pathogen::Toolbar.new(
          label: 'String keyed data',
          data: {
            'controller' => 'analytics',
            'action' => 'mouseenter->analytics#track'
          }
        )
      ) do
        ActionController::Base.helpers.tag.button(
          'Filter',
          type: 'button',
          tabindex: -1,
          data: { 'pathogen--toolbar-target': 'item' }
        )
      end

      assert_selector 'div[data-controller~="analytics"][data-controller~="pathogen--toolbar"]'
      assert_selector 'div[data-action*="mouseenter->analytics#track"]'
      assert_selector 'div[data-action*="click->pathogen--toolbar#handleClick:capture"]'
    end

    test 'fails fast when accessible naming is missing or conflicting' do
      assert_raises(ArgumentError) { Pathogen::Toolbar.new }
      assert_raises(ArgumentError) { Pathogen::Toolbar.new(label: 'A', labelled_by: 'toolbar-heading') }
    end

    test 'uses aria-disabled without native disabled for unavailable buttons' do
      render_inline(Pathogen::Toolbar::Button.new(disabled: true)) { 'Archive' }

      assert_selector 'button[data-pathogen--toolbar-target="item"][tabindex="-1"][aria-disabled="true"]'
      assert_no_selector 'button[disabled]'
    end

    test 'removes string-keyed native disabled from toolbar button arguments' do
      render_inline(Pathogen::Toolbar::Button.new(**{ 'disabled' => true })) { 'Archive' }

      assert_selector 'button[data-pathogen--toolbar-target="item"][tabindex="-1"]', text: 'Archive'
      assert_no_selector 'button[disabled]'
    end

    test 'uses small Pathogen::Button sizing defaults in toolbar context' do
      render_inline(Pathogen::Toolbar::Button.new) { 'Compact' }

      assert_selector "button[class*='text-xs'][class*='px-2'][class*='py-1']"
    end

    test 'supports aria-label on toolbar buttons for icon-only usage' do
      render_inline(Pathogen::Toolbar::Button.new(label: 'Open display menu')) { '...' }

      assert_selector 'button[aria-label="Open display menu"]'
    end

    test 'renders aria-pressed only when pressed state is provided' do
      render_inline(Pathogen::Toolbar::Button.new(pressed: true)) { 'Bold' }

      assert_selector 'button[aria-pressed="true"]', text: 'Bold'

      render_inline(Pathogen::Toolbar::Button.new(pressed: false)) { 'Italic' }

      assert_selector 'button[aria-pressed="false"]', text: 'Italic'

      render_inline(Pathogen::Toolbar::Button.new) { 'Underline' }

      assert_no_selector 'button[aria-pressed]', text: 'Underline'
    end

    test 'renders table variant classes by default' do
      render_inline(Pathogen::Toolbar.new(label: 'Grid actions')) do
        ActionController::Base.helpers.tag.button(
          'Filter',
          type: 'button',
          tabindex: -1,
          data: { 'pathogen--toolbar-target': 'item' }
        )
      end

      assert_selector 'div[role="toolbar"][class*="w-full"][data-pathogen--toolbar-variant="table"]'
      assert_no_selector 'div[role="toolbar"][class*="border"]'
    end

    test 'renders chip variant classes when requested' do
      render_inline(Pathogen::Toolbar.new(label: 'Compact actions', variant: :chip)) do
        ActionController::Base.helpers.tag.button(
          'Filter',
          type: 'button',
          tabindex: -1,
          data: { 'pathogen--toolbar-target': 'item' }
        )
      end

      assert_selector(
        'div[role="toolbar"][class*="inline-flex"][class*="border-[var(--pvc-color-border)]"]' \
        '[class*="bg-[var(--pvc-color-surface-muted)]"]'
      )
    end

    test 'fails fast when variant is invalid' do
      assert_raises(ArgumentError) { Pathogen::Toolbar.new(label: 'Actions', variant: :banner) }
    end

    test 'renders group layout wrapper without toolbar item target' do
      render_inline(Pathogen::Toolbar::Group.new) { 'Grouped controls' }

      assert_selector 'div[data-pathogen--toolbar-group][data-reflow="group"]', text: 'Grouped controls'
      assert_no_selector 'div[data-pathogen--toolbar-target]'
    end

    test 'renders alone reflow group data attribute' do
      render_inline(Pathogen::Toolbar::Group.new(reflow: :alone)) { 'Search' }

      assert_selector 'div[data-pathogen--toolbar-group][data-reflow="alone"]', text: 'Search'
    end

    test 'fails fast when group reflow is invalid' do
      assert_raises(ArgumentError) { Pathogen::Toolbar::Group.new(reflow: :stacked) }
    end

    test 'renders spacer without toolbar item target' do
      render_inline(Pathogen::Toolbar::Spacer.new)

      assert_selector 'div[role="presentation"][aria-hidden="true"][data-pathogen--toolbar-spacer]'
      assert_no_selector 'div[data-pathogen--toolbar-target]'
    end

    test 'supports detached form submit buttons' do
      render_inline(Pathogen::Toolbar::Button.new(form: 'select-all-form', label: 'Select all samples')) do
        'Select all'
      end

      assert_selector 'button[form="select-all-form"][aria-label="Select all samples"]', text: 'Select all'
    end

    test 'renders separator semantics without toolbar item target' do
      render_inline(Pathogen::Toolbar::Separator.new)

      assert_selector 'div[role="separator"][aria-orientation="vertical"][aria-hidden="true"]'
      assert_selector 'div[role="separator"][class*="bg-[var(--pvc-color-border-strong)]"]'
      assert_no_selector 'div[role="separator"][data-pathogen--toolbar-target]'
    end

    test 'custom controls participate only when explicitly targeted' do
      render_inline(Pathogen::Toolbar.new(label: 'Custom controls')) do
        ActionController::Base.helpers.safe_join(
          [
            ActionController::Base.helpers.tag.button('Untargeted', type: 'button', id: 'untargeted-control'),
            ActionController::Base.helpers.tag.button(
              'Targeted',
              type: 'button',
              id: 'targeted-control',
              tabindex: -1,
              data: { 'pathogen--toolbar-target': 'item' }
            )
          ]
        )
      end

      assert_selector '#targeted-control[data-pathogen--toolbar-target="item"]'
      assert_no_selector '#untargeted-control[data-pathogen--toolbar-target]'
    end

    test 'merges toolbar button target data values from caller and toolbar defaults' do
      render_inline(Pathogen::Toolbar::Button.new(data: { 'pathogen--toolbar-target': 'custom' })) { 'Custom target' }

      assert_selector 'button[data-pathogen--toolbar-target~="custom"][data-pathogen--toolbar-target~="item"]'
    end
  end
end
