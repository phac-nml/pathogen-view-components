# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Toggle for expanded/rail/off-canvas sidebar states.
    class Trigger < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-trigger
        inline-flex min-h-11 min-w-11 items-center justify-center
        rounded-[var(--pvc-radius-action)] border border-transparent
        bg-transparent text-[color:var(--pvc-color-text-muted)]
        interactive-hover:bg-[var(--pvc-color-surface-muted)]
        interactive-hover:text-[color:var(--pvc-color-text)]
        focus-visible:outline focus-visible:outline-2
        focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-2
      ].join(' ').freeze

      ICON_CLASSES = 'pathogen-sidebar-trigger__icon relative block h-4 w-4'

      def initialize(icon_only: true, **system_arguments)
        @icon_only = icon_only
        @system_arguments = system_arguments
      end

      def call
        tag.button(**attributes) do
          safe_join([
            tag.span('', class: ICON_CLASSES, aria: { hidden: true }),
            label_span
          ].compact)
        end
      end

      private

      def attributes
        incoming_data = (@system_arguments[:data] || {}).deep_stringify_keys
        actions = [incoming_data['action'], 'click->pathogen--sidebar#toggle'].compact.join(' ').strip

        {
          type: 'button',
          class: class_names(BASE_CLASSES, @system_arguments[:class]),
          aria: {
            label: t('.open_label')
          },
          title: t('.open_label'),
          data: incoming_data.merge(
            'action' => actions,
            'pathogen--sidebar-target' => 'trigger'
          ),
          **@system_arguments.except(:class, :data, :aria, :title, :type)
        }
      end

      def label_span
        return if @icon_only

        tag.span(content || t('.label'), class: 'ml-2', data: { pathogen_sidebar_label: true })
      end
    end
  end
end
