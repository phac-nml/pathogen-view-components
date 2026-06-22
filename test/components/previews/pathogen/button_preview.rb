# frozen_string_literal: true

module Pathogen
  class ButtonPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Button

    # @label Playground
    # @param tone select { choices: [neutral, primary, danger] } "Semantic meaning of the button."
    # @param emphasis select { choices: [outline, solid, ghost] } "Visual hierarchy of the button."
    # @param size select { choices: [small, medium] } "The size of the button."
    # @param disabled toggle "The Boolean disabled attribute, when present, makes the element not mutable, focusable,
    #   or even submitted with the form. The user can neither edit nor focus on the control, nor its form control
    #   descendants."
    # @param block toggle "If true, the button will take up the full width of its container."
    def playground(tone: :neutral, emphasis: :outline, size: :medium, disabled: false, block: false)
      pathogen_button(tone:, emphasis:, size:, disabled:, block:, test_selector: 'playground') do
        'Button'
      end
    end

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
