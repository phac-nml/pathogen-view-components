# frozen_string_literal: true

module Pathogen
  # Sidebar navigation column. On mobile, the controller moves the panel into
  # the native dialog while preserving this component's nav landmark.
  class Sidebar < Pathogen::Component
    BASE_CLASSES = %w[
      pathogen-sidebar
      relative flex min-h-full w-full self-stretch flex-col
      border-r border-[color:var(--pvc-color-border)]
      bg-[var(--pvc-color-surface)]
      text-[color:var(--pvc-color-text)]
    ].join(' ').freeze

    DIALOG_CLASSES = 'pathogen-sidebar-dialog'
    PANEL_CLASSES = 'pathogen-sidebar-panel'

    attr_reader :id

    # Canonical localStorage key for a sidebar's persisted desktop open state.
    # Shared by Provider, the boot helper, and the Stimulus controller.
    def self.storage_key(id)
      "pathogen.sidebar.#{id.presence || 'sidebar'}.open"
    end

    def initialize(id: nil, label: nil, labelledby: nil, **system_arguments)
      @id = id.presence || self.class.generate_id(base_name: 'sidebar')
      @label = label
      @labelledby = labelledby
      @system_arguments = system_arguments
    end

    def before_render
      return if @label.present? || @labelledby.present?

      raise ArgumentError, 'Sidebar requires label: or labelledby: for nav landmark naming'
    end

    def call
      safe_join([
                  tag.dialog(**dialog_attributes),
                  tag.div(**panel_attributes) do
                    safe_join([dialog_close_button, tag.nav(**attributes) { content }])
                  end
                ])
    end

    private

    def attributes
      {
        id: @id,
        class: class_names(BASE_CLASSES, @system_arguments[:class]),
        aria: aria_attributes,
        data: data_attributes,
        tabindex: -1,
        **@system_arguments.except(:class, :aria, :data, :id, :tabindex)
      }
    end

    def dialog_attributes
      {
        id: "#{@id}-dialog",
        class: DIALOG_CLASSES,
        data: {
          action: 'click->pathogen--sidebar#closeOnBackdrop',
          'pathogen--sidebar-target' => 'dialog'
        }
      }
    end

    def panel_attributes
      {
        id: "#{@id}-panel",
        class: PANEL_CLASSES,
        data: { 'pathogen--sidebar-target' => 'panel' }
      }
    end

    def dialog_close_button
      label = I18n.t('pathogen.sidebar.provider.close_label')

      tag.button(
        type: 'button',
        class: class_names(Pathogen::Sidebar::Trigger::BASE_CLASSES, 'pathogen-sidebar-dialog__close'),
        aria: { label: label },
        title: label,
        data: {
          action: 'click->pathogen--sidebar#closeOffcanvas',
          'pathogen--sidebar-target' => 'close'
        }
      ) do
        tag.span('', class: Pathogen::Sidebar::Trigger::ICON_CLASSES, aria: { hidden: true })
      end
    end

    def aria_attributes
      incoming = (@system_arguments[:aria] || {}).deep_symbolize_keys
      incoming[:label] = @label if @label.present?
      incoming[:labelledby] = @labelledby if @labelledby.present?
      incoming
    end

    def data_attributes
      incoming = (@system_arguments[:data] || {}).deep_stringify_keys
      # Target is owned by the component, not overridable by callers.
      incoming.merge('pathogen--sidebar-target' => 'sidebar')
    end
  end
end
