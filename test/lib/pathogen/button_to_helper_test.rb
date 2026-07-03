# frozen_string_literal: true

require 'test_helper'
require 'nokogiri'

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

    test 'detached renders a hidden form and a button linked through the form attribute' do
      html = @view.pathogen_button_to('Delete', '/posts/1', method: :delete, detached: true,
                                                            tone: :danger, emphasis: :outline)
      fragment = Nokogiri::HTML::DocumentFragment.parse(html)

      form = fragment.at_css('form')
      button = fragment.at_css('button')

      assert_not_nil form
      assert_not_nil button
      assert_equal '/posts/1', form['action']
      assert_equal 'post', form['method']
      assert_includes form['class'], 'button_to'
      assert_includes form['class'], 'hidden'
      assert_equal 'delete', form.at_css('input[name="_method"]')['value']

      # The button is a sibling of the form, not nested inside it.
      assert_nil form.at_css('button')
      assert_equal 'submit', button['type']
      assert_equal form['id'], button['form']
      assert form['id'].present?
    end

    test 'detached accepts string-keyed helper options' do
      html = @view.pathogen_button_to('Delete', '/posts/1', { 'method' => :delete, 'detached' => true })
      fragment = Nokogiri::HTML::DocumentFragment.parse(html)

      form = fragment.at_css('form')
      button = fragment.at_css('button')

      assert_not_nil form
      assert_not_nil button
      assert_includes form['class'], 'button_to'
      assert_includes form['class'], 'hidden'
      assert_equal form['id'], button['form']
      assert_nil button['detached']
    end

    test 'detached honours a custom form id and class' do
      html = @view.pathogen_button_to('Remove', '/items/2', method: :delete, detached: true,
                                                            form: { id: 'remove-item-2', class: 'sr-only' })
      fragment = Nokogiri::HTML::DocumentFragment.parse(html)

      assert_equal 'remove-item-2', fragment.at_css('form')['id']
      assert_equal 'sr-only', fragment.at_css('form')['class']
      assert_equal 'remove-item-2', fragment.at_css('button')['form']
    end

    test 'detached keeps params as hidden fields inside the form' do
      html = @view.pathogen_button_to('Go', '/go', detached: true, params: { token: 'abc', nested: { id: 4 } })
      fragment = Nokogiri::HTML::DocumentFragment.parse(html)
      form = fragment.at_css('form')

      assert_not_nil form.at_css('input[name="token"][value="abc"]')
      assert_not_nil form.at_css('input[name="nested[id]"][value="4"]')
      assert_nil fragment.at_css('button input')
    end

    test 'detached supports block content in the button' do
      html = @view.pathogen_button_to('/retry', method: :post, detached: true,
                                                tone: :primary, emphasis: :solid) do
        'Retry now'
      end
      fragment = Nokogiri::HTML::DocumentFragment.parse(html)

      assert_includes fragment.at_css('button').text, 'Retry now'
      assert_equal fragment.at_css('form')['id'], fragment.at_css('button')['form']
    end

    test 'non-detached keeps the button nested inside the form' do
      html = @view.pathogen_button_to('Save', '/save', method: :post)
      fragment = Nokogiri::HTML::DocumentFragment.parse(html)

      assert_not_nil fragment.at_css('form button')
      assert_nil fragment.at_css('button')['form']
    end
  end
end
