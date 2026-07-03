# frozen_string_literal: true

module Pathogen
  # Flex grow spacer that pushes trailing toolbar groups to the end on wide
  # viewports and collapses on narrow screens so groups reflow naturally.
  class Toolbar::Spacer < Pathogen::Component
    def initialize(**system_arguments)
      @system_arguments = system_arguments
      @system_arguments[:role] = 'presentation'
      @system_arguments[:aria] = { hidden: true }
      @system_arguments[:data] ||= {}
      @system_arguments[:data][:'pathogen--toolbar-spacer'] = true
      @system_arguments[:class] = class_names(@system_arguments[:class])
    end

    def call
      tag.div(**@system_arguments)
    end
  end
end
