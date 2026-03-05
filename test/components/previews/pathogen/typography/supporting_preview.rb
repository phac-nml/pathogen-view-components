# frozen_string_literal: true

module Pathogen
  module Typography
    class SupportingPreview < ViewComponent::Preview
      # @param variant select [default, muted, subdued, inverse]
      def default(variant: :default)
        render Pathogen::Typography::Supporting.new(variant: variant.to_sym) do
          "Caption or metadata text at 14px."
        end
      end

      def muted
        render Pathogen::Typography::Supporting.new(variant: :muted) do
          "Last updated: January 15, 2024"
        end
      end
    end
  end
end
