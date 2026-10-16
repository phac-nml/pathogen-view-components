# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Host-provided brand link that remains visible in the collapsed rail.
    class Brand < Pathogen::Component
      renders_one :mark

      BASE_CLASSES = %w[
        pathogen-sidebar-brand
        inline-flex min-h-11 min-w-0 items-center gap-2
        rounded-[var(--pvc-radius-action)]
        text-[color:var(--pvc-color-text)]
        focus-visible:outline focus-visible:outline-2
        focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-2
      ].join(' ').freeze

      def initialize(label:, href:, **system_arguments)
        @label = label
        @href = href
        @system_arguments = system_arguments
      end

      def before_render
        raise ArgumentError, 'Sidebar::Brand requires label:' if @label.blank?
        raise ArgumentError, 'Sidebar::Brand requires href:' if @href.blank?
        raise ArgumentError, 'Sidebar::Brand requires mark content' unless mark
      end

      def call
        tag.a(**attributes) do
          safe_join([
                      tag.span(mark, class: 'pathogen-sidebar-brand__mark', aria: { hidden: true }),
                      tag.span(@label, class: 'pathogen-sidebar-brand__label')
                    ])
        end
      end

      private

      def attributes
        {
          href: @href,
          class: class_names(BASE_CLASSES, @system_arguments[:class]),
          aria: { label: "#{@label} home" },
          **@system_arguments.except(:class, :aria, :href)
        }
      end
    end
  end
end
