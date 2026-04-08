# frozen_string_literal: true

require_relative 'constants'
require_relative 'shared'

module Pathogen
  module Typography
    # Component for rendering callout text (18px / 1.125rem)
    #
    # Callout text sits between body and lead, perfect for emphasized
    # paragraphs, pull quotes, or sidebar content. Supports optional responsive sizing.
    #
    # @example Basic callout
    #   <%= render Pathogen::Typography::Callout.new do %>
    #     This is an important callout that draws attention.
    #   <% end %>
    #
    # @example Responsive sizing
    #   <%= render Pathogen::Typography::Callout.new(responsive: true, variant: :muted) do %>
    #     Scales from base (16px) to lg (18px) at the sm breakpoint
    #   <% end %>
    class Callout < Component
      include Shared

      DEFAULT_TAG = :p

      attr_reader :tag, :variant, :responsive

      # Initialize a new Callout component
      #
      # @param tag [Symbol] HTML tag to use (default: :p)
      # @param variant [Symbol] Color variant (:default, :muted, :subdued, :inverse)
      # @param responsive [Boolean] Enable responsive sizing (default: false)
      # @param system_arguments [Hash] Additional HTML attributes
      def initialize(tag: DEFAULT_TAG, variant: Shared::DEFAULT_VARIANT, responsive: false, **system_arguments)
        @tag = tag
        @variant = variant
        @responsive = responsive
        @system_arguments = system_arguments

        @system_arguments[:class] = class_names(
          system_arguments[:class],
          'pathogen-typography--callout',
          size_classes,
          color_classes_for_variant(@variant),
          Constants::LINE_HEIGHTS[:body],
          Constants::FONT_FAMILIES[:ui]
        )
      end

      private

      def size_classes
        if @responsive
          # Responsive: mobile uses base (16px), desktop uses lg (18px)
          responsive = Constants::TEXT_RESPONSIVE_SIZES[:callout]
          [responsive[:mobile], 'pathogen-typography--responsive-callout']
        else
          Constants::TYPOGRAPHY_SCALE[18] # pathogen-typography--size-lg
        end
      end
    end
  end
end
