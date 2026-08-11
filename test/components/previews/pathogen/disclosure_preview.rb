# frozen_string_literal: true

module Pathogen
  class DisclosurePreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Disclosure

    # @label Overview
    # Closed, open, heading, custom trigger, and dense sizes
    def overview; end

    # @label Accessibility
    # Keyboard, aria-expanded announcements, focus, and Label in Name
    def accessibility; end

    # @!endgroup
  end
end
