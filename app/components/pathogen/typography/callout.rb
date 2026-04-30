# frozen_string_literal: true

require_relative 'constants'
require_relative 'shared'

module Pathogen
  module Typography
    # Callout component for Pathogen Typography System
    class Callout < Component
      include Shared

      DEFAULT_TAG = :p

      attr_reader :tag, :variant, :responsive

      def initialize(tag: DEFAULT_TAG, variant: Shared::DEFAULT_VARIANT, responsive: false, **system_arguments)
        @tag = tag
        @variant = variant
        @responsive = responsive
        @system_arguments = system_arguments

        @system_arguments[:class] = class_names(
          system_arguments[:class],
          'font-sans',
          size_classes,
          color_classes_for_variant(@variant),
          Constants::LINE_HEIGHTS[:body],
          Constants::FONT_FAMILIES[:ui]
        )
      end

      private

      def size_classes = Constants::TYPOGRAPHY_SCALE[18]
    end
  end
end
