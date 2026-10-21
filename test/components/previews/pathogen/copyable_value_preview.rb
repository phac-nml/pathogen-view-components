# frozen_string_literal: true

module Pathogen
  # ViewComponent preview for demonstrating Pathogen::CopyableValue usage
  class CopyableValuePreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen CopyableValue Component

    # @label Basic Usage
    # Shows default rendering with a sample identifier value
    def basic_usage; end

    # @label Custom Feedback Message
    # Demonstrates overriding the default "Copied to clipboard" message
    def custom_message; end

    # @label Dense List Context
    # Shows multiple CopyableValue components in a table-like dense layout
    def dense_list; end

    # @label Accessibility
    # Keyboard focus, aria-label patterns, and screen-reader feedback
    def accessibility; end

    # @!endgroup
  end
end
