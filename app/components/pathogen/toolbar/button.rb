# frozen_string_literal: true

module Pathogen
  # Toolbar-specific button wrapper that opts into roving focus semantics.
  class Toolbar::Button < Pathogen::Component
    include Pathogen::StimulusDataMerge

    TARGET_DATA_KEY = 'pathogen--toolbar-target'

    renders_one :leading_visual
    renders_one :trailing_visual

    # rubocop:disable Metrics/ParameterLists
    def initialize(label: nil, pressed: nil, disabled: false, tag: :button, scheme: :default, size: :small,
                   **system_arguments)
      @label = label
      @pressed = pressed
      @disabled = disabled
      @tag = tag
      @scheme = scheme
      @size = size
      @system_arguments = system_arguments

      build_button_arguments!
    end
    # rubocop:enable Metrics/ParameterLists

    private

    def build_button_arguments!
      @system_arguments.delete(:disabled)
      @system_arguments.delete('disabled')
      @system_arguments[:tag] = @tag
      @system_arguments[:tabindex] = -1

      apply_aria_attributes!
      apply_data_attributes!
    end

    def apply_aria_attributes!
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:label] = @label if @label.present?
      @system_arguments[:aria][:disabled] = true if @disabled
      @system_arguments[:aria][:pressed] = @pressed unless @pressed.nil?
    end

    def apply_data_attributes!
      @system_arguments[:data] ||= {}
      merge_stimulus_data!(@system_arguments[:data], TARGET_DATA_KEY, 'item')
    end
  end
end
