# frozen_string_literal: true

module Pathogen
  # Layout wrapper that keeps related toolbar controls together during reflow.
  #
  # Groups are not toolbar items. Controls inside still expose
  # +data-pathogen--toolbar-target="item"+ for roving focus.
  class Toolbar::Group < Pathogen::Component
    def initialize(reflow: Pathogen::ToolbarStyles::DEFAULT_REFLOW, **system_arguments)
      @reflow = reflow
      @system_arguments = system_arguments
      validate_reflow!
      apply_group_data!
      @system_arguments[:class] = class_names(@system_arguments[:class])
    end

    private

    def validate_reflow!
      return if Pathogen::ToolbarStyles::REFLOW_OPTIONS.include?(@reflow)

      raise ArgumentError, "reflow: must be one of #{Pathogen::ToolbarStyles::REFLOW_OPTIONS.join(', ')}"
    end

    def apply_group_data!
      @system_arguments[:data] ||= {}
      @system_arguments[:data][:'pathogen--toolbar-group'] = true
      @system_arguments[:data][:'pathogen--toolbar-reflow'] = @reflow
    end
  end
end
