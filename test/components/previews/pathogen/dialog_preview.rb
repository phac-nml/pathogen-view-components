# frozen_string_literal: true

module Pathogen
  class DialogPreview < ViewComponent::Preview
    # @!group Pathogen Dialog

    # @label Basic usage and sizes
    # Named dialogs with a trigger, body, and optional footer.
    def basic; end

    # @label Long static content
    # Read and scroll structured content without any controls in the body.
    def long_content; end

    # @label Form
    # Initial field focus, native validation, and a detached submit action.
    def form; end

    # @label Destructive confirmation
    # Short description and initial focus on the safer Cancel action.
    def destructive; end

    # @label Stacked dialogs
    # Open a child dialog and return to its trigger inside the parent.
    def stacked; end

    # @label Accessibility
    # Keyboard scrolling, zoom, text spacing, and the short-height fallback.
    def accessibility; end

    # @!endgroup
  end
end
