# frozen_string_literal: true

module Pathogen
  class LinkPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    def default
      render_with_template
    end

    def external_link
      render_with_template
    end

    # @label With Tooltip
    def tooltip
      render_with_template
    end
  end
end
