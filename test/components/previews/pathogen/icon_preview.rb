# frozen_string_literal: true

module Pathogen
  class IconPreview < ViewComponent::Preview
    # @param icon_name text
    # @param color select [default, primary, success, danger, warning, muted]
    # @param size select [sm, md, lg, xl]
    def default(icon_name: "check", color: :default, size: :md)
      render Pathogen::Icon.new(icon_name.to_sym, color: color.to_sym, size: size.to_sym)
    end

    def small
      render Pathogen::Icon.new(:check, size: :sm)
    end

    def large
      render Pathogen::Icon.new(:check, size: :lg)
    end

    def extra_large
      render Pathogen::Icon.new(:check, size: :xl)
    end

    def primary_color
      render Pathogen::Icon.new(:check, color: :primary)
    end

    def danger_color
      render Pathogen::Icon.new(:x_circle, color: :danger)
    end

    def warning_color
      render Pathogen::Icon.new(:warning, color: :warning)
    end
  end
end
