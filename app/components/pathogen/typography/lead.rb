# frozen_string_literal: true

require_relative 'constants'
require_relative 'shared'

module Pathogen
  module Typography
    # Component for rendering lead paragraphs (20px)
    #
    # Larger introductory paragraphs used at the start of sections to draw attention
    # and provide context. Has a comfortable line-height for optimal readability.
    #
    # **I18n Note:** For user-facing content, always pass I18n-translated strings.
    # Lookbook previews may use hardcoded text for demonstration purposes only.
    #
    # @example Lead paragraph
    #   <%= render Pathogen::Typography::Lead.new do %>
    #     This is a lead paragraph that introduces the section.
    #   <% end %>
    #
    # @example With I18n (required for user-facing content)
    #   <%= render Pathogen::Typography::Lead.new do %>
    #     <%= t('.introduction') %>
    #   <% end %>
    class Lead < Component
      include Shared

      DEFAULT_TAG = :p

      attr_reader :tag, :variant, :responsive

      # Initialize a new Lead component
      #
      # @param tag [Symbol] HTML tag to use (default: :p)
      # @param variant [Symbol] Color variant (:default, :muted, :subdued, :inverse)
      # @param responsive [Boolean] Deprecated no-op; typography uses baseline sizing
      # @param system_arguments [Hash] Additional HTML attributes
      def initialize(tag: DEFAULT_TAG, variant: Shared::DEFAULT_VARIANT, responsive: false, **system_arguments)
        @tag = tag
        @variant = variant
        @responsive = responsive
        @system_arguments = system_arguments

        @system_arguments[:class] = class_names(
          system_arguments[:class],
          size_classes,
          color_classes_for_variant(@variant),
          Constants::LINE_HEIGHTS[:relaxed],
          Constants::FONT_FAMILIES[:ui]
        )
      end

      private

      def size_classes
        Constants::TYPOGRAPHY_SCALE[20]
      end
    end
  end
end
