# frozen_string_literal: true

module Pathogen
  # Toolbar-specific button wrapper that opts into roving focus semantics.
  class Toolbar::Button < Pathogen::Component
    include Pathogen::StimulusDataMerge

    TARGET_DATA_KEY = 'pathogen--toolbar-target'

    renders_one :leading_visual
    renders_one :trailing_visual

    # rubocop:disable Metrics/ParameterLists
    def initialize(label: nil, pressed: nil, disabled: false, aria_disabled: false, tag: :button, tone: :neutral,
                   emphasis: :ghost, size: :small, **system_arguments)
      @label = label
      @pressed = pressed
      @disabled = disabled || system_arguments.delete('disabled') == true
      @aria_disabled = aria_disabled
      @tag = tag
      @tone = tone
      @emphasis = emphasis
      @size = size
      @system_arguments = system_arguments

      if @disabled && @aria_disabled
        raise ArgumentError, 'Cannot set both disabled and aria_disabled on a toolbar button'
      end

      build_button_arguments!
    end
    # rubocop:enable Metrics/ParameterLists

    private

    def build_button_arguments!
      @system_arguments[:tag] = @tag
      @system_arguments[:tabindex] = -1
      @system_arguments[:disabled] = true if @disabled
      @system_arguments[:aria_disabled] = true if @aria_disabled
      apply_detached_form_submit_default!

      apply_aria_attributes!
      apply_data_attributes!
    end

    def apply_detached_form_submit_default!
      return unless @system_arguments[:tag].to_sym == :button
      return unless @system_arguments[:form].present? || @system_arguments['form'].present?
      return if @system_arguments[:type].present? || @system_arguments['type'].present?

      @system_arguments[:type] = :submit
    end

    def apply_aria_attributes!
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:label] = @label if @label.present?
      @system_arguments[:aria][:pressed] = @pressed unless @pressed.nil?
    end

    def apply_data_attributes!
      @system_arguments[:data] ||= {}
      merge_stimulus_data!(@system_arguments[:data], TARGET_DATA_KEY, 'item')
    end
  end
end
