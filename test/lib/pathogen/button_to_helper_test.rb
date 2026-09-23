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

      assert_includes html, 'text-(--pvc-color-danger-strong)'
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

    test 'preserves rich block content and trims its surrounding whitespace' do
      html = @view.pathogen_button_to('/retry', method: :post) do
        @view.safe_join(['  ', @view.tag.strong('Retry'), ' now  '])
      end
      fragment = Nokogiri::HTML.fragment(html)

      assert_equal 1, fragment.css('form button').size
      assert_equal '<strong>Retry</strong> now', fragment.at_css('button > span').inner_html
      assert_nil fragment.at_css('button button')
    end

    test 'escapes plain text labels and block content' do
      ['<script>alert(1)</script>', '<em>Retry</em>'].each do |text|
        html = @view.pathogen_button_to(text, '/retry')
        block_html = @view.pathogen_button_to('/retry') { text }

        [html, block_html].each do |output|
          fragment = Nokogiri::HTML.fragment(output)
          assert_nil fragment.at_css('button script, button em')
          assert_equal text, fragment.at_css('button').text.strip
        end
      end
    end

    test 'preserves form ownership and button attributes' do
      html = @view.pathogen_button_to('Save', '/save', method: :patch, disabled: true,
                                                       form: { id: 'save-form', data: { turbo: false } },
                                                       data: { action: 'click->save#track' },
                                                       aria: { describedby: 'save-help' },
                                                       name: 'commit', value: 'save')
      fragment = Nokogiri::HTML.fragment(html)

      assert_equal 1, fragment.css('form#save-form[data-turbo="false"]').size
      assert_equal 1, fragment.css('input[name="_method"][value="patch"]').size
      button = fragment.at_css('button')
      assert_equal 'submit', button['type']
      assert button.key?('disabled')
      assert_equal 'click->save#track', button['data-action']
      assert_equal 'save-help', button['aria-describedby']
      assert_equal 'commit', button['name']
      assert_equal 'save', button['value']
    end

    test 'preserves the Rails authenticity token' do
      @view.define_singleton_method(:protect_against_forgery?) { true }
      @view.define_singleton_method(:request_forgery_protection_token) { :authenticity_token }
      html = @view.pathogen_button_to('Save', '/save', authenticity_token: 'test-authenticity-token')

      assert_equal 'test-authenticity-token',
                   Nokogiri::HTML.fragment(html).at_css('input[name="authenticity_token"]')['value']
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
