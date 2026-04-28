# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module Typography
    # Test suite for Heading component
    class HeadingTest < ViewComponent::TestCase
      test 'renders h1 with correct semantic HTML' do
        render_inline(Heading.new(level: 1)) { 'Test Heading' }

        assert_selector 'h1', text: 'Test Heading'
      end

      test 'renders all heading levels correctly' do
        (1..6).each do |level|
          render_inline(Heading.new(level: level)) { "Heading #{level}" }

          assert_selector "h#{level}", text: "Heading #{level}"
        end
      end

      test 'applies responsive sizing classes by default' do
        render_inline(Heading.new(level: 1)) { 'Test' }

        assert_selector 'h1.pathogen-typography--size-3xl.sm\\:pathogen-typography--size-5xl'
      end

      test 'applies fixed sizing when responsive is false' do
        render_inline(Heading.new(level: 1, responsive: false)) { 'Test' }

        assert_selector 'h1.pathogen-typography--size-3xl'
        assert_no_selector 'h1.sm\\:pathogen-typography--size-5xl'
      end

      test 'applies variant color classes' do
        render_inline(Heading.new(level: 2)) { 'Test' }
        assert_selector 'h2.pathogen-typography--color-default'

        render_inline(Heading.new(level: 2, variant: :muted)) { 'Test' }
        assert_selector 'h2.pathogen-typography--color-muted'

        render_inline(Heading.new(level: 2, variant: :subdued)) { 'Test' }
        assert_selector 'h2.pathogen-typography--color-subdued'

        render_inline(Heading.new(level: 2, variant: :inverse)) { 'Test' }
        assert_selector 'h2.pathogen-typography--color-inverse'
      end

      test 'applies typography classes' do
        render_inline(Heading.new(level: 1)) { 'Test' }
        assert_selector 'h1.pathogen-typography--font-ui'
        assert_selector 'h1.pathogen-typography--leading-heading.pathogen-typography--tracking-tight'

        render_inline(Heading.new(level: 3)) { 'Test' }
        assert_selector 'h3.pathogen-typography--tracking-normal'
      end

      test 'merges custom classes with component classes' do
        render_inline(Heading.new(level: 1, class: 'custom-class mb-4')) { 'Test' }

        assert_selector 'h1.custom-class.mb-4.pathogen-typography--size-3xl'
      end

      test 'accepts additional HTML attributes' do
        render_inline(Heading.new(level: 1, id: 'main-heading', data: { controller: 'tooltip' })) { 'Test' }

        assert_selector 'h1#main-heading[data-controller="tooltip"]'
      end

      test 'validates level and variant inputs' do
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) { Heading.new(level: 0) }
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) { Heading.new(level: 10) }
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) { Heading.new(level: -1) }
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) { Heading.new(level: 'invalid') }
        assert_raises(Pathogen::FetchOrFallbackHelper::InvalidValueError) { Heading.new(level: 1, variant: :invalid) }

        render_inline(Heading.new(level: '2')) { 'Test' }
        assert_selector 'h2', text: 'Test'
      end

      test 'applies responsive sizing correctly' do
        render_inline(Heading.new(level: 1)) { 'Test' }
        assert_selector 'h1.pathogen-typography--size-3xl.sm\\:pathogen-typography--size-5xl'

        render_inline(Heading.new(level: 2)) { 'Test' }
        assert_selector 'h2.pathogen-typography--size-2xl.sm\\:pathogen-typography--size-4xl'

        render_inline(Heading.new(level: 3, responsive: false)) { 'Test' }
        assert_selector 'h3.pathogen-typography--size-xl'
        assert_no_selector 'h3.sm\\:pathogen-typography--size-3xl'
      end
    end
  end
end
