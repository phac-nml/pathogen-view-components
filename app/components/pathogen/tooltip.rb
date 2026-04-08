# frozen_string_literal: true

module Pathogen
  # Pathogen::Tooltip renders an accessible tooltip using JavaScript-based positioning.
  #
  # This component implements a custom tooltip solution with Primer-inspired design.
  # It uses JavaScript positioning via a Stimulus controller for precise placement
  # with viewport boundary detection.
  #
  # ## Features
  #
  # - **JavaScript-Based Positioning**: Calculates optimal position using Floating UI
  #   with viewport boundary detection and automatic placement flipping
  # - **Multiple Placements**: Supports `:top`, `:bottom`, `:left`, and `:right` positioning
  # - **Smooth Animations**: Fade-in and scale transition driven by `data-state` attribute
  # - **Accessibility**: Maintains `role="tooltip"`, `aria-describedby`, and `aria-hidden` state
  # - **Keyboard Accessible**: Shows on both hover and focus for keyboard navigation
  #
  # ## Usage
  #
  # Tooltips are typically used with `Pathogen::Link` component via the tooltip slot:
  #
  # @example Basic tooltip with default top placement
  #   <%= render Pathogen::Link.new(href: "/samples") do |link| %>
  #     <%= link.with_tooltip(text: "View all samples") %>
  #     Samples
  #   <% end %>
  #
  # @example Tooltip with custom bottom placement
  #   <%= render Pathogen::Link.new(href: "/projects") do |link| %>
  #     <%= link.with_tooltip(text: "Manage your projects", placement: :bottom) %>
  #     Projects
  #   <% end %>
  #
  # @example Direct component usage (advanced)
  #   <div data-controller="pathogen--tooltip">
  #     <button
  #       aria-describedby="tooltip-123"
  #       data-pathogen--tooltip-target="trigger">
  #       Hover me
  #     </button>
  #     <%= render Pathogen::Tooltip.new(
  #       text: "Helpful information",
  #       id: "tooltip-123",
  #       placement: :bottom
  #     ) %>
  #   </div>
  #
  # @note When using directly, you MUST:
  #   - Wrap trigger and tooltip in a container with `data-controller="pathogen--tooltip"`
  #   - Add `aria-describedby="<tooltip-id>"` to the trigger element (W3C ARIA APG requirement)
  #   - Add `data-pathogen--tooltip-target="trigger"` to the trigger element
  #   The Stimulus controller will validate these requirements at runtime and log errors if missing.
  #
  # @param text [String] The tooltip text content
  # @param id [String] Unique identifier for the tooltip element (required for aria-describedby)
  # @param placement [Symbol] Position of tooltip relative to trigger (:top, :bottom, :left, :right)
  #   Defaults to `:top`. Invalid values will raise ArgumentError.
  # @param system_arguments [Hash] Additional HTML attributes for the tooltip root element
  #   (e.g., `class`, `data`, `aria`). These are merged with required defaults.
  class Tooltip < Pathogen::Component
    VALID_PLACEMENTS = %i[top bottom left right].freeze

    attr_reader :text, :placement, :id

    def initialize(text:, id:, placement: :top, **system_arguments)
      @text = text
      @id = id
      @placement = placement
      @system_arguments = system_arguments

      validate_placement!
      setup_system_arguments
    end

    # Renders the tooltip using BaseComponent to handle all HTML attributes
    # @return [Pathogen::BaseComponent] The rendered tooltip component
    def call
      render(Pathogen::BaseComponent.new(**@system_arguments)) do
        safe_join([
                    @text,
                    tag.span(class: 'pathogen-tooltip__arrow', data: { 'pathogen--tooltip-target': 'arrow' })
                  ])
      end
    end

    private

    # Sets up HTML attributes for the tooltip, merging provided system_arguments
    # with required defaults for accessibility and JavaScript behavior
    def setup_system_arguments
      @system_arguments[:tag] ||= :div
      @system_arguments[:id] = @id
      # W3C ARIA APG requires role="tooltip" - this is non-overridable
      @system_arguments[:role] = 'tooltip'
      @system_arguments[:aria] = merge_aria_attributes
      @system_arguments[:data] = merge_data_attributes
      @system_arguments[:class] = merge_class_names
    end

    # Merges ARIA attributes with required defaults.
    # Tooltips start hidden per W3C ARIA APG, so aria-hidden="true" is set initially.
    # The Stimulus controller toggles aria-hidden to "false" on show and "true" on hide.
    def merge_aria_attributes
      (@system_arguments[:aria] || {}).reverse_merge(
        hidden: true
      )
    end

    # Merges data attributes with required defaults.
    # The placement value is passed to Floating UI which also supports extended
    # placements like 'top-start', 'bottom-end', etc. via the flip middleware.
    # data-state starts as "closed"; controller transitions to "open" on show.
    def merge_data_attributes
      (@system_arguments[:data] || {}).reverse_merge(
        'pathogen--tooltip-target': 'tooltip',
        state: 'closed',
        placement: @placement.to_s
      )
    end

    # Builds and merges CSS classes with custom classes
    def merge_class_names
      class_names(
        'pathogen-tooltip',
        "pathogen-tooltip--placement-#{@placement}",
        @system_arguments[:class]
      )
    end

    # Validates that placement parameter is one of the allowed values
    # @raise [ArgumentError] if placement is not in VALID_PLACEMENTS
    def validate_placement!
      return if VALID_PLACEMENTS.include?(@placement)

      raise ArgumentError, "placement must be one of: #{VALID_PLACEMENTS.map { |p| ":#{p}" }.join(', ')}"
    end
  end
end
