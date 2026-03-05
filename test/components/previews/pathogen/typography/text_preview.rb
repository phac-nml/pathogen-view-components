# frozen_string_literal: true

module Pathogen
  module Typography
    class TextPreview < ViewComponent::Preview
      # @param variant select [default, muted, subdued, inverse]
      # @param responsive toggle
      def default(variant: :default, responsive: false)
        render Pathogen::Typography::Text.new(variant: variant.to_sym, responsive: responsive) do
          "The quick brown fox jumps over the lazy dog."
        end
      end

      def muted
        render Pathogen::Typography::Text.new(variant: :muted) do
          "Secondary information in muted styling."
        end
      end

      def subdued
        render Pathogen::Typography::Text.new(variant: :subdued) do
          "Tertiary content with subdued styling."
        end
      end
    end
  end
end
