# frozen_string_literal: true

require 'test_helper'

module Pathogen
  # Test suite for Pathogen::Button component
  class ButtonTest < ViewComponent::TestCase
    test 'renders with base Pathogen button class' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector 'button.pathogen-button'
      assert_text 'Click me'
    end

    test 'renders with default scheme class' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector 'button.pathogen-button--scheme-default'
    end

    test 'renders with primary scheme class' do
      render_inline(Pathogen::Button.new(scheme: :primary)) { 'Submit' }

      assert_selector 'button.pathogen-button--scheme-primary'
    end

    test 'renders with slate scheme class' do
      render_inline(Pathogen::Button.new(scheme: :slate)) { 'Cancel' }

      assert_selector 'button.pathogen-button--scheme-slate'
    end

    test 'renders with danger scheme class' do
      render_inline(Pathogen::Button.new(scheme: :danger)) { 'Delete' }

      assert_selector 'button.pathogen-button--scheme-danger'
    end

    test 'renders with medium size class by default' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector 'button.pathogen-button--size-medium'
    end

    test 'renders with small size class' do
      render_inline(Pathogen::Button.new(size: :small)) { 'Small' }

      assert_selector 'button.pathogen-button--size-small'
    end

    test 'renders with block class when block: true' do
      render_inline(Pathogen::Button.new(block: true)) { 'Block button' }

      assert_selector 'button.pathogen-button--block'
    end

    test 'renders disabled button' do
      render_inline(Pathogen::Button.new(disabled: true)) { 'Disabled' }

      assert_selector 'button[disabled]'
    end

    test 'does not emit Tailwind utility classes' do
      render_inline(Pathogen::Button.new(scheme: :primary, size: :small)) { 'Submit' }

      tailwind_patterns = %w[bg-primary bg-slate text-white px-3 py-2 rounded-lg font-medium]
      tailwind_patterns.each do |cls|
        assert_no_selector "button[class*='#{cls}']"
      end
    end
  end
end
