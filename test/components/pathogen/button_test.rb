# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class ButtonTest < ViewComponent::TestCase
    test 'renders button with Tailwind base layout and 44px touch target' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector 'button.inline-flex.min-h-11.min-w-11.items-center.rounded-lg', text: 'Click me'
    end

    test 'default scheme uses white surface and visible border' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector "button[class*='border-neutral-300']"
      assert_selector "button[class*='bg-white']"
    end

    test 'primary scheme uses brand background and shadow' do
      render_inline(Pathogen::Button.new(scheme: :primary)) { 'Submit' }

      assert_selector "button[class*='bg-primary-700']"
      assert_selector "button[class*='text-white']"
      assert_selector "button[class*='shadow-sm']"
    end

    test 'danger scheme uses bordered outline destructive style' do
      render_inline(Pathogen::Button.new(scheme: :danger)) { 'Delete' }

      assert_selector "button[class*='text-red-600']"
      assert_selector "button[class*='bg-white']"
      assert_selector "button[class*='border-red-300']"
    end

    test 'medium size padding by default' do
      render_inline(Pathogen::Button.new) { 'Click me' }

      assert_selector 'button.px-3.py-2.text-sm'
    end

    test 'small size uses compact padding' do
      render_inline(Pathogen::Button.new(size: :small)) { 'Small' }

      assert_selector "button[class*='px-2.5']"
      assert_selector 'button.text-xs'
    end

    test 'block layout is full width flex' do
      render_inline(Pathogen::Button.new(block: true)) { 'Block button' }

      assert_selector 'button.flex.w-full'
    end

    test 'renders disabled button' do
      render_inline(Pathogen::Button.new(disabled: true)) { 'Disabled' }

      assert_selector 'button[disabled]'
    end

    test 'emits expected Tailwind utility classes for primary small' do
      render_inline(Pathogen::Button.new(scheme: :primary, size: :small)) { 'Submit' }

      assert_selector "button[class*='text-white']"
      assert_selector 'button.text-xs'
    end

    test 'leading and trailing visuals are hidden from assistive technology' do
      render_inline(Pathogen::Button.new) do |button|
        button.with_leading_visual { 'Leading' }
        button.with_trailing_visual { 'Trailing' }
        'Search'
      end

      assert_selector 'button [aria-hidden="true"]', count: 2
      assert_selector 'button', text: 'Search'
    end
  end
end
