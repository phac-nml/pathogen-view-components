# frozen_string_literal: true

module Pathogen
  # Menu-button trigger for toolbars. Popup content stays host-managed in v1.
  class Toolbar::MenuTrigger < Pathogen::Component
    include Pathogen::StimulusDataMerge

    TARGET_DATA_KEY = 'pathogen--toolbar-target'

    TRIGGER_CLASSES = %w[
      inline-flex items-center rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium
      text-neutral-900 dark:border-neutral-700 dark:text-neutral-100
    ].join(' ').freeze

    # rubocop:disable Metrics/ParameterLists
    def initialize(label: nil, controls: nil, expanded: false, haspopup: 'menu', id: nil, **system_arguments)
      @label = label
      @controls = controls
      @expanded = expanded
      @haspopup = haspopup
      @system_arguments = system_arguments
      @system_arguments[:id] = id if id.present?

      build_trigger_arguments!
    end
    # rubocop:enable Metrics/ParameterLists

    def call
      tag.button(**@system_arguments) { content }
    end

    private

    def build_trigger_arguments!
      @system_arguments[:type] = 'button'
      @system_arguments[:tabindex] = -1
      apply_trigger_aria!
      apply_trigger_data!
      @system_arguments[:class] = class_names(TRIGGER_CLASSES, @system_arguments[:class])
    end

    def apply_trigger_aria!
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:label] = @label if @label.present?
      @system_arguments[:aria][:haspopup] = @haspopup
      @system_arguments[:aria][:expanded] = @expanded
      @system_arguments[:aria][:controls] = @controls if @controls.present?
    end

    def apply_trigger_data!
      @system_arguments[:data] ||= {}
      merge_stimulus_data!(@system_arguments[:data], TARGET_DATA_KEY, 'item')
    end
  end
end
