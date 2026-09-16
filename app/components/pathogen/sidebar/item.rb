# frozen_string_literal: true

module Pathogen
  class Sidebar
    # Sidebar navigation row.
    #
    # - Leaf items render as links.
    # - Parent items render an expanded-mode Disclosure plus a rail-mode flyout trigger.
    class Item < Pathogen::Component # rubocop:disable Metrics/ClassLength
      renders_one :leading_visual

      BASE_CLASSES = %w[
        pathogen-sidebar-item
      ].join(' ').freeze

      ACTION_CLASSES = %w[
        pathogen-sidebar-item__action
      ].join(' ').freeze

      LABEL_CLASSES = %w[
        pathogen-sidebar-item__label
        text-[length:var(--type-control)]
      ].join(' ').freeze

      ICON_CLASSES = %w[
        pathogen-sidebar-item__icon
      ].join(' ').freeze

      CONTENT_CLASSES = %w[
        pathogen-sidebar-item__content
      ].join(' ').freeze

      RAIL_TRIGGER_WRAPPER_CLASSES = 'pathogen-sidebar-item__rail-trigger-wrap'
      RAIL_TRIGGER_CLASSES = 'pathogen-sidebar-item__rail-trigger'

      CHILDREN_LIST_CLASSES = 'pathogen-sidebar-item__children'
      FLYOUT_CLASSES = 'pathogen-sidebar-flyout'
      FLYOUT_HEADING_CLASSES = 'pathogen-sidebar-flyout__heading'

      # rubocop:disable-next Metrics/ParameterLists
      def initialize(
        label:,
        href: nil,
        id: nil,
        current: false,
        open: false,
        tooltip: false,
        **system_arguments
      )
        @label = label
        @href = href
        @id = id.presence || self.class.generate_id(base_name: 'sidebar-item')
        @current = current
        @open = open
        @tooltip = tooltip
        @system_arguments = system_arguments
      end

      def before_render
        raise ArgumentError, 'Sidebar::Item requires label:' if @label.blank?

        if parent_item?
          raise ArgumentError, 'Sidebar::Item parent rows cannot also set href:' if @href.present?

          return
        end

        raise ArgumentError, 'Sidebar::Item leaf rows require href:' if @href.blank?
      end

      def call
        tag.li(**list_item_attributes) do
          parent_item? ? parent_node : leaf_node
        end
      end

      private

      def parent_item?
        captured_children.present?
      end

      def list_item_attributes
        incoming_data = (@system_arguments[:data] || {}).deep_stringify_keys

        {
          id: @id,
          class: class_names(BASE_CLASSES, @system_arguments[:class], 'pathogen-sidebar-item--parent' => parent_item?),
          data: incoming_data,
          **@system_arguments.except(:class, :data, :id)
        }
      end

      def leaf_node
        action = tag.a(**leaf_action_attributes) { action_content }
        return action unless tooltip?

        tooltip_wrapper(action, tooltip_id: "#{@id}-tooltip")
      end

      def parent_node
        safe_join([
                    expanded_disclosure,
                    rail_trigger_wrapper,
                    flyout_panel
                  ])
      end

      # rubocop:disable-next Metrics/MethodLength
      def expanded_disclosure
        disclosure = Pathogen::Disclosure.new(
          id: disclosure_id,
          label: @label,
          open: @open,
          trigger_arguments: {
            class: class_names(ACTION_CLASSES, 'pathogen-sidebar-item__action--parent')
          },
          panel_arguments: {
            class: 'pathogen-sidebar-item__expanded-panel'
          }
        )
        disclosure.with_trigger { action_content }
        disclosure.with_content(tag.ul(class: CHILDREN_LIST_CLASSES, role: 'list') { children_markup })

        tag.div(class: 'pathogen-sidebar-item__expanded') do
          render(disclosure)
        end
      end

      def rail_trigger_wrapper
        action = tag.button(**rail_trigger_attributes) { action_content }
        return tag.div(action, class: RAIL_TRIGGER_WRAPPER_CLASSES) unless tooltip?

        tag.div(class: RAIL_TRIGGER_WRAPPER_CLASSES) do
          tooltip_wrapper(action, tooltip_id: "#{@id}-rail-tooltip")
        end
      end

      def tooltip_wrapper(action, tooltip_id:)
        tag.div(
          class: 'pathogen-sidebar-item__tooltip-root',
          data: {
            controller: 'pathogen--tooltip',
            'pathogen--tooltip-portal-aria-label-value' => Pathogen::Tooltip.portal_aria_label,
            'pathogen--tooltip-describedby-value' => false,
            'pathogen--tooltip-disabled-value' => true
          }
        ) do
          safe_join([
                      action,
                      render(Pathogen::Tooltip.new(id: tooltip_id, text: @label, placement: :right))
                    ])
        end
      end

      def flyout_panel
        tag.div(
          id: flyout_id,
          class: FLYOUT_CLASSES,
          role: 'group',
          hidden: true,
          aria: { labelledby: flyout_heading_id },
          data: {
            'pathogen--sidebar-target' => 'flyout'
          }
        ) do
          safe_join([
                      tag.p(@label, id: flyout_heading_id, class: FLYOUT_HEADING_CLASSES),
                      # Populated from the expanded panel by the controller so child
                      # ids are never duplicated in the server-rendered markup.
                      tag.ul(class: CHILDREN_LIST_CLASSES, role: 'list')
                    ])
        end
      end

      def leaf_action_attributes
        {
          href: @href,
          class: ACTION_CLASSES,
          aria: leaf_aria,
          data: tooltip? ? { 'pathogen--tooltip-target' => 'trigger' } : {}
        }
      end

      def leaf_aria
        @current ? { current: 'page' } : {}
      end

      def rail_trigger_attributes
        {
          type: 'button',
          class: class_names(ACTION_CLASSES, RAIL_TRIGGER_CLASSES),
          aria: {
            controls: flyout_id,
            expanded: false
          },
          data: rail_trigger_data
        }
      end

      def rail_trigger_data
        {
          action: 'click->pathogen--sidebar#toggleFlyout keydown->pathogen--sidebar#handleFlyoutTriggerKeydown',
          'pathogen-sidebar-flyout-id' => flyout_id,
          'pathogen--sidebar-target' => 'submenuTrigger'
        }.tap do |data|
          data['pathogen--tooltip-target'] = 'trigger' if tooltip?
        end
      end

      def action_content
        tag.span(class: CONTENT_CLASSES) do
          safe_join([
                      icon_node,
                      label_node
                    ])
        end
      end

      def icon_node
        content = leading_visual || @label.first.to_s.upcase

        tag.span(content, class: ICON_CLASSES, aria: { hidden: true })
      end

      def label_node
        tag.span(@label, class: LABEL_CLASSES, data: { pathogen_sidebar_label: true })
      end

      def children_markup
        @children_markup ||= captured_children.html_safe # rubocop:disable Rails/OutputSafety
      end

      def captured_children
        @captured_children ||= content.to_s.strip
      end

      def disclosure_id
        "#{@id}-disclosure"
      end

      def flyout_id
        "#{@id}-flyout"
      end

      def flyout_heading_id
        "#{flyout_id}-heading"
      end

      def tooltip?
        @tooltip == true
      end
    end
  end
end
