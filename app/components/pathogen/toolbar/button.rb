# frozen_string_literal: true

module Pathogen
  # Toolbar-specific button wrapper that opts into roving focus semantics.
  class Toolbar::Button < Pathogen::Component
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
      @system_arguments[:tag] = @tag
      @system_arguments[:tabindex] = -1

      apply_aria_attributes!
      apply_data_attributes!
      apply_css_classes!
    end

    def apply_aria_attributes!
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:label] = @label if @label.present?
      @system_arguments[:aria][:disabled] = true if @disabled
      @system_arguments[:aria][:pressed] = @pressed unless @pressed.nil?
    end

    def apply_data_attributes!
      @system_arguments[:data] ||= {}
      existing_target = [
        @system_arguments[:data].delete(TARGET_DATA_KEY),
        @system_arguments[:data].delete(TARGET_DATA_KEY.to_sym)
      ]
      @system_arguments[:data][TARGET_DATA_KEY] =
        [*existing_target, 'item'].compact.join(' ').split.uniq.join(' ')
    end

    def apply_css_classes!
      @system_arguments[:class] = class_names(
        @system_arguments[:class],
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-70'
      )
    end
  end
end
