# frozen_string_literal: true

module Pathogen
  class DisclosurePreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Disclosure

    # @label Overview
    # Basic closed and open disclosures
    def overview; end

    # @label Accessibility
    # Keyboard and ARIA behaviour for show/hide sections
    def accessibility; end

    # @!endgroup
  end
end
