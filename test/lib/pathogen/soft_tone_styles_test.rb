# frozen_string_literal: true

require 'test_helper'

module Pathogen
  class SoftToneStylesTest < ActiveSupport::TestCase
    include Pathogen::SoftToneStyles

    test 'every tone pairs a fill, a foreground, and a border' do
      Pathogen::SoftToneStyles::TONE_OPTIONS.each do |tone|
        tokens = soft_tone_classes(tone).split

        assert_equal 1, tokens.count { |token| token.start_with?('bg-') }, "#{tone} needs one fill"
        assert_equal 1, tokens.count { |token| token.start_with?('text-') }, "#{tone} needs one foreground"
        assert_equal 1, tokens.count { |token| token.start_with?('border-') }, "#{tone} needs one border"
      end
    end

    test 'success and warning avoid their base hue as a foreground' do
      %i[success warning].each do |tone|
        tokens = soft_tone_classes(tone).split

        assert_includes tokens, 'text-[var(--pvc-color-text)]'
        assert_not_includes tokens, "text-[var(--pvc-color-#{tone})]"
      end
    end

    test 'falls back to the default tone for an unknown tone' do
      assert_equal soft_tone_classes(Pathogen::SoftToneStyles::DEFAULT_TONE), soft_tone_classes(:fuchsia)
    end

    test 'badge and avatar share one ladder' do
      assert_equal Pathogen::SoftToneStyles::TONE_OPTIONS, Pathogen::Badge::TONE_OPTIONS
      assert_equal Pathogen::SoftToneStyles::TONE_OPTIONS, Pathogen::Avatar::TONE_OPTIONS
      assert_same Pathogen::Badge::SOFT_TONE_CLASSES, Pathogen::Avatar::SOFT_TONE_CLASSES
    end
  end
end
