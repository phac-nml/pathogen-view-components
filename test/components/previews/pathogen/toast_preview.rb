# frozen_string_literal: true

module Pathogen
  # ViewComponent preview for demonstrating Pathogen::Toast and Pathogen::Toaster usage
  class ToastPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Toast

    # @label Playground
    # @param type select { choices: [success, info, warning, error, notice, alert] } "Toast semantic type."
    # @param timeout number "Auto-dismiss timeout in ms (ignored for errors and action toasts)."
    # @param dismissible toggle "Show a close button."
    # @param position select { choices: [top_center, top_right, bottom_center, bottom_right] }
    #   "Toaster anchor position."
    def playground(type: :info, timeout: 6000, dismissible: true, position: :top_center)
      render_with_template(locals: {
                             type: type.to_sym,
                             timeout: timeout.to_i,
                             dismissible:,
                             toaster_args: {
                               position: position.to_sym,
                               strategy: :absolute,
                               turbo_permanent: false,
                               max_visible: 3
                             }
                           })
    end

    # @label Overview
    # Status variants in a sample-processing workflow with semantic colour reference.
    def overview; end

    # @label Stacking & accessibility
    # Overflow collapse, live-region routing, and actionable toasts.
    def stacking_and_accessibility; end

    # @label Positions
    # Anchor presets for host-app layout constraints.
    def positions; end

    # @label Turbo stream simulation
    # Simulates periodic Turbo Stream appends to the toaster host.
    # @param interval_ms number "Milliseconds between simulated stream events."
    def turbo_stream_simulation(interval_ms: 10_000)
      resolved_interval_ms = [interval_ms.to_i, 2000].max
      render_with_template(locals: { interval_ms: resolved_interval_ms })
    end

    # @!endgroup
  end
end
