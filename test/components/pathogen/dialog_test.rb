# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class DialogTest < ViewComponent::TestCase
    test 'renders a closed named native dialog with default heading and controller targets' do
      render_inline(Pathogen::Dialog.new(id: 'edit-sample', title: 'Edit sample')) { 'Sample details' }

      assert_selector '[data-controller="pathogen--dialog"]' \
                      '[data-pathogen--dialog-open-value="false"]'
      assert_selector 'dialog#edit-sample[data-pathogen--dialog-target="dialog"][data-size="medium"]' \
                      '[aria-labelledby="edit-sample-title"]:not([open]):not([tabindex])', visible: :all
      assert_selector 'dialog h2#edit-sample-title[tabindex="-1"][data-pathogen--dialog-target="title"]',
                      text: 'Edit sample', visible: :all
      %w[dialog panel header body content].each do |target|
        assert_selector "[data-pathogen--dialog-target='#{target}']", count: 1, visible: :all
      end
      assert_selector '[data-pathogen--dialog-part="body"] > [data-pathogen--dialog-part="content"]',
                      text: 'Sample details', visible: :all
      assert_selector '[data-pathogen--dialog-part="heading"] > h2.font-bold', visible: :all
      assert_no_selector '[data-pathogen--dialog-part="footer"]', visible: :all
      assert_no_selector 'dialog[aria-describedby], dialog[aria-label], dialog[role]', visible: :all
    end

    test 'open requests modal opening through the controller without setting the native open attribute' do
      render_inline(Pathogen::Dialog.new(title: 'Mounted dialog', open: true)) { 'Content' }

      assert_selector '[data-controller="pathogen--dialog"][data-pathogen--dialog-open-value="true"]'
      assert_selector 'dialog:not([open])', visible: :all
    end

    test 'generates distinct native dialog and title ids when omitted' do
      first = Pathogen::Dialog.new(title: 'First dialog')
      second = Pathogen::Dialog.new(title: 'Second dialog')

      assert_not_equal first.id, second.id
      assert_match(/\Adialog-/, first.id)
      render_inline(first) { 'Content' }
      assert_selector "dialog##{first.id}[aria-labelledby='#{first.id}-title']", visible: :all
    end

    test 'associates the optional short description' do
      component = Pathogen::Dialog.new(id: 'confirm', title: 'Confirm action', description: 'Review before saving.')
      render_inline(component) do
        'Long body content'
      end

      assert_selector 'dialog#confirm[aria-describedby="confirm-description"]', visible: :all
      assert_selector '[data-pathogen--dialog-part="header"] p#confirm-description', text: 'Review before saving.', visible: :all
      assert_no_selector '[data-pathogen--dialog-part="body"][aria-describedby]', visible: :all
    end

    test 'omits blank descriptions and allows a configurable heading level' do
      render_inline(Pathogen::Dialog.new(title: 'Nested task', description: ' ', heading_level: 3)) { 'Content' }

      assert_selector 'dialog h3[data-pathogen--dialog-part="title"]', text: 'Nested task', visible: :all
      assert_no_selector 'dialog[aria-describedby], [data-pathogen--dialog-part="description"]', visible: :all
    end

    test 'renders every documented size' do
      Pathogen::Dialog::SIZE_OPTIONS.each do |size|
        render_inline(Pathogen::Dialog.new(title: 'Sized dialog', size: size)) { 'Content' }
        assert_selector "dialog[data-size='#{size}']", visible: :all
      end
    end

    test 'passes initial and return focus selectors to the wrapper' do
      render_inline(Pathogen::Dialog.new(title: 'Focus', initial_focus: '#cancel', return_focus: '#new-opener')) do
        'Content'
      end

      assert_selector '[data-controller="pathogen--dialog"][data-pathogen--dialog-initial-focus-value="#cancel"]' \
                      '[data-pathogen--dialog-return-focus-value="#new-opener"]'
    end

    test 'omits absent or blank focus selectors' do
      render_inline(Pathogen::Dialog.new(title: 'Focus', initial_focus: '', return_focus: ' ')) { 'Content' }

      assert_no_selector '[data-pathogen--dialog-initial-focus-value], [data-pathogen--dialog-return-focus-value]'
    end

    test 'renders a named medium close button with dismissal wiring' do
      render_inline(Pathogen::Dialog.new(title: 'Close')) { 'Content' }

      assert_selector 'dialog button[type="button"][aria-label="Close dialog"]' \
                      '[data-action="click->pathogen--dialog#requestClose"].h-11.w-11', visible: :all
      assert_selector 'dialog button [aria-hidden="true"] svg[aria-hidden="true"]', visible: :all
    end

    test 'localizes the close button in French' do
      I18n.with_locale(:fr) do
        render_inline(Pathogen::Dialog.new(title: 'Modifier')) { 'Contenu' }
        assert_selector 'dialog button[aria-label="Fermer la fenêtre de dialogue"]', visible: :all
      end
    end

    test 'renders the footer as host-composed content' do
      render_inline(Pathogen::Dialog.new(title: 'Actions')) do |dialog|
        dialog.with_footer { '<button type="button">Save changes</button>'.html_safe }
        'Content'
      end

      assert_selector 'footer[data-pathogen--dialog-part="footer"][data-pathogen--dialog-target="footer"] > button',
                      text: 'Save changes', visible: :all
    end

    test 'renders the typed trigger as a button outside the modal with caller and owned actions' do
      render_inline(Pathogen::Dialog.new(id: 'triggered', title: 'Triggered')) do |dialog|
        dialog.with_trigger(tone: :primary, emphasis: :solid, classes: 'host-trigger',
                            data: { action: 'click->analytics#track', controller: 'analytics' }) { 'Open dialog' }
        'Content'
      end

      assert_selector '[data-controller="pathogen--dialog"] > button.host-trigger[type="button"][aria-controls="triggered"]' \
                      '[aria-haspopup="dialog"][data-controller="analytics"]' \
                      '[data-action="click->analytics#track click->pathogen--dialog#openFromTrigger"]',
                      text: 'Open dialog'
      assert_no_selector 'dialog button[aria-controls="triggered"]', visible: :all
    end

    test 'protects typed trigger semantics against flattened and nested overrides' do
      render_inline(Pathogen::Dialog.new(id: 'owned-trigger', title: 'Trigger')) do |dialog|
        dialog.with_trigger(tag: :a, type: :submit, href: '/elsewhere', text: 'Open',
                            aria: { controls: 'wrong', haspopup: 'menu' },
                            'aria-controls': 'also-wrong', 'aria-haspopup': 'listbox',
                            'data-action': 'click->analytics#track')
        'Content'
      end

      assert_selector '[data-controller="pathogen--dialog"] > button[type="button"][aria-controls="owned-trigger"]' \
                      '[aria-haspopup="dialog"]:not([href])' \
                      '[data-action="click->analytics#track click->pathogen--dialog#openFromTrigger"]', text: 'Open'
      assert_no_selector '[data-controller="pathogen--dialog"] > a'
    end

    test 'protects the dialog controller and targets from typed trigger attributes' do
      render_inline(Pathogen::Dialog.new(id: 'protected-trigger', title: 'Protected trigger')) do |dialog|
        dialog.with_trigger(text: 'Open', data: {
                              controller: 'analytics pathogen--dialog',
                              'pathogen--dialog-target': 'dialog'
                            })
        'Content'
      end

      assert_selector '[data-controller="pathogen--dialog"] > button[data-controller="analytics"]', text: 'Open'
      assert_no_selector '[data-controller="pathogen--dialog"] > button[data-pathogen--dialog-target]'
      assert_selector '[data-controller~="pathogen--dialog"]', count: 1, visible: :all
      assert_selector '[data-pathogen--dialog-target="dialog"]', count: 1, visible: :all
    end

    test 'applies caller native attributes without changing component semantics or targets' do
      render_inline(Pathogen::Dialog.new(
                      id: 'protected', title: 'Visible name', classes: 'host-dialog', lang: 'fr',
                      role: 'alertdialog', tabindex: 0, hidden: true, inert: true,
                      aria: { label: 'Wrong name', labelledby: 'wrong-title', describedby: 'wrong-description',
                              modal: false, hidden: true, details: 'extra-details' },
                      data: { controller: 'pathogen--dialog host-controller', action: 'click->host-controller#track',
                              'pathogen--dialog-target': 'body', size: 'wrong' }
                    )) { 'Content' }

      assert_selector 'dialog#protected.host-dialog[lang="fr"][aria-labelledby="protected-title"]' \
                      '[aria-details="extra-details"][data-size="medium"][data-pathogen--dialog-target="dialog"]' \
                      '[data-controller="host-controller"][data-action="click->host-controller#track"]', visible: :all
      assert_no_selector 'dialog[role], dialog[tabindex], dialog[hidden], dialog[inert], dialog[aria-label],' \
                         'dialog[aria-describedby], dialog[aria-modal], dialog[aria-hidden]', visible: :all
    end

    test 'protects flattened native attributes and preserves flattened caller wiring' do
      render_inline(Pathogen::Dialog.new(
                      id: 'flat', title: 'Flat attributes', 'open' => true, 'aria-label' => 'Wrong name',
                      'aria-labelledby' => 'wrong-title', 'data-controller' => 'host-controller',
                      'data-action' => 'click->host-controller#track', 'data-pathogen--dialog-target' => 'footer'
                    )) { 'Content' }

      assert_selector 'dialog#flat[aria-labelledby="flat-title"][data-controller="host-controller"]' \
                      '[data-action="click->host-controller#track"][data-pathogen--dialog-target="dialog"]',
                      visible: :all
      assert_no_selector 'dialog[open], dialog[aria-label]', visible: :all
    end

    test 'requires a nonblank title and body content' do
      [nil, '', ' '].each do |title|
        error = assert_raises(ArgumentError) { render_inline(Pathogen::Dialog.new(title: title)) { 'Content' } }
        assert_match(/nonblank title/, error.message)
      end
      error = assert_raises(ArgumentError) { render_inline(Pathogen::Dialog.new(title: 'Missing body')) }
      assert_match(/content block/, error.message)
    end

    test 'rejects invalid headings selectors and the class argument' do
      [0, 7, 'invalid'].each do |level|
        assert_raises(ArgumentError) { Pathogen::Dialog.new(title: 'Invalid heading', heading_level: level) }
      end
      %i[initial_focus return_focus].each do |name|
        assert_raises(ArgumentError) { Pathogen::Dialog.new(title: 'Invalid selector', **{ name => :title }) }
      end
      assert_raises(ArgumentError) { Pathogen::Dialog.new(title: 'Invalid class', class: 'custom') }
      assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) do
        Pathogen::Dialog.new(title: 'Invalid size', size: :unknown)
      end
    end
  end
end
