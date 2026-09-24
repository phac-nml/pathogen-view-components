# frozen_string_literal: true

module Pathogen
  # ViewComponent preview for Pathogen::Toast and Pathogen::Toaster.
  class ToastPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Toast

    # @label Playground
    # @param type select { choices: [success, info, warning, error, notice, alert] }
    # @param timeout number "Status toast timeout in ms. Ignored for warning/error/dismissible."
    # @param dismissible toggle "Promote to notification dialog with a close control."
    # @param interrupt toggle "Assertive live announce (errors only)."
    # @param position select { choices: [top_center, top_right, bottom_center, bottom_right] }
    def playground(type: :info, timeout: 6000, dismissible: false, interrupt: false, position: :top_center)
      render_with_template(locals: {
                             type: type.to_sym,
                             timeout: timeout.to_i,
                             dismissible:,
                             interrupt:,
                             toaster_args: {
                               position: position.to_sym,
                               strategy: :absolute,
                               turbo_permanent: false,
                               max_visible: 3
                             }
                           })
    end

    # @label Overview
    # Status toasts vs notification dialogs in a sample-processing workspace.
    def overview; end

    # @label Stacking
    # Peek stack for status toasts; dialogs stay flat and dismissible.
    def stacking; end

    # @label Positions
    # Toaster anchor presets.
    def positions; end

    # @label Turbo stream
    # Push a toast into the toaster host via Turbo Stream append.
    def turbo_stream; end

    # @!endgroup
  end
end
