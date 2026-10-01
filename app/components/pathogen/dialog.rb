# frozen_string_literal: true

module Pathogen
  # A named native modal with a scrollable body and host-composed actions.
  #
  # Use a stable id: for external triggers and server-rendered replacements.
  # initial_focus: is a selector within the dialog; return_focus: is a document
  # selector used when the original opener is no longer available.
  class Dialog < Pathogen::Component
    include Pathogen::StimulusDataMerge

    SIZE_OPTIONS = %i[small medium large extra_large].freeze
    DEFAULT_SIZE = :medium
    HEADING_LEVELS = (1..6)
    PROTECTED_ATTRIBUTES = %i[id tag role open tabindex hidden inert].freeze
    PROTECTED_ARIA = %w[label labelledby describedby modal hidden].freeze

    renders_one :trigger, lambda { |**arguments|
      Pathogen::Button.new(**trigger_attributes(arguments))
    }
    renders_one :footer

    attr_reader :id, :title, :description, :heading_level

    # Additional HTML attributes apply to the native dialog, not its wrapper.
    # Component-owned naming, modal state, targets, and wiring remain protected.
    # rubocop:disable-next Metrics/ParameterLists
    def initialize(title:, id: nil, description: nil, size: DEFAULT_SIZE, open: false,
                   initial_focus: nil, return_focus: nil, heading_level: 2, **system_arguments)
      @id = id.presence || self.class.generate_id(base_name: 'dialog')
      @title = title
      @description = description
      @size = fetch_or_fallback(SIZE_OPTIONS, size, DEFAULT_SIZE)
      @open = open
      @initial_focus = selector_value(initial_focus, :initial_focus)
      @return_focus = selector_value(return_focus, :return_focus)
      @heading_level = normalize_heading_level(heading_level)
      @system_arguments = normalize_attributes(system_arguments)
      raise ArgumentError, '`class` is an invalid argument. Use `classes` instead.' if @system_arguments.key?(:class)
    end

    def before_render
      raise ArgumentError, 'Dialog requires a nonblank title:' if title.blank?
      raise ArgumentError, 'Dialog requires a content block for the body' unless content?
    end

    def root_attributes
      {
        class: 'pathogen-dialog-root',
        data: {
          controller: 'pathogen--dialog',
          'pathogen--dialog-open-value' => @open,
          'pathogen--dialog-initial-focus-value' => @initial_focus,
          'pathogen--dialog-return-focus-value' => @return_focus
        }.compact
      }
    end

    def dialog_attributes
      attributes = @system_arguments.except(*PROTECTED_ATTRIBUTES, :classes, :aria, :data)
      attributes.merge(
        id: id,
        class: class_names('pathogen-dialog', @system_arguments[:classes]),
        aria: dialog_aria,
        data: dialog_data(@system_arguments[:data]).merge(
          'size' => @size,
          'pathogen--dialog-target' => 'dialog'
        )
      )
    end

    def title_id
      "#{id}-title"
    end

    def description_id
      "#{id}-description"
    end

    private

    def normalize_heading_level(level)
      integer_level = Integer(level, exception: false)
      return integer_level if integer_level && HEADING_LEVELS.cover?(integer_level)

      raise ArgumentError, 'Dialog heading_level: must be 1–6'
    end

    def selector_value(value, name)
      return if value.nil?
      raise ArgumentError, "Dialog #{name}: must be a selector string" unless value.is_a?(String)

      value.presence
    end

    def normalize_attributes(arguments)
      attributes = arguments.deep_dup.symbolize_keys
      %i[aria data].each do |prefix|
        nested = (attributes.delete(prefix) || {}).deep_stringify_keys
        attributes.each_key do |key|
          next unless key.to_s.start_with?("#{prefix}-")

          nested[key.to_s.delete_prefix("#{prefix}-")] = attributes.delete(key)
        end
        attributes[prefix] = nested
      end
      attributes
    end

    def dialog_aria
      aria = (@system_arguments[:aria] || {}).except(*PROTECTED_ARIA)
      aria['labelledby'] = title_id
      aria['describedby'] = description_id if description.present?
      aria
    end

    def dialog_data(incoming)
      data = incoming.except('pathogen--dialog-target')
      controllers = data['controller'].to_s.split - ['pathogen--dialog']
      data['controller'] = controllers.join(' ') if data.key?('controller')
      data
    end

    def trigger_attributes(arguments)
      attributes = normalize_attributes(arguments)
      attributes[:class] = class_names(attributes.delete(:classes), attributes[:class])
      data = dialog_data(attributes.delete(:data))
      merge_stimulus_data!(data, 'action', 'click->pathogen--dialog#openFromTrigger')
      attributes.merge(
        tag: :button,
        type: :button,
        base_button_class: Pathogen::BaseButton,
        aria: attributes[:aria].merge('controls' => id, 'haspopup' => 'dialog'),
        data: data
      ).except(:href)
    end
  end
end
