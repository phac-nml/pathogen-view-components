# frozen_string_literal: true

module Pathogen
  module Typography
    class HeadingPreview < ViewComponent::Preview
      # @param level number
      # @param variant select [default, muted, subdued, inverse]
      # @param responsive toggle
      def default(level: 1, variant: :default, responsive: true)
        render Pathogen::Typography::Heading.new(level: level.to_i, variant: variant.to_sym, responsive: responsive) do
          "The quick brown fox"
        end
      end

      def all_levels
      end

      def muted
        render Pathogen::Typography::Heading.new(level: 2, variant: :muted) { "Muted heading" }
      end

      def subdued
        render Pathogen::Typography::Heading.new(level: 3, variant: :subdued) { "Subdued heading" }
      end
    end
  end
end
