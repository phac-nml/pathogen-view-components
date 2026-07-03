# frozen_string_literal: true

module Pathogen
  # ViewComponent preview for demonstrating Pathogen::Tabs usage
  class TabsPreview < ViewComponent::Preview
    include Pathogen::ViewHelper

    # @!group Pathogen Tabs Component

    # @label Overview
    # Horizontal tabs with run detail content, default selection, and edge cases
    def basic_usage; end

    # @label Orientations
    # Vertical layout, tab overflow, and orientation comparison
    def orientations; end

    # @label Accessibility
    # Keyboard navigation and ARIA wiring reference
    def keyboard_and_accessibility; end

    # @label URL Sync
    # Bookmarkable tabs with hash synchronization
    def url_sync; end

    # @label Lazy Loading
    # Turbo Frame lazy panels with demo request mocks
    def turbo_frame_lazy_load; end

    # @label Integration
    # Settings layout and form footer patterns
    def integration_examples; end

    # @!endgroup
  end
end
