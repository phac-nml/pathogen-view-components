# frozen_string_literal: true

module Pathogen
  # Provides visual components (icons) and helpers for button styling in Pathogen
  module ButtonVisuals
    # Pathogen icon size class mappings for button-embedded icons
    ICON_SIZE_MAPPINGS = {
      small: 'size-4',
      medium: 'size-6'
    }.freeze

    def self.included(base)
      base.renders_one :leading_visual, types: visual_types(name: :leading_visual)
      base.renders_one :trailing_visual, types: visual_types(name: :trailing_visual)
    end

    def self.visual_types(name:)
      {
        icon: ->(**args) { icon_visual(args) },
        svg: ->(**args, &block) { svg_visual(args, name, &block) }
      }
    end

    def icon_visual(args)
      icon_name = args.delete(:icon)
      args[:class] = class_names(args[:class], icon_classes)
      helpers.icon(icon_name.to_s.tr('_', '-'), **args)
    end

    def svg_visual(args, name, &block)
      component = Pathogen::BaseComponent.new(
        tag: :svg,
        width: '16',
        height: '16',
        fill: 'currentColor',
        classes: class_names("#{name}_svg", 'fill-current', icon_classes),
        **args
      )
      component.with_content(&block) if block
      component
    end

    private

    def icon_classes
      size_class = ICON_SIZE_MAPPINGS[
        fetch_or_fallback(Pathogen::ButtonSizes::SIZE_OPTIONS, @size, Pathogen::ButtonSizes::DEFAULT_SIZE)
      ]

      class_names('pathogen-icon', size_class)
    end
  end
end
