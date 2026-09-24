# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ToastSettingsTest < ViewComponent::TestCase
    test 'renders a labelled native select wired to the settings controller' do
      render_inline(Pathogen::ToastSettings.new)

      assert_selector 'div[data-controller~="pathogen--toast-settings"]' \
                      '[data-pathogen--toast-settings-storage-key-value="pathogen.toast.durationMs"]'
      assert_selector 'label', text: 'Notification timing'
      assert_selector 'select[data-pathogen--toast-settings-target="select"]' \
                      '[data-action="change->pathogen--toast-settings#save"]'
      assert_selector 'option[value=""]', text: 'Default (6 seconds)'
      assert_selector 'option[value="20000"]', text: '20 seconds'
      assert_selector 'option[value="forever"]', text: 'Keep until I dismiss them'
    end

    test 'associates the label and description with the select' do
      render_inline(Pathogen::ToastSettings.new)

      label = page.find('label')
      select = page.find('select')
      assert_equal select[:id], label[:for]

      describedby = select['aria-describedby']
      assert describedby.present?
      assert_selector "##{describedby}", text: 'Choose how long'
    end

    test 'pre-selects the default option' do
      render_inline(Pathogen::ToastSettings.new)

      assert_selector 'option[value=""][selected]'
      assert_no_selector 'option[value="forever"][selected]'
    end

    test 'pre-selects an explicit selection' do
      render_inline(Pathogen::ToastSettings.new(selected: :forever))

      assert_selector 'option[value="forever"][selected]'
      assert_no_selector 'option[value=""][selected]'
    end

    test 'supports a custom storage key and option subset' do
      render_inline(Pathogen::ToastSettings.new(storage_key: 'app.toastDuration', options: %i[default forever]))

      assert_selector 'div[data-pathogen--toast-settings-storage-key-value="app.toastDuration"]'
      assert_selector 'option', count: 2
      assert_selector 'option[value=""]'
      assert_selector 'option[value="forever"]'
      assert_no_selector 'option[value="20000"]'
    end

    test 'localizes labels in french' do
      I18n.with_locale(:fr) do
        render_inline(Pathogen::ToastSettings.new)
      end

      assert_selector 'label', text: 'Durée des notifications'
      assert_selector 'option', text: 'Garder jusqu’à ce que je les ferme'
    end

    test 'passes axe structural checks' do
      render_inline(Pathogen::ToastSettings.new)
      assert_axe_structural_accessible rendered_content
    end
  end
end
