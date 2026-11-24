# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class BaseButtonTest < ViewComponent::TestCase
    test 'renders a native button with its type and caller attributes' do
      render_inline(Pathogen::BaseButton.new(type: :submit, classes: 'base-class', class: 'caller-class',
                                             style: 'width: 100%', data: { action: 'click->form#submit' },
                                             aria: { describedby: 'help' }, test_selector: 'save')) { 'Save' }

      assert_selector 'button[type="submit"].base-class.caller-class[style="width: 100%"]', text: 'Save'
      assert_selector 'button[data-action="click->form#submit"][aria-describedby="help"]'
      assert_selector 'button[data-test-selector="save"][data-view-component="true"]'
      assert_no_selector 'button[test_selector], button[classes]'
    end

    test 'defaults to a non-submitting button' do
      render_inline(Pathogen::BaseButton.new) { 'Cancel' }

      assert_selector 'button[type="button"]', text: 'Cancel'
    end

    test 'renders links without button-only type attributes' do
      render_inline(Pathogen::BaseButton.new(tag: :a, href: '/samples', type: :submit)) { 'Samples' }

      assert_selector 'a[href="/samples"]:not([type])', text: 'Samples'
    end

    test 'keeps the existing disabled anchor conversion' do
      render_inline(Pathogen::BaseButton.new(tag: :a, href: '/samples', disabled: true)) { 'Samples' }

      assert_selector 'button[disabled]', text: 'Samples'
      assert_no_selector 'a'
    end
  end
end
