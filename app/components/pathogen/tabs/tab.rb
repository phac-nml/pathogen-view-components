# frozen_string_literal: true

module Pathogen
  class Tabs
    # Tab Component
    # Individual tab control within a Tabs component.
    # Implements W3C ARIA tab pattern with keyboard navigation support.
    #
    # @example Basic tab
    #   <%= render Pathogen::Tabs::Tab.new(
    #     id: "tab-1",
    #     label: "Overview",
    #     selected: true
    #   ) %>
    class Tab < Pathogen::Component
      attr_reader :id, :label, :selected, :orientation

      # Initialize a new Tab component
      # @param id [String] Unique identifier for the tab (required)
      # @param label [String] Text label for the tab (required)
      # @param selected [Boolean] Whether the tab is initially selected (default: false)
      # @param orientation [Symbol] Tab orientation (:horizontal or :vertical, default: :horizontal)
      # @param system_arguments [Hash] Additional HTML attributes
      # @raise [ArgumentError] if id or label is missing
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

      # Allows the parent Tabs component to align server-rendered state with
      # the configured default index before Stimulus connects.
      #
      # @param selected [Boolean] whether the tab should start selected
      def set_selected(selected:)
        @selected = selected
        @system_arguments[:aria][:selected] = @selected.to_s
        @system_arguments[:tabindex] = @selected ? 0 : -1
        @system_arguments[:data][:state] = @selected ? 'active' : 'inactive'
      end

      private

      # Sets up HTML and ARIA attributes for the tab button
      def setup_tab_attributes
        @system_arguments[:id] = @id
        @system_arguments[:type] = 'button'
        @system_arguments[:role] = 'tab'
        @system_arguments[:aria] ||= {}
        @system_arguments[:aria][:controls] = nil # Will be set by JavaScript

        setup_data_attributes
        setup_css_classes
        set_selected(selected: @selected)
      end

      # Sets up Stimulus data attributes
      def setup_data_attributes
        @system_arguments[:data] ||= {}
        @system_arguments[:data]['pathogen--tabs-target'] = 'tab'
        @system_arguments[:data][:action] = [
          'click->pathogen--tabs#selectTab',
          'keydown->pathogen--tabs#handleKeyDown'
        ].join(' ')
      end

      # Sets up Pathogen CSS contract classes.
      def setup_css_classes
        @system_arguments[:class] = class_names(
          'pathogen-tabs__tab',
          "pathogen-tabs__tab--#{@orientation}",
          @system_arguments[:class]
        )
      end
    end
  end
end
