# frozen_string_literal: true

module Pathogen
  class TooltipPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Tooltip

    # @label Overview
    # Placement reference, sizing behaviour, and specimen toolbar examples
    def overview; end

    # @label In context
    # Icon-only actions, collapsed navigation, and grid row utilities
    def in_context; end

    # @label Accessibility patterns
    # Hover and focus triggers, ARIA wiring, and keyboard navigation
    def accessibility; end

    # @label Visual test: Click-through after hide
    # Repro for "tooltip hides but still blocks clicks" issues.
    # After the tooltip closes, the button underneath should be clickable immediately.
    def click_through_after_hide; end

    # @!endgroup
  end
end
