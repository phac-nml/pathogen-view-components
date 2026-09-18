# frozen_string_literal: true

module Pathogen
  # Accessible toolbar primitive following the horizontal APG toolbar pattern.
  #
  # Use +variant: :table+ (default) for full-width table action rows with reflow.
  # Use +variant: :chip+ for compact bordered inline toolbars.
  #
  # Group related controls with {Pathogen::Toolbar::Group} so they reflow together.
  # Place {Pathogen::Toolbar::Spacer} between start and end groups on wide layouts.
  # Keep text inputs and native selects outside the toolbar's role and roving
  # focus. If an arrow-key-owning control is unavoidable, include only one and
  # put it last in DOM order per the APG toolbar pattern.
  class Toolbar < Pathogen::Component
    include Pathogen::StimulusDataMerge

    TOOLBAR_ACTIONS = %w[
      keydown->pathogen--toolbar#handleKeyDown
      focusin->pathogen--toolbar#handleFocusIn
      click->pathogen--toolbar#handleClick:capture
    ].freeze

    def initialize(label: nil, labelled_by: nil, controls: nil, variant: Pathogen::ToolbarStyles::DEFAULT_VARIANT,
                   **system_arguments)
      @label = label
      @labelled_by = labelled_by
      @controls = controls
      @variant = variant
      @system_arguments = system_arguments

      validate_accessible_name!
      validate_variant!
      build_toolbar_arguments!
    end

    private

    def validate_accessible_name!
      provided_names = [@label.present?, @labelled_by.present?].count(true)
      return if provided_names == 1

      raise ArgumentError, 'Provide exactly one of label: or labelled_by:'
    end

    def validate_variant!
      return if Pathogen::ToolbarStyles::VARIANTS.key?(@variant)

      raise ArgumentError, "variant: must be one of #{Pathogen::ToolbarStyles::VARIANTS.keys.join(', ')}"
    end

    def build_toolbar_arguments!
      apply_toolbar_aria!
      apply_toolbar_stimulus!
      @system_arguments[:class] = class_names(variant_classes, @system_arguments[:class])
    end

    def variant_classes
      Pathogen::ToolbarStyles::VARIANTS.fetch(@variant)
    end

    def apply_toolbar_aria!
      @system_arguments[:role] = 'toolbar'
      @system_arguments[:aria] ||= {}
      @system_arguments[:aria][:label] = @label if @label.present?
      @system_arguments[:aria][:labelledby] = @labelled_by if @labelled_by.present?
      @system_arguments[:aria][:controls] = @controls if @controls.present?
    end

    def apply_toolbar_stimulus!
      @system_arguments[:data] ||= {}
      @system_arguments[:data][:'pathogen--toolbar-variant'] = @variant
      merge_stimulus_data!(@system_arguments[:data], :controller, 'pathogen--toolbar')
      merge_stimulus_data!(@system_arguments[:data], :action, *TOOLBAR_ACTIONS)
    end
  end
end
