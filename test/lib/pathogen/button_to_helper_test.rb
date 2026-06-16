# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ButtonToHelperTest < ActiveSupport::TestCase
    setup do
      @view = ActionView::Base.empty
    end

    test 'renders a form with a Pathogen submit button' do
      html = @view.pathogen_button_to('Delete', '/posts/1', method: :delete, scheme: :danger)

      assert_includes html, '<form'
      assert_includes html, 'action="/posts/1"'
      assert_includes html, 'type="submit"'
      assert_includes html, 'Delete'
      assert_includes html, 'name="_method"'
      assert_includes html, 'value="delete"'
    end

    test 'forwards Pathogen scheme to the button component' do
      html = @view.pathogen_button_to('Remove', '/items/2', scheme: :danger)

      assert_includes html, 'text-[var(--pvc-color-danger-strong)]'
    end

    test 'renders block content inside the Pathogen button' do
      html = @view.pathogen_button_to('/retry', method: :post, scheme: :primary) do
        'Retry now'
      end

      assert_includes html, 'Retry now'
      assert_no_match(/<button[^>]*>.*<button/m, html)
    end

    test 'includes extra params as hidden fields' do
      html = @view.pathogen_button_to('Go', '/go', params: { token: 'abc' })

      assert_includes html, 'name="token"'
      assert_includes html, 'value="abc"'
    end
  end
end
