# frozen_string_literal: true

module Pathogen
  class ToolbarPreview < ViewComponent::Preview
    # @label Overview
    # Table action rows, chip variant, toggle/disabled states, and keyboard behaviour.
    def overview; end

    # @label Full-width & reflow
    # Full-width table toolbar: selection group left, actions and search right.
    # Resize the preview below the sm breakpoint to see groups reflow.
    def full_width; end
  end
end
