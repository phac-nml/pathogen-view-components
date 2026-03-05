# frozen_string_literal: true

module Pathogen
  module Typography
    class LeadPreview < ViewComponent::Preview
      # @param variant select [default, muted, subdued, inverse]
      def default(variant: :default)
        render Pathogen::Typography::Lead.new(variant: variant.to_sym) do
          "A lead paragraph that introduces a section with larger, more prominent text."
        end
      end
    end
  end
end
