# frozen_string_literal: true

module Pathogen
  module Typography
    class ListPreview < ViewComponent::Preview
      def default
        render Pathogen::Typography::List.new do |list|
          list.with_item { "First item" }
          list.with_item { "Second item" }
          list.with_item { "Third item" }
        end
      end

      def ordered
        render Pathogen::Typography::List.new(ordered: true) do |list|
          list.with_item { "Step one" }
          list.with_item { "Step two" }
          list.with_item { "Step three" }
        end
      end

      def muted
        render Pathogen::Typography::List.new(variant: :muted) do |list|
          list.with_item { "Muted item one" }
          list.with_item { "Muted item two" }
        end
      end
    end
  end
end
