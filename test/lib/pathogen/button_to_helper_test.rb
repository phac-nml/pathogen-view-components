# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ButtonToHelperTest < ActiveSupport::TestCase
    setup do
      @view = ActionView::Base.empty
    end

    test 'renders a form with a Pathogen submit button' do
      html = @view.pathogen_button_to('Delete', '/posts/1', method: :delete, tone: :danger, emphasis: :outline)

      assert_includes html, '<form'
      assert_includes html, 'action="/posts/1"'
      assert_includes html, 'type="submit"'
      assert_includes html, 'Delete'
      assert_includes html, 'name="_method"'
      assert_includes html, 'value="delete"'
    end

    test 'forwards Pathogen tone and emphasis to the button component' do
      html = @view.pathogen_button_to('Remove', '/items/2', tone: :danger, emphasis: :outline)

      assert_includes html, 'text-[var(--pvc-color-danger-strong)]'
    end

    test 'renders block content inside the Pathogen button' do
      html = @view.pathogen_button_to('/retry', method: :post, tone: :primary, emphasis: :solid) do
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

    test 'preserves caller class attributes on submit button output' do
      html = @view.pathogen_button_to('Save', '/save', class: 'custom-class')

      assert_match(/<button[^>]*class="[^"]*custom-class[^"]*"/, html)
    end

    test 'rejects slot-style block usage' do
      error = assert_raises(ArgumentError) do
        @view.pathogen_button_to('/retry', method: :post) do |_button|
          'Retry now'
        end
      end

      assert_match('only supports plain block content', error.message)
    end

    test 'rejects base_button_class override' do
      error = assert_raises(ArgumentError) do
        @view.pathogen_button_to('Retry', '/retry', base_button_class: Pathogen::BaseButton)
      end

      assert_match('does not support :base_button_class', error.message)
    end

    test 'rejects icon_only usage' do
      error = assert_raises(ArgumentError) do
        @view.pathogen_button_to('Retry', '/retry', icon_only: true)
      end

      assert_match('does not support icon_only', error.message)
    end
  end
end
