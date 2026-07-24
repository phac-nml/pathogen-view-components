# frozen_string_literal: true

module Pathogen
  class BadgePreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Badge

    # @label Playground
    # @param text text "Visible badge label (required)."
    # @param tone select { choices: [neutral, accent, success, warning, danger] } "Semantic tone."
    def playground(text: 'Ready', tone: :success)
      pathogen_badge(text:, tone:, test_selector: 'playground')
    end

    # @label Overview
    # Soft-fill tones, dense table context, and metadata labels.
    def overview
      render_with_template
    end

    # @label Accessibility
    # Text carries meaning; tone reinforces; leading visuals are decorative.
    def accessibility
      render_with_template
    end

    # @!endgroup
  end
end
