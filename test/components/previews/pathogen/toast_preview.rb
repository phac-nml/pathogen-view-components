# frozen_string_literal: true

module Pathogen
  class ToastPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Toast

    # @label Playground
    # @param type select { choices: [success, info, warning, error, notice, alert] } "Toast semantic type."
    # @param timeout number "Auto-dismiss timeout in ms (ignored for errors and action toasts)."
    # @param dismissible toggle "Show a close button."
    # @param position select { choices: [bottom_right, bottom_center, top_right, top_center] }
    #   "Toaster anchor position."
    def playground(type: :info, timeout: 6000, dismissible: true, position: :bottom_right)
      render_with_template(locals: {
                             type: type.to_sym,
                             timeout: timeout.to_i,
                             dismissible:,
                             shell_class: 'relative min-h-[20rem] bg-[var(--pvc-color-surface-muted)] p-6',
                             toaster_args: {
                               position: position.to_sym,
                               strategy: :absolute,
                               turbo_permanent: false,
                               max_visible: 3
                             }
                           })
    end

    # @label Overview
    # Status variants with semantic colours and reduced visual noise.
    def overview; end

    # @label Stacking & accessibility
    # Hidden overflow, assertive error announcements, and actionable toasts.
    def stacking_and_accessibility; end

    # @label Positions
    # Position presets for host-app layout constraints.
    def positions; end

    # @!endgroup
  end
end
