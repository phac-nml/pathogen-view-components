# frozen_string_literal: true

module Pathogen
  # Accessible toolbar primitive following the horizontal APG toolbar pattern.
  class Toolbar < Pathogen::Component
    include Pathogen::StimulusDataMerge

    TOOLBAR_CLASSES = %w[
      inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-1 py-1
      dark:border-neutral-700 dark:bg-neutral-900
    ].freeze

    TOOLBAR_ACTIONS = %w[
      keydown->pathogen--toolbar#handleKeyDown
      focusin->pathogen--toolbar#handleFocusIn
      click->pathogen--toolbar#handleClick:capture
    ].freeze

    def initialize(label: nil, labelled_by: nil, controls: nil, **system_arguments)
      @label = label
      @labelled_by = labelled_by
      @controls = controls
      @system_arguments = system_arguments

      validate_accessible_name!
      build_toolbar_arguments!
    end

    private

    def validate_accessible_name!
      provided_names = [@label.present?, @labelled_by.present?].count(true)
      return if provided_names == 1

      raise ArgumentError, 'Provide exactly one of label: or labelled_by:'
    end

    def build_toolbar_arguments!
      apply_toolbar_aria!
      apply_toolbar_stimulus!
      @system_arguments[:class] = class_names(TOOLBAR_CLASSES, @system_arguments[:class])
    end

    def apply_toolbar_aria!
      @system_arguments[:role] = 'toolbar'
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:label] = @label if @label.present?
      @system_arguments[:aria][:labelledby] = @labelled_by if @labelled_by.present?
      @system_arguments[:aria][:controls] = @controls if @controls.present?
    end

    def apply_toolbar_stimulus!
      @system_arguments[:data] ||= {}
      merge_stimulus_data!(@system_arguments[:data], :controller, 'pathogen--toolbar')
      merge_stimulus_data!(@system_arguments[:data], :action, *TOOLBAR_ACTIONS)
    end
  end
end
