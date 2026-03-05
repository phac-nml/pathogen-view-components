# frozen_string_literal: true

module Pathogen
  module Typography
    class EyebrowPreview < ViewComponent::Preview
      # @param variant select [default, muted, subdued, inverse]
      def default(variant: :default)
        render Pathogen::Typography::Eyebrow.new(variant: variant.to_sym) do
          "Featured Category"
        end
      end
    end
  end
end
