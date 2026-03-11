# frozen_string_literal: true

module Pathogen
  module DataGrid
    # Shared helpers for detecting and safely reserializing interactive HTML cell content.
    module InteractiveContent
      INTERACTIVE_SELECTOR = 'a, button, input, select, textarea'
      INTERACTIVE_TAG_NAMES = %w[a button input select textarea].freeze
      private_constant :INTERACTIVE_TAG_NAMES

      private

      def html_safe_with_interactive?(value)
        value.respond_to?(:html_safe?) &&
          value.html_safe? &&
          INTERACTIVE_TAG_NAMES.any? { |tag| value.include?("<#{tag}") }
      end

      # Safe because we only reach this path when `rendered_value` is already html_safe
      # (produced by a view helper). Nokogiri re-serialises already-escaped HTML; wrapping
      # the output in SafeBuffer is therefore safe.
      def safe_fragment_content(fragment)
        helpers.safe_join(fragment.children.map { |node| ActiveSupport::SafeBuffer.new(node.to_html) })
      end
    end
  end
end
