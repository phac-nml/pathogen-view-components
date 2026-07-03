# frozen_string_literal: true

require_relative 'constants'
require_relative 'shared'

module Pathogen
  module Typography
    # Component for rendering supporting text at the control or meta type scale.
    #
    # Use control scale for captions and labels. Use meta scale for timestamps,
    # footnotes, and heading-group metadata lines.
    #
    # **I18n Note:** For user-facing content, always pass I18n-translated strings.
    # Lookbook previews may use hardcoded text for demonstration purposes only.
    #
    # @example Caption
    #   <%= render Pathogen::Typography::Supporting.new do %>
    #     Image caption text
    #   <% end %>
    #
    # @example Metadata at meta scale
    #   <%= render Pathogen::Typography::Supporting.new(variant: :muted, size: :meta) do %>
    #     <%= t('.published_at') %>
    #   <% end %>
    class Supporting < Component
      include Shared

      DEFAULT_TAG = :p
      SIZE_OPTIONS = %i[control meta].freeze
      DEFAULT_SIZE = :control

      attr_reader :tag, :variant, :size

      # Initialize a new Supporting component
      #
      # @param tag [Symbol] HTML tag to use (default: :p)
      # @param variant [Symbol] Color variant (:default, :muted, :subdued, :inverse)
      # @param size [Symbol] Type scale (:control for labels/captions, :meta for metadata)
      # @param system_arguments [Hash] Additional HTML attributes
      def initialize(tag: DEFAULT_TAG, variant: Shared::DEFAULT_VARIANT, size: DEFAULT_SIZE, **system_arguments)
        @tag = tag
        @variant = variant
        @size = fetch_or_fallback(SIZE_OPTIONS, size, DEFAULT_SIZE)
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
        Constants::TYPE_SIZES[@size]
      end
    end
  end
end
