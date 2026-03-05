# frozen_string_literal: true

module Pathogen
  module Typography
    class CodePreview < ViewComponent::Preview
      def default
        render Pathogen::Typography::Code.new { "variable_name" }
      end

      def in_paragraph
      end
    end
  end
end
