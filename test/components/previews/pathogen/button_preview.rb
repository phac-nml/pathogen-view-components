# frozen_string_literal: true

module Pathogen
  class ButtonPreview < ViewComponent::Preview
    # @param scheme select [primary, default, slate, danger]
    # @param size select [small, medium]
    # @param disabled toggle
    # @param block toggle
    def default(scheme: :default, size: :medium, disabled: false, block: false)
      render Pathogen::Button.new(scheme: scheme.to_sym, size: size.to_sym, disabled: disabled, block: block) do
        "Click me"
      end
    end

    def disabled
      render Pathogen::Button.new(disabled: true) { "Disabled" }
    end

    def block_width
      render Pathogen::Button.new(block: true) { "Full-width button" }
    end

    def danger
      render Pathogen::Button.new(scheme: :danger) { "Delete" }
    end

    def primary
      render Pathogen::Button.new(scheme: :primary) { "Save" }
    end

    def slate
      render Pathogen::Button.new(scheme: :slate) { "Cancel" }
    end
  end
end
