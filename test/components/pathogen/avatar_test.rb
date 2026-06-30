# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class AvatarTest < ViewComponent::TestCase
    test 'renders medium fallback avatar with initials from label' do
      render_inline(Pathogen::Avatar.new(label: 'John Doe'))

      assert_selector 'span[role="img"][aria-label="John Doe"]'
      assert_selector "span[class*='h-12'][class*='w-12']"
      assert_text 'JD'
    end

    test 'renders image avatar when src is provided' do
      render_inline(Pathogen::Avatar.new(label: 'John Doe', src: '/images/john-doe.png'))

      assert_selector "span[role='img'][aria-label='John Doe'] img[src='/images/john-doe.png'][alt='']"
      assert_no_text 'JD'
    end

    test 'renders linked avatar without img role' do
      render_inline(Pathogen::Avatar.new(label: 'John Doe', initials: 'JD', url: '/users/1'))

      assert_selector "a[href='/users/1'][aria-label='John Doe']"
      assert_no_selector 'a[role="img"]'
      assert_text 'JD'
    end

    test 'renders decorative avatar hidden from assistive technology' do
      render_inline(Pathogen::Avatar.new(label: 'John Doe', initials: 'JD', decorative: true))

      assert_selector 'span[aria-hidden="true"]'
      assert_no_selector '[aria-label]'
      assert_no_selector '[role="img"]'
    end

    test 'renders generic icon when decorative avatar has no label or initials' do
      render_inline(Pathogen::Avatar.new(decorative: true))

      assert_selector 'span[aria-hidden="true"] svg[aria-hidden="true"]'
    end

    test 'supports shape and size variants' do
      render_inline(Pathogen::Avatar.new(label: 'John Doe', size: :small, shape: :square))

      assert_selector "span[class*='h-8'][class*='w-8'][class*='rounded-sm']"
    end

    test 'raises when label is missing for non-decorative avatars' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Avatar.new(label: '   '))
      end

      assert_equal 'label is required unless decorative is true', error.message
    end

    test 'raises when decorative avatar is also interactive' do
      error = assert_raises(ArgumentError) do
        render_inline(Pathogen::Avatar.new(label: 'John Doe', decorative: true, url: '/users/1'))
      end

      assert_equal 'decorative avatars cannot be interactive links', error.message
    end

    test 'uses deterministic fallback palette classes for a fixed seed' do
      render_inline(Pathogen::Avatar.new(label: 'John Doe', colour_seed: 'stable-seed-a'))

      first_classes = page.find('span')['class']

      render_inline(Pathogen::Avatar.new(label: 'Jane Doe', colour_seed: 'stable-seed-a'))

      second_classes = page.find('span')['class']

      assert_equal first_classes, second_classes
    end

    test 'passes axe-core checks for fallback avatar' do
      render_inline(Pathogen::Avatar.new(label: 'John Doe', initials: 'JD'))

      assert_axe_structural_accessible rendered_content, context: 'fallback avatar'
    end

    test 'passes axe-core checks for linked avatar' do
      render_inline(Pathogen::Avatar.new(label: 'John Doe', initials: 'JD', url: '/users/1'))

      assert_axe_structural_accessible rendered_content, context: 'linked avatar'
    end
  end
end
