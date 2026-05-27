# frozen_string_literal: true

module Pathogen
  # Accessible toolbar primitive following the horizontal APG toolbar pattern.
  class Toolbar < Pathogen::Component
    TOOLBAR_CLASSES = %w[
      inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-1 py-1
      dark:border-neutral-700 dark:bg-neutral-900
    ].join(' ').freeze

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
      @system_arguments[:role] = 'toolbar'
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:label] = @label if @label.present?
      @system_arguments[:aria][:labelledby] = @labelled_by if @labelled_by.present?
      @system_arguments[:aria][:controls] = @controls if @controls.present?

      @system_arguments[:data] ||= {}
      merge_data_value!(:controller, 'pathogen--toolbar')
      merge_data_value!(:action, *TOOLBAR_ACTIONS)

      @system_arguments[:class] = class_names(TOOLBAR_CLASSES, @system_arguments[:class])
    end

    def merge_data_value!(key, *values)
      existing_values = [
        @system_arguments[:data].delete(key),
        @system_arguments[:data].delete(key.to_s)
      ]
      merged = [*existing_values, *values].compact.join(' ').split.uniq.join(' ')
      @system_arguments[:data][key] = merged
    end
  end
end
