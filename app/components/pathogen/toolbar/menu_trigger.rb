# frozen_string_literal: true

module Pathogen
  # Menu-button trigger for toolbars. Popup content stays host-managed in v1.
  class Toolbar::MenuTrigger < Pathogen::Component
    # rubocop:disable Metrics/ParameterLists
    def initialize(
      label: nil, controls: nil, expanded: false, haspopup: 'menu', id: nil, scheme: :default, size: :small,
      **system_arguments
    )
      @label = label
      @controls = controls
      @expanded = expanded
      @haspopup = haspopup
      @scheme = scheme
      @size = size
      @button_arguments = system_arguments
      @button_arguments[:id] = id if id.present?

      build_trigger_arguments!
    end
    # rubocop:enable Metrics/ParameterLists

    def call
      render(Pathogen::Toolbar::Button.new(label: @label, scheme: @scheme, size: @size, **@button_arguments)) do
        content
      end
    end

    private

    def build_trigger_arguments!
      apply_trigger_aria!
    end

    def apply_trigger_aria!
      @button_arguments[:aria] ||= {}
      @button_arguments[:aria][:haspopup] = @haspopup
      @button_arguments[:aria][:expanded] = @expanded
      @button_arguments[:aria][:controls] = @controls if @controls.present?
    end
  end
end
