# frozen_string_literal: true

module Pathogen
  # Pathogen::ToastSettings renders a small, native, accessible control that lets
  # a user choose how long status toasts stay on screen. It persists the choice
  # to `localStorage['pathogen.toast.durationMs']`, which Pathogen::Toaster and
  # Pathogen::Toast read.
  #
  # This is the user-facing mechanism that lets host apps satisfy WCAG 2.2.1
  # (Timing Adjustable) when a status toast is the only place information appears.
  # Render it anywhere in the app's settings/preferences UI.
  class ToastSettings < Pathogen::Component
    STORAGE_KEY = 'pathogen.toast.durationMs'

    # Ordered option keys → the value written to storage.
    # `default` clears the preference (falls back to the component default, 6s);
    # `forever` promotes status toasts to dismissible dialogs.
    OPTION_VALUES = {
      default: '',
      extend: '20000',
      forever: 'forever'
    }.freeze
    DEFAULT_OPTIONS = OPTION_VALUES.keys.freeze

    attr_reader :storage_key, :options, :selected, :select_id, :description_id

    # rubocop:disable Metrics/ParameterLists
    def initialize(storage_key: STORAGE_KEY, options: DEFAULT_OPTIONS, selected: :default, label: nil,
                   description: nil, **system_arguments)
      @storage_key = storage_key.to_s.presence || STORAGE_KEY
      @options = Array(options).map(&:to_sym).select { |key| OPTION_VALUES.key?(key) }
      @options = DEFAULT_OPTIONS.dup if @options.empty?
      @selected = normalized_selected(selected)
      @label = label
      @description = description
      @select_id = self.class.generate_id(base_name: 'pvc-toast-settings')
      @description_id = "#{@select_id}-desc"

      @system_arguments = system_arguments
      apply_system_arguments
    end
    # rubocop:enable Metrics/ParameterLists

    def label
      @label.presence || t('pathogen.toast.settings.label')
    end

    def description
      @description.presence || t('pathogen.toast.settings.description')
    end

    def option_value(key)
      OPTION_VALUES.fetch(key, '')
    end

    def option_label(key)
      t("pathogen.toast.settings.options.#{key}")
    end

    def selected?(key)
      key == @selected
    end

    def select_attributes
      {
        id: select_id,
        class: class_names(
          'mt-1 inline-flex min-h-6 rounded-[var(--pvc-radius-control)] border border-[var(--pvc-color-border)]',
          'bg-[var(--pvc-color-surface-raised)] px-2 py-1 text-[length:var(--type-control)]',
          'text-[var(--pvc-color-text)] focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-[var(--pvc-color-focus)]'
        ),
        'aria-describedby': description.present? ? description_id : nil,
        data: {
          'pathogen--toast-settings-target': 'select',
          action: 'change->pathogen--toast-settings#save'
        }
      }
    end

    private

    def normalized_selected(value)
      candidate = value.respond_to?(:to_sym) ? value.to_sym : :default
      OPTION_VALUES.key?(candidate) ? candidate : :default
    end

    def apply_system_arguments
      @system_arguments[:class] = class_names('pvc-toast-settings flex flex-col gap-1', @system_arguments[:class])
      @system_arguments[:'data-controller'] = class_names(
        @system_arguments[:'data-controller'],
        'pathogen--toast-settings'
      )
      @system_arguments[:'data-pathogen--toast-settings-storage-key-value'] = @storage_key
    end
  end
end
