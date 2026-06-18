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
        '<path fill-rule="evenodd" ' \
        'd="M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16Zm7.05-18.95a1.5 1.5 ' \
        '0 0 0-2.12-2.12L13.5 18.38l-2.43-2.43a1.5 1.5 0 0 0-2.12 2.12l3.49 3.49a1.5 1.5 0 0 0 2.12 0 ' \
        'l8.49-8.51Z" />',
      warning:
        '<path fill-rule="evenodd" ' \
        'd="M13.634 2.366a2.5 2.5 0 0 1 4.732 0l11.28 26a2.5 2.5 0 0 1-2.316 3.494H4.67a2.5 2.5 0 0 ' \
        '1-2.316-3.494l11.28-26Zm1.866 8.384a1.5 1.5 0 0 0-3 0v9a1.5 1.5 0 1 0 3 0v-9Zm-1.5 16a2 2 0 1 0 0-4 ' \
        '2 2 0 0 0 0 4Z" />',
      error:
        '<path fill-rule="evenodd" ' \
        'd="M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16Zm-4.95-20.95a1.5 1.5 ' \
        '0 0 0-2.12 2.12L11.88 16l-2.95 2.83a1.5 1.5 0 1 0 2.12 2.12L14 18.12l2.83 2.83a1.5 1.5 0 0 0 ' \
        '2.12-2.12L16.12 16l2.83-2.83a1.5 1.5 0 0 0-2.12-2.12L14 13.88l-2.95-2.83Z" />',
      info:
        '<path fill-rule="evenodd" ' \
        'd="M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16Zm0-23a1.75 1.75 0 1 0 ' \
        '0 3.5A1.75 1.75 0 0 0 16 9Zm-1.5 6a1.5 1.5 0 0 0 0 3v6a1.5 1.5 0 1 0 3 0v-7.5a1.5 1.5 0 0 0-1.5-1.5h-1.5Z" />'
    }.freeze

    attr_reader :type, :message, :description, :dismissible

    renders_one :action

    # rubocop:disable Metrics/ParameterLists
    def initialize(message:, type: TYPE_DEFAULT, description: nil, timeout: DEFAULT_TIMEOUT, dismissible: true,
                   **system_arguments)
      @type = TYPE_MAPPINGS[type.to_sym] || TYPE_DEFAULT
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
    end

    def icon_label
      I18n.t("pathogen.toast.type.#{type}")
    end

    def icon_color
      case type
      when :success then 'text-[var(--pvc-color-success)]'
      when :warning then 'text-[var(--pvc-color-warning)]'
      when :error then 'text-[var(--pvc-color-danger)]'
      else 'text-[var(--pvc-color-accent)]'
      end
    end

    def accent_bar_class
      case type
      when :success then 'bg-[var(--pvc-color-success)]'
      when :warning then 'bg-[var(--pvc-color-warning)]'
      when :error then 'bg-[var(--pvc-color-danger)]'
      else 'bg-[var(--pvc-color-accent)]'
      end
    end

    def icon_svg
      ICON_PATHS.fetch(type, ICON_PATHS[:info]).html_safe # rubocop:disable Rails/OutputSafety
    end

    private

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
        'group relative pointer-events-auto overflow-hidden rounded-[var(--pvc-radius-panel)] border',
        'border-[var(--pvc-color-border)] bg-[var(--pvc-color-surface-raised)] text-[var(--pvc-color-text)]',
        'shadow-[var(--pvc-shadow-overlay)] transition-[opacity,transform] duration-[var(--pvc-duration-default)]',
        'ease-out data-[state=closing]:translate-y-1 data-[state=closing]:opacity-0',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' \
        'focus-visible:outline-[var(--pvc-color-focus)]'
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
