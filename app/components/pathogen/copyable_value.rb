# frozen_string_literal: true

module Pathogen
  # Pathogen::CopyableValue renders a compact, accessible inline display of a short
  # copyable text value with an integrated clipboard button.
  #
  # The value is always rendered in monospace. Clicking the copy button writes the
  # value to the clipboard via `navigator.clipboard.writeText()` and provides
  # visual + screen-reader feedback (icon swap + aria-live announcement).
  #
  # @example Basic usage
  #   render Pathogen::CopyableValue.new(value: "INXT_PRJ_A2G6VVJNCN")
  #
  # @example Custom copied message
  #   render Pathogen::CopyableValue.new(value: "abc123", copied_message: "ID copied!")
  #
  class CopyableValue < Pathogen::Component
    CONTAINER_CLASSES = %w[
      inline-flex items-center align-middle
      py-1 pl-2
      font-mono text-[length:var(--type-meta)] leading-4 font-normal
      rounded-[var(--pvc-radius-action)]
      border border-[var(--pvc-color-border)]
      bg-[var(--pvc-color-surface-muted)]
      text-[var(--pvc-color-text)]
    ].join(' ').freeze

    BUTTON_CLASSES = %w[
      inline-flex shrink-0 items-center justify-center self-stretch
      -my-1 py-1 px-1.5
      rounded-r-[calc(var(--pvc-radius-action)-1px)]
      cursor-pointer
      text-[var(--pvc-color-text-muted)]
      interactive-hover:bg-[var(--pvc-color-surface-muted)]
      focus-visible:outline focus-visible:outline-2
      focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-[-2px]
      transition-[color,background-color] duration-[var(--pvc-duration-fast)] ease-out
    ].join(' ').freeze

    VALUE_CLASSES = 'pr-1 select-all [font-variant-numeric:tabular-nums]'

    attr_reader :value

    # @param value [String] The text to display and copy to clipboard (required)
    # @param copied_message [String, nil] Feedback message announced to screen readers after copy.
    #   Defaults to the `pathogen.copyable_value.copied` i18n key.
    # @param reset_delay [Integer] Milliseconds before success feedback reverts (default: 2000)
    # @param system_arguments [Hash] Additional HTML attributes for the root element
    def initialize(value:, copied_message: nil, reset_delay: 2000, **system_arguments)
      @value = value.to_s
      raise ArgumentError, 'value must be present' if @value.empty?

      @copied_message = copied_message
      @reset_delay = reset_delay
      @system_arguments = system_arguments

      setup_system_arguments
    end

    private

    def setup_system_arguments
      @system_arguments[:tag] = :span
      @system_arguments[:class] = class_names(
        CONTAINER_CLASSES,
        @system_arguments[:class]
      )
      @system_arguments[:data] = build_data_attributes
    end

    def build_data_attributes
      data = (@system_arguments[:data] || {}).dup
      existing_controller = data.delete(:controller) || data.delete('controller')

      data[:controller] = [existing_controller, controller_name]
                          .compact
                          .join(' ')
                          .split
                          .uniq
                          .join(' ')
      data.merge!(stimulus_values)
      data[:state] = 'idle'

      data
    end

    def stimulus_values
      {
        "#{controller_name}-copied-message-value": copied_message,
        "#{controller_name}-copy-failed-message-value": copy_failed_message,
        "#{controller_name}-reset-delay-value": @reset_delay
      }
    end

    def controller_name
      'pathogen--copyable-value'
    end

    def stimulus_target(name)
      { "#{controller_name}-target": name }
    end

    def copied_message
      @copied_message || I18n.t('pathogen.copyable_value.copied')
    end

    def copy_failed_message
      I18n.t('pathogen.copyable_value.copy_failed')
    end

    def aria_label
      I18n.t('pathogen.copyable_value.copy_aria_label', value: @value)
    end
  end
end
