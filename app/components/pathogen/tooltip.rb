# frozen_string_literal: true

module Pathogen
  # Pathogen::Tooltip renders an accessible tooltip using JavaScript-based positioning.
  class Tooltip < Pathogen::Component
    VALID_PLACEMENTS = %i[top bottom left right].freeze

    TOOLTIP_CLASSES = %w[
      fixed z-50 inline-block max-w-xs min-w-0 px-3 py-2
      bg-neutral-950 text-white font-sans text-sm font-medium
      rounded-lg shadow-[0_1px_3px_oklch(0_0_0/0.2)]
      opacity-0 scale-90 pointer-events-none
      transition-[opacity,transform] duration-200 ease-out
      origin-[var(--pvc-tooltip-origin,center)]
      data-[state=open]:opacity-100 data-[state=open]:scale-100 data-[state=open]:pointer-events-auto
    ].join(' ').freeze

    ARROW_CLASSES = 'absolute size-2 rotate-45 bg-neutral-950'

    attr_reader :text, :placement, :id

    def initialize(text:, id:, placement: :top, **system_arguments)
      @text = text
      @id = id
      @placement = placement
      @system_arguments = system_arguments

      validate_placement!
      setup_system_arguments
    end

    def call
      render(Pathogen::BaseComponent.new(**@system_arguments)) do
        safe_join([
                    @text,
                    tag.span(class: ARROW_CLASSES, data: { 'pathogen--tooltip-target': 'arrow' })
                  ])
      end
    end

    private

    def setup_system_arguments
      @system_arguments[:tag] ||= :div
      @system_arguments[:id] = @id
      @system_arguments[:role] = 'tooltip'
      @system_arguments[:aria] = merge_aria_attributes
      @system_arguments[:data] = merge_data_attributes
      @system_arguments[:class] = merge_class_names
    end

    def merge_aria_attributes
      (@system_arguments[:aria] || {}).reverse_merge(
        hidden: true
      )
    end

    def merge_data_attributes
      (@system_arguments[:data] || {}).merge(
        'pathogen--tooltip-target': 'tooltip',
        pathogen_tooltip_root: true,
        state: 'closed',
        placement: @placement.to_s
      )
    end

    def merge_class_names
      class_names(
        TOOLTIP_CLASSES,
        @system_arguments[:class]
      )
    end

    def validate_placement!
      return if VALID_PLACEMENTS.include?(@placement)

      raise ArgumentError, "placement must be one of: #{VALID_PLACEMENTS.map { |p| ":#{p}" }.join(', ')}"
    end
  end
end
