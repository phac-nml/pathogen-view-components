# frozen_string_literal: true

module Pathogen
  # Pathogen::Toast renders a transient status message inside Pathogen::Toaster.
  class Toast < Pathogen::Component
    TYPE_DEFAULT = :info
    TYPE_MAPPINGS = {
      success: :success,
      info: :info,
      warning: :warning,
      error: :error,
      notice: :info,
      alert: :error
    }.freeze

    DEFAULT_TIMEOUT = 6000
    DISMISS_DURATION_MS = 160
    ICON_PATHS = {
      success:
        '<path fill-rule="evenodd" clip-rule="evenodd" ' \
        'd="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 ' \
        '0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" />',
      warning:
        '<path fill-rule="evenodd" clip-rule="evenodd" ' \
        'd="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 ' \
        '1-1.3-2.25l5.197-9ZM8 ' \
        '4a.75.75 0 0 1 .75.75v3a.75.75 0 1 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />',
      error:
        '<path fill-rule="evenodd" clip-rule="evenodd" ' \
        'd="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 ' \
        '1-1.06-1.06L6.94 ' \
        '8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 ' \
        '1.06Z" />',
      info:
        '<path fill-rule="evenodd" clip-rule="evenodd" ' \
        'd="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 ' \
        '1.5h.75v1.75a.75.75 ' \
        '0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" />'
    }.freeze

    attr_reader :type, :message, :description, :dismissible

    renders_one :action

    # rubocop:disable Metrics/ParameterLists
    def initialize(message:, type: TYPE_DEFAULT, description: nil, timeout: DEFAULT_TIMEOUT, dismissible: true,
                   **system_arguments)
      @type = fetch_or_fallback(TYPE_MAPPINGS.values.uniq, normalized_type(type), TYPE_DEFAULT)
      @message = message
      @description = description
      @dismissible = dismissible
      @timeout = @type == :error ? 0 : [timeout.to_i, 0].max

      @system_arguments = system_arguments
      apply_system_arguments
    end
    # rubocop:enable Metrics/ParameterLists

    def before_render
      raise ArgumentError, 'message is required' if @message.blank?

      @timeout = 0 if action?
      @system_arguments[:'data-pathogen--toast-timeout-value'] = @timeout
      @system_arguments[:'data-pathogen--toast-type-label-value'] = icon_label
    end

    def icon_label
      I18n.t("pathogen.toast.type.#{type}")
    end

    def icon_color
      case type
      when :success then 'text-[var(--pvc-color-success)]'
      when :warning then 'text-[var(--pvc-color-warning)]'
      when :error then 'text-[var(--pvc-color-danger)]'
      else 'text-[var(--pvc-color-text-muted)]'
      end
    end

    def icon_svg
      ICON_PATHS.fetch(type, ICON_PATHS[:info]).html_safe # rubocop:disable Rails/OutputSafety
    end

    private

    def normalized_type(type)
      candidate = type.respond_to?(:to_sym) ? type.to_sym : type
      TYPE_MAPPINGS.fetch(candidate, candidate)
    end

    def apply_system_arguments
      @system_arguments[:class] = class_names(base_classes, @system_arguments[:class])
      @system_arguments[:'data-controller'] = class_names(@system_arguments[:'data-controller'], 'pathogen--toast')
      @system_arguments[:'data-pathogen--toaster-target'] = class_names(
        @system_arguments[:'data-pathogen--toaster-target'],
        'toast'
      )
      @system_arguments.merge!(toast_data_attributes)
    end

    def base_classes
      class_names(
        'group relative pointer-events-auto rounded-[var(--pvc-radius-panel)] border',
        'border-[var(--pvc-color-border)] bg-[var(--pvc-color-surface-raised)] text-[var(--pvc-color-text)]',
        'shadow-[var(--pvc-shadow-overlay)] transition-opacity duration-[var(--pvc-duration-default)]',
        'ease-out data-[state=closing]:opacity-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pvc-color-focus)]'
      )
    end

    def toast_data_attributes
      {
        'data-pathogen--toast-timeout-value': @timeout,
        'data-pathogen--toast-type-value': @type,
        'data-pathogen--toast-dismiss-duration-value': DISMISS_DURATION_MS,
        'data-pathogen--toast-dismissible-value': dismissible,
        'data-state': 'open',
        'aria-live': 'off',
        tabindex: 0,
        role: 'listitem'
      }
    end
  end
end
