# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ToastTest < ViewComponent::TestCase
    test 'renders status toast without dismiss control or tabindex' do
      render_inline(
        Pathogen::Toast.new(
          type: :success,
          message: 'Batch created',
          description: '12 samples were assigned.'
        )
      )

      assert_selector 'li[data-controller~="pathogen--toast"][role="listitem"]' \
                      '[data-pathogen--toast-mode-value="status"]'
      assert_no_selector 'li[tabindex]'
      assert_selector 'p', text: 'Batch created'
      assert_selector 'p', text: '12 samples were assigned.'
      assert_selector '[data-pathogen--toast-target="dismiss"][hidden]', visible: :all
      assert_selector 'li[data-pathogen--toast-timeout-value="6000"]'
      assert_selector 'li[data-pathogen--toast-type-label-value="Success"]'
      assert_selector '[data-pathogen--toast-target="dialog"]:not([role]):not([tabindex])'
    end

    test 'normalizes rails flash aliases' do
      render_inline(Pathogen::Toast.new(type: :notice, message: 'Saved'))
      assert_selector 'li[data-pathogen--toast-type-value="info"][data-pathogen--toast-mode-value="status"]'

      render_inline(Pathogen::Toast.new(type: :alert, message: 'Failed'))
      assert_selector 'li[data-pathogen--toast-type-value="error"][data-pathogen--toast-mode-value="dialog"]'
    end

    test 'raises for unsupported type values in development and test environments' do
      error = assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) do
        render_inline(Pathogen::Toast.new(type: :unsupported, message: 'Unknown state'))
      end

      assert_match(/Expected one of/, error.message)
    end

    test 'errors are persistent notification dialogs' do
      render_inline(Pathogen::Toast.new(type: :error, message: 'Upload failed'))

      assert_selector 'li[role="listitem"][data-pathogen--toast-mode-value="dialog"]'
      assert_selector '[data-pathogen--toast-target="dialog"][role="dialog"][aria-modal="false"][tabindex="-1"]'
      assert_selector 'li[data-pathogen--toast-timeout-value="0"]'
      assert_selector 'li[data-pathogen--toast-persistent-value="true"]'
      assert_selector 'li[data-pathogen--toast-interrupt-value="false"]'
      assert_selector 'button[aria-label="Dismiss notification"]'
    end

    test 'warnings are persistent notification dialogs' do
      render_inline(Pathogen::Toast.new(type: :warning, message: 'Connection unstable', timeout: 9000))

      assert_selector 'li[data-pathogen--toast-mode-value="dialog"]'
      assert_selector '[role="dialog"][aria-modal="false"]'
      assert_selector 'li[data-pathogen--toast-timeout-value="0"]'
      assert_selector 'button[aria-label="Dismiss notification"]'
    end

    test 'action slot forces notification dialog mode' do
      render_inline(Pathogen::Toast.new(type: :info, message: 'Undo delete?', timeout: 9000)) do |toast|
        toast.with_action do
          ActionController::Base.helpers.button_tag('Undo', type: 'button')
        end
      end

      assert_selector 'li[data-pathogen--toast-mode-value="dialog"]'
      assert_selector '[role="dialog"]'
      assert_selector 'li[data-pathogen--toast-timeout-value="0"]'
      assert_selector 'li[data-pathogen--toast-persistent-value="true"]'
      assert_selector 'button', text: 'Undo'
    end

    test 'explicit dismissible promotes status toast to dialog' do
      render_inline(Pathogen::Toast.new(type: :info, message: 'Review complete', dismissible: true))

      assert_selector 'li[data-pathogen--toast-mode-value="dialog"]'
      assert_selector '[role="dialog"]'
      assert_selector 'li[data-pathogen--toast-timeout-value="0"]'
      assert_selector 'button[aria-label="Dismiss notification"]'
    end

    test 'non-positive status timeouts produce dismissible persistent dialogs' do
      [0, -100].each do |timeout|
        render_inline(Pathogen::Toast.new(message: 'Review complete', timeout: timeout))

        assert_selector 'li[data-pathogen--toast-mode-value="dialog"]' \
                        '[data-pathogen--toast-timeout-value="0"]' \
                        '[data-pathogen--toast-persistent-value="true"]' \
                        '[data-pathogen--toast-dismissible-value="true"]'
        assert_selector 'button[aria-label="Dismiss notification"]'
      end
    end

    test 'merges nested and flat host data attributes with required wiring' do
      render_inline(
        Pathogen::Toast.new(
          message: 'Saved',
          data: {
            controller: 'host-controller',
            action: 'click->host#record',
            'pathogen--toaster-target': 'host-target',
            qa_hook: 'notification'
          },
          'data-controller': 'analytics',
          'data-action': 'focusin->analytics#record',
          'data-pathogen--toaster-target': 'other-target'
        )
      )

      assert_selector 'li[data-controller="host-controller analytics pathogen--toast"]' \
                      '[data-action="click->host#record focusin->analytics#record"]' \
                      '[data-pathogen--toaster-target="host-target other-target toast"]' \
                      '[data-qa-hook="notification"]'
      root_markup = rendered_content[/<li\b[^>]*>/]
      assert_equal 1, root_markup.scan('data-controller=').length
      assert_equal 1, root_markup.scan('data-action=').length
      assert_equal 1, root_markup.scan('data-pathogen--toaster-target=').length
    end

    test 'interrupt opt-in is exposed for errors' do
      render_inline(Pathogen::Toast.new(type: :error, message: 'Critical failure', interrupt: true))

      assert_selector 'li[data-pathogen--toast-interrupt-value="true"]'
    end

    test 'raises when message is blank' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Toast.new(type: :info, message: nil))
      end

      assert_match(/message is required/, error.message)
    end

    test 'localizes dismiss label in french' do
      I18n.with_locale(:fr) do
        render_inline(Pathogen::Toast.new(type: :error, message: 'Mise à jour échouée'))
      end

      assert_selector 'button[aria-label="Fermer la notification"]'
      assert_selector 'li[data-pathogen--toast-type-label-value="Erreur"]'
    end

    test 'uses contract typography, status icon, and dismiss button styles for dialogs' do
      render_inline(
        Pathogen::Toast.new(
          type: :info,
          message: 'Sync running',
          description: 'Metadata updates in the background.',
          dismissible: true
        )
      )

      assert_no_selector '[class*="bg-[var(--pvc-color-success)]"]'
      assert_selector 'p.text-\\[length\\:var\\(--type-control\\)\\].font-semibold', text: 'Sync running'
      assert_selector 'p.text-\\[length\\:var\\(--type-control\\)\\].text-\\[var\\(--pvc-color-text-muted\\)\\]',
                      text: 'Metadata updates in the background.'
      assert_selector 'div.text-\\[var\\(--pvc-color-text-muted\\)\\]'
      assert_selector 'button[aria-label="Dismiss notification"][class*="aspect-square"]'
    end

    test 'status types use semantic icon colours' do
      render_inline(Pathogen::Toast.new(type: :success, message: 'Saved'))
      assert_selector 'div.text-\\[var\\(--pvc-color-success\\)\\]'

      render_inline(Pathogen::Toast.new(type: :warning, message: 'Skipped'))
      assert_selector 'div.text-\\[var\\(--pvc-color-warning\\)\\]'

      render_inline(Pathogen::Toast.new(type: :error, message: 'Failed'))
      assert_selector 'div.text-\\[var\\(--pvc-color-danger\\)\\]'
    end

    test 'dialog accessible name pairs severity label with message and describes via description' do
      render_inline(
        Pathogen::Toast.new(type: :error, message: 'Upload failed', description: 'The file is too large.')
      )

      dialog = page.find('[role="dialog"]', visible: :all)
      labelledby = dialog['aria-labelledby'].to_s.split
      assert_equal 2, labelledby.size
      assert_selector "##{labelledby.first}", text: 'Error:', visible: :all
      assert_selector "##{labelledby.last}", text: 'Upload failed', visible: :all

      describedby = dialog['aria-describedby']
      assert describedby.present?, 'expected aria-describedby for a described dialog'
      assert_selector "##{describedby}", text: 'The file is too large.', visible: :all
      assert_equal dialog['aria-labelledby'], dialog['data-dialog-labelledby']
      assert_equal describedby, dialog['data-dialog-describedby']
      assert_includes dialog[:class], 'focus-visible:outline-[var(--pvc-color-focus)]'
    end

    test 'status shell keeps labels ready for client promotion without dialog semantics' do
      render_inline(Pathogen::Toast.new(message: 'Saved', description: 'The records are up to date.'))

      shell = page.find('[data-pathogen--toast-target="dialog"]')
      assert_nil shell[:role]
      assert_nil shell[:tabindex]
      assert_nil shell['aria-labelledby']
      assert_nil shell['aria-describedby']
      assert_nil shell['aria-modal']
      shell['data-dialog-labelledby'].split.each do |id|
        assert_selector "##{id}", visible: :all
      end
      assert_selector "##{shell['data-dialog-describedby']}", text: 'The records are up to date.'
      assert_includes shell[:class], 'focus-visible:outline-[var(--pvc-color-focus)]'
    end

    test 'dialog without a description omits aria-describedby' do
      render_inline(Pathogen::Toast.new(type: :error, message: 'Upload failed'))

      assert_selector '[role="dialog"]:not([aria-describedby])'
    end

    test 'passes axe structural checks for status and dialog modes' do
      render_inline(Pathogen::Toast.new(type: :success, message: 'Saved'))
      assert_axe_structural_accessible rendered_content

      render_inline(Pathogen::Toast.new(type: :error, message: 'Failed'))
      assert_axe_structural_accessible rendered_content
    end
  end
end
