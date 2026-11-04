# frozen_string_literal: true

module Pathogen
  class ButtonPreview < ViewComponent::Preview
    # @label Specimen workflow
    # Compact grouped tools, soft secondary actions, and a regular form footer
    def workflow; end

    # @!group Pathogen Button

    # @label Overview
    # Variant reference, workflow placement, visuals, links, sizes, and state comparison
    def overview; end

    # @label Standalone form actions
    # Delete and retry patterns using pathogen_button_to
    def button_to; end

    # @label Accessibility patterns
    # Keyboard focus, icon-only names, tooltips on rail icons, repeating labels, and focusable disabled states
    def accessibility; end

    # @!endgroup
  end
end
