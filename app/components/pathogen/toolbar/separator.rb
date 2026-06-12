# frozen_string_literal: true

module Pathogen
  # Semantic vertical divider for toolbar item groups.
  class Toolbar::Separator < Pathogen::Component
    SEPARATOR_CLASSES = 'mx-1 h-5 w-px bg-neutral-300 dark:bg-neutral-600'

    def initialize(**system_arguments)
      @system_arguments = system_arguments
      @system_arguments[:role] = 'separator'
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:orientation] = 'vertical'
      @system_arguments[:class] = class_names(SEPARATOR_CLASSES, @system_arguments[:class])
    end

    def call
      tag.div(**@system_arguments)
    end
  end
end
