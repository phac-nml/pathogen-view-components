# frozen_string_literal: true

module Pathogen
  module Typography
    class CalloutPreview < ViewComponent::Preview
      # @param variant select [default, muted, subdued, inverse]
      # @param responsive toggle
      def default(variant: :default, responsive: false)
        render Pathogen::Typography::Callout.new(variant: variant.to_sym, responsive: responsive) do
          "An important callout that draws the reader's attention."
        end
      end

      def muted
        render Pathogen::Typography::Callout.new(variant: :muted) do
          "A muted callout for supporting context."
        end
      end
    end
  end
end
