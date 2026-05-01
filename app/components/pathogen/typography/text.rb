# frozen_string_literal: true

require_relative 'constants'
require_relative 'shared'

module Pathogen
  module Typography
    # Component for rendering body text paragraphs (16px)
    #
    # Standard body text component for paragraphs and main content with consistent
    # sizing and optimal readability.
    #
    # **I18n Note:** For user-facing content, always pass I18n-translated strings.
    # Lookbook previews may use hardcoded text for demonstration purposes only.
    #
    # @example Basic paragraph
    #   <%= render Pathogen::Typography::Text.new do %>
    #     This is body text at 16px.
    #   <% end %>
    #
    # @example With I18n (required for user-facing content)
    #   <%= render Pathogen::Typography::Text.new do %>
    #     <%= t('.description') %>
    #   <% end %>
    #
    # @example With color variant
    #   <%= render Pathogen::Typography::Text.new(variant: :muted) do %>
    #     Secondary information
    #   <% end %>
    class Text < Component
      include Shared

      DEFAULT_TAG = :p

      attr_reader :tag, :variant, :responsive

      # Initialize a new Text component
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
          Constants::LINE_HEIGHTS[:body],
          Constants::FONT_FAMILIES[:ui]
        )
      end

      private

      def size_classes
        Constants::TYPOGRAPHY_SCALE[16]
      end
    end
  end
end
