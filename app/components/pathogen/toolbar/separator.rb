# frozen_string_literal: true

module Pathogen
  # Semantic vertical divider for toolbar item groups.
  class Toolbar::Separator < Pathogen::Component
    def initialize(**system_arguments)
      @system_arguments = system_arguments
      @system_arguments[:role] = 'separator'
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:orientation] = 'vertical'
      @system_arguments[:class] = class_names(Pathogen::ToolbarStyles::SEPARATOR, @system_arguments[:class])
    end

    def call
      tag.div(**@system_arguments)
    end
  end
end
