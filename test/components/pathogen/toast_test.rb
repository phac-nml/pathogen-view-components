# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ToastTest < ViewComponent::TestCase
    test 'renders message, description, and close button' do
      render_inline(
        Pathogen::Toast.new(
          type: :success,
          message: 'Batch created',
          description: '12 samples were assigned.'
        )
      )

      assert_selector 'li[data-controller~="pathogen--toast"][role="listitem"][tabindex="0"]'
      assert_selector 'p', text: 'Batch created'
      assert_selector 'p', text: '12 samples were assigned.'
      assert_selector 'button[aria-label="Dismiss notification"]'
      assert_selector 'li[data-pathogen--toast-timeout-value="6000"]'
    end

    test 'normalizes rails flash aliases' do
      render_inline(Pathogen::Toast.new(type: :notice, message: 'Saved'))
      assert_selector 'li[data-pathogen--toast-type-value="info"]'

      render_inline(Pathogen::Toast.new(type: :alert, message: 'Failed'))
      assert_selector 'li[data-pathogen--toast-type-value="error"]'
    end

    test 'errors are persistent and route as error type' do
      render_inline(Pathogen::Toast.new(type: :error, message: 'Upload failed'))

      assert_selector 'li[data-pathogen--toast-type-value="error"]'
      assert_selector 'li[data-pathogen--toast-timeout-value="0"]'
      assert_selector "li[class*='border-[var(--pvc-color-border)]']"
    end

    test 'action slot disables auto-dismiss timing' do
      render_inline(Pathogen::Toast.new(type: :info, message: 'Undo delete?', timeout: 9000)) do |toast|
        toast.with_action do
          ActionController::Base.helpers.button_tag('Undo', type: 'button')
        end
      end

      assert_selector 'li[data-pathogen--toast-timeout-value="0"]'
      assert_selector 'button', text: 'Undo'
    end

    test 'supports dismissible false without close button' do
      render_inline(Pathogen::Toast.new(type: :info, message: 'Background sync started', dismissible: false))

      assert_no_selector 'button[aria-label="Dismiss notification"]'
    end

    test 'raises when message is blank' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Toast.new(type: :info, message: nil))
      end

      assert_match(/message is required/, error.message)
    end

    test 'localizes dismiss label in french' do
      I18n.with_locale(:fr) do
        render_inline(Pathogen::Toast.new(type: :info, message: 'Mise à jour enregistrée'))
      end

      assert_selector 'button[aria-label="Fermer la notification"]'
    end

    test 'uses contract typography, status icon, and dismiss button styles' do
      render_inline(
        Pathogen::Toast.new(
          type: :info,
          message: 'Sync running',
          description: 'Metadata updates in the background.'
        )
      )

      assert_no_selector '[class*="bg-[var(--pvc-color-success)]"]'
      assert_selector 'p.text-\\[length\\:var\\(--type-control\\)\\].font-semibold', text: 'Sync running'
      assert_selector 'p.text-\\[length\\:var\\(--type-control\\)\\].text-\\[var\\(--pvc-color-text-muted\\)\\]',
                      text: 'Metadata updates in the background.'
      assert_selector 'span.text-\\[var\\(--pvc-color-text-muted\\)\\]'
      assert_selector 'button[aria-label="Dismiss notification"][class*="aspect-square"]'
    end

    test 'status types use semantic icon colours' do
      render_inline(Pathogen::Toast.new(type: :success, message: 'Saved'))
      assert_selector 'span.text-\\[var\\(--pvc-color-success\\)\\]'

      render_inline(Pathogen::Toast.new(type: :warning, message: 'Skipped'))
      assert_selector 'span.text-\\[var\\(--pvc-color-warning\\)\\]'

      render_inline(Pathogen::Toast.new(type: :error, message: 'Failed'))
      assert_selector 'span.text-\\[var\\(--pvc-color-danger\\)\\]'
    end

    test 'passes axe structural checks' do
      render_inline(Pathogen::Toast.new(type: :warning, message: 'Threshold exceeded'))

      assert_axe_structural_accessible rendered_content
    end
  end
end
