# frozen_string_literal: true

module Pathogen
  class LinkPreview < ViewComponent::Preview
    def default
      render Pathogen::Link.new(href: "/") { "Home" }
    end

    def with_tooltip
      render Pathogen::Link.new(href: "/") do |link|
        link.with_tooltip(text: "Go to the home page", placement: :top)
        "Home"
      end
    end

    def tooltip_bottom
      render Pathogen::Link.new(href: "/") do |link|
        link.with_tooltip(text: "Go to the home page", placement: :bottom)
        "Home"
      end
    end
  end
end
