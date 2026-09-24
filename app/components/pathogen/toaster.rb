# frozen_string_literal: true

module Pathogen
  # Pathogen::Toaster renders an always-present toast host with live regions, peek stack, and notification log.
  class Toaster < Pathogen::Component
    DEFAULT_POSITION = :top_center
    DEFAULT_STRATEGY = :fixed
    # nil = read pathogen.toast.durationMs from localStorage in the Stimulus controller.
    # Integer ms overrides status-toast timeouts. 0 means forever (promote to dialog).
    DEFAULT_DURATION_PREFERENCE = nil

    POSITION_MAPPINGS = {
      top_right: 'top-6 right-4 left-4 sm:left-auto items-end',
      top_center: 'top-6 left-1/2 -translate-x-1/2 items-center',
      bottom_right: 'bottom-4 right-4 left-4 sm:left-auto items-end',
      bottom_center: 'bottom-4 left-1/2 -translate-x-1/2 items-center'
    }.freeze
    CENTER_POSITIONS = %i[top_center bottom_center].freeze
    TOP_POSITIONS = %i[top_right top_center].freeze
    CORNER_POSITIONS = %i[top_right bottom_right].freeze
    STRATEGY_MAPPINGS = {
      fixed: 'fixed',
      absolute: 'absolute'
    }.freeze
    TOASTER_ACTIONS = [
      'mouseenter->pathogen--toaster#expand',
      'mouseleave->pathogen--toaster#collapseIfIdle',
      'focusin->pathogen--toaster#expand',
      'focusout->pathogen--toaster#collapseIfIdle',
      'pathogen:toast:announce->pathogen--toaster#announce',
      'pathogen:toast:log->pathogen--toaster#appendLog',
      'pathogen:toast:dismissed->pathogen--toaster#handleToastDismissed'
    ].freeze

    attr_reader :list_id, :max_visible, :region_label, :duration_preference, :assertive_region_label,
                :log_label, :log_toggle_label, :more_label, :dismiss_all_label, :empty_log_label

    # rubocop:disable Metrics/ParameterLists
    def initialize(position: DEFAULT_POSITION, strategy: DEFAULT_STRATEGY, list_id: 'flashes', max_visible: 3,
                   aria_label: nil, turbo_permanent: true, duration_preference: DEFAULT_DURATION_PREFERENCE,
                   **system_arguments)
      @position = fetch_or_fallback(POSITION_MAPPINGS.keys, position, DEFAULT_POSITION)
      @strategy = fetch_or_fallback(STRATEGY_MAPPINGS.keys, strategy, DEFAULT_STRATEGY)
      @list_id = list_id
      @max_visible = [max_visible.to_i, 1].max
      @region_label = aria_label
      @assertive_region_label = nil
      @turbo_permanent = turbo_permanent
      @duration_preference = normalize_duration_preference(duration_preference)

      @system_arguments = system_arguments
      apply_system_arguments
    end
    # rubocop:enable Metrics/ParameterLists

    def before_render
      @region_label ||= t('pathogen.toast.region_label')
      @assertive_region_label = t('pathogen.toast.assertive_region_label')
      @log_label = t('pathogen.toast.log_label')
      @log_toggle_label = t('pathogen.toast.log_toggle')
      @more_label = t('pathogen.toast.more_notifications')
      @dismiss_all_label = t('pathogen.toast.dismiss_all')
      @empty_log_label = t('pathogen.toast.log_empty')
    end

    private

    def normalize_duration_preference(value)
      return nil if value.nil? || value == ''
      return 0 if [:forever, 'forever'].include?(value)

      integer = value.to_i
      integer.negative? ? nil : integer
    end

    def anchor_edge
      TOP_POSITIONS.include?(@position) ? 'top' : 'bottom'
    end

    def layout_kind
      CORNER_POSITIONS.include?(@position) ? 'corner' : 'center'
    end

    def apply_system_arguments
      @system_arguments[:class] = class_names(
        'pvc-toaster',
        STRATEGY_MAPPINGS[@strategy],
        'pointer-events-none z-50 flex flex-col max-w-md',
        layout_width_classes,
        POSITION_MAPPINGS[@position],
        @system_arguments[:class]
      )
      @system_arguments[:'data-controller'] = class_names(@system_arguments[:'data-controller'], 'pathogen--toaster')
      @system_arguments[:'data-action'] = class_names(@system_arguments[:'data-action'], *TOASTER_ACTIONS)
      apply_stack_data_attributes
      apply_turbo_permanent_attributes
    end

    def apply_stack_data_attributes
      @system_arguments[:'data-pathogen--toaster-max-visible-value'] = @max_visible
      @system_arguments[:'data-pathogen--toaster-position-value'] = @position
      unless @duration_preference.nil?
        @system_arguments[:'data-pathogen--toaster-duration-preference-value'] = @duration_preference
      end
      @system_arguments[:'data-stack'] = 'peek'
      @system_arguments[:'data-expanded'] = 'false'
      @system_arguments[:'data-anchor'] = anchor_edge
      @system_arguments[:'data-layout'] = layout_kind
      @system_arguments[:'data-has-peek'] = 'false'
    end

    def apply_turbo_permanent_attributes
      return unless @turbo_permanent && @system_arguments[:'data-turbo-permanent'].nil?

      @system_arguments[:'data-turbo-permanent'] = true
      # Turbo only preserves permanent elements that carry a stable id on both the
      # outgoing and incoming page, so derive one from the list id when none is given.
      @system_arguments[:id] ||= "#{@list_id}-toaster"
    end

    def layout_width_classes
      if CENTER_POSITIONS.include?(@position)
        'w-full px-4 sm:px-0'
      else
        'sm:w-max'
      end
    end
  end
end
