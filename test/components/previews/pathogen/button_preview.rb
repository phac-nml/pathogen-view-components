# frozen_string_literal: true

module Pathogen
  class ButtonPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Button

    # @label Overview
    # Tone, emphasis, workflow placement, visuals, links, sizes, and enabled/disabled states
    def overview; end

    # @label Standalone form actions
    # Delete and retry patterns using pathogen_button_to
    def button_to; end

    # @label Accessibility patterns
    # Icon-only names, repeating labels, and focusable disabled states
    def accessibility; end

    # @!endgroup
  end
end
