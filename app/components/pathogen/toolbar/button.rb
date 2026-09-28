# frozen_string_literal: true

module Pathogen
  # Toolbar button preset that composes Pathogen::Button with roving-focus defaults.
  class Toolbar::Button < Pathogen::Button
    include Pathogen::StimulusDataMerge

    TARGET_DATA_KEY = 'pathogen--toolbar-target'

    # rubocop:disable-next Metrics/ParameterLists
    def initialize(label: nil, pressed: nil, disabled: false, aria_disabled: false, tag: :button, tone: :neutral,
                   emphasis: :outline, size: :medium, **system_arguments)
      disabled ||= system_arguments.delete('disabled') == true

      raise ArgumentError, 'Cannot set both disabled and aria_disabled on a toolbar button' if disabled && aria_disabled

      apply_toolbar_defaults!(system_arguments, label:, pressed:, tag:)

      super(
        tag:,
        tone:,
        emphasis:,
        size:,
        disabled:,
        aria_disabled:,
        **system_arguments
      )
    end

    private

    def apply_toolbar_defaults!(system_arguments, label:, pressed:, tag:)
      system_arguments[:tabindex] = -1
      apply_detached_form_submit_default!(system_arguments, tag)

      system_arguments[:aria] ||= {}
      system_arguments[:aria][:label] = label if label.present?
      system_arguments[:aria][:pressed] = pressed unless pressed.nil?

      system_arguments[:data] ||= {}
      merge_stimulus_data!(system_arguments[:data], TARGET_DATA_KEY, 'item')
    end

    def apply_detached_form_submit_default!(system_arguments, tag)
      return unless tag.to_sym == :button
      return unless system_arguments[:form].present? || system_arguments['form'].present?
      return if system_arguments[:type].present? || system_arguments['type'].present?

      system_arguments[:type] = :submit
    end
  end
end
