# frozen_string_literal: true

require_relative '../../../lib/pathogen/tabs_styles'

module Pathogen
  class Tabs
    # Pathogen::Tabs::Tab — Tab component for Pathogen Tabs
    class Tab < Pathogen::Component
      include Pathogen::TabsStyles

      attr_reader :id, :label, :selected, :orientation

      def initialize(id:, label:, selected: false, orientation: :horizontal, **system_arguments)
        raise ArgumentError, 'id is required' if id.blank?
        raise ArgumentError, 'label is required' if label.blank?

        @id = id
        @label = label
        @selected = selected
        @orientation = orientation
        @system_arguments = system_arguments

        setup_tab_attributes
      end

      def button_attributes
        @system_arguments.merge(id: @id, aria: @system_arguments[:aria].compact)
      end

      def set_selected(selected:)
        @selected = selected
        @system_arguments[:aria][:selected] = @selected.to_s
        @system_arguments[:tabindex] = @selected ? 0 : -1
        @system_arguments[:data][:state] = @selected ? 'active' : 'inactive'
      end

      private

      def setup_tab_attributes
        @system_arguments[:id] = @id
        @system_arguments[:type] = 'button'
        @system_arguments[:role] = 'tab'
        @system_arguments[:title] = @label if @orientation == :vertical
        @system_arguments[:aria] ||= {}
        @system_arguments[:aria][:controls] = nil

        setup_data_attributes
        setup_css_classes
        set_selected(selected: @selected)
      end

      def setup_data_attributes
        @system_arguments[:data] ||= {}
        @system_arguments[:data]['pathogen--tabs-target'] = 'tab'
        @system_arguments[:data][:action] = [
          'click->pathogen--tabs#selectTab',
          'keydown->pathogen--tabs#handleKeyDown'
        ].join(' ')
      end

      def setup_css_classes
        @system_arguments[:class] = class_names(
          tab_classes(orientation: @orientation),
          @system_arguments[:class]
        )
      end
    end
  end
end
