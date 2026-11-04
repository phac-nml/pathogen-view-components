# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Labelled navigation grouping for Sidebar items.
    class Group < Pathogen::Component
      BASE_CLASSES = %w[
        pathogen-sidebar-group
      ].join(' ').freeze

      HEADING_CLASSES = %w[
        pathogen-sidebar-group__heading
        text-[length:var(--type-meta)]
      ].join(' ').freeze

      LIST_CLASSES = %w[
        pathogen-sidebar-group__list
      ].join(' ').freeze

      def initialize(id: nil, label: nil, labelledby: nil, **system_arguments)
        @id = id.presence || self.class.generate_id(base_name: 'sidebar-group')
        @label = label
        @labelledby = labelledby
        @system_arguments = system_arguments
      end

      def before_render
        return unless @label.present? && @labelledby.present?

        raise ArgumentError, 'Sidebar::Group accepts either label: or labelledby:, not both'
      end

      def call
        tag.section(**group_attributes) do
          safe_join([
            heading_node,
            tag.ul(**list_attributes) { content }
          ].compact)
        end
      end

      private

      def group_attributes
        incoming_data = (@system_arguments[:data] || {}).deep_stringify_keys

        {
          id: @id,
          class: class_names(BASE_CLASSES, @system_arguments[:class]),
          aria: merged_aria,
          data: incoming_data,
          **@system_arguments.except(:aria, :class, :data, :id)
        }
      end

      def merged_aria
        incoming = (@system_arguments[:aria] || {}).deep_symbolize_keys
        label_target = @labelledby.presence || heading_id
        return incoming if label_target.blank?

        incoming.merge(labelledby: label_target)
      end

      def heading_node
        return if @label.blank?

        tag.h2(
          @label,
          id: heading_id,
          class: HEADING_CLASSES,
          data: { pathogen_sidebar_label: true }
        )
      end

      def list_attributes
        {
          class: LIST_CLASSES,
          role: 'list'
        }
      end

      def heading_id
        return if @label.blank?

        "#{@id}-heading"
      end
    end
  end
end
