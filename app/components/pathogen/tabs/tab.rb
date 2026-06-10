# frozen_string_literal: true

module Pathogen
  class Tabs
    # Pathogen::Tabs::Tab — Tab component for Pathogen Tabs
    class Tab < Pathogen::Component
      attr_reader :id, :label, :selected, :orientation

      TAB_BUTTON_BASE = %w[
        appearance-none cursor-pointer bg-transparent text-sm font-semibold
        text-neutral-600 dark:text-neutral-300
        transition-[color,border-color,background-color] duration-150 ease-out
        hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-50
        focus-visible:outline focus-visible:outline-2
        focus-visible:outline-black dark:focus-visible:outline-white focus-visible:outline-offset-2
        aria-selected:border-primary-600 aria-selected:text-neutral-900
        dark:aria-selected:border-primary-400 dark:aria-selected:text-white
        data-[state=active]:border-primary-600
        dark:data-[state=active]:border-primary-400
        data-[state=active]:text-neutral-900
        dark:data-[state=active]:text-white
      ].freeze

      TAB_HORIZONTAL = %w[-mb-px rounded-t-md focus-visible:rounded-t-md border-b-2 border-transparent px-3.5
                          py-2.5].freeze
      TAB_VERTICAL = %w[
        mb-0 -mr-px rounded-md rounded-r-none
        focus-visible:rounded-l-md focus-visible:rounded-r-none
        border-r-2 border-b-0 border-transparent py-2.5 pl-3.5 pr-3 text-left
      ].freeze

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
          TAB_BUTTON_BASE,
          @orientation == :vertical ? TAB_VERTICAL : TAB_HORIZONTAL,
          @system_arguments[:class]
        )
      end
    end
  end
end
