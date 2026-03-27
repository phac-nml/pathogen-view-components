# frozen_string_literal: true

module Pathogen
  class Tabs
    # TabPanel Component
    # Content area associated with a tab control.
    # Implements W3C ARIA tabpanel pattern.
    #
    # @example Basic panel
    #   <%= render Pathogen::Tabs::TabPanel.new(
    #     id: "panel-1",
    #     tab_id: "tab-1"
    #   ) do %>
    #     <p>Panel content goes here</p>
    #   <% end %>
    #
    # @example Panel with Turbo Frame lazy loading
    #   <%= render Pathogen::Tabs::TabPanel.new(
    #     id: "panel-1",
    #     tab_id: "tab-1"
    #   ) do %>
    #     <%= turbo_frame_tag "panel-1-content",
    #                         src: details_path,
    #                         loading: :lazy do %>
    #       <%= render partial: "shared/loading/spinner" %>
    #     <% end %>
    #   <% end %>
    #
    # == Turbo Frame Lazy Loading Integration
    #
    # The TabPanel component works seamlessly with Turbo Frames for lazy loading content.
    # When a panel contains a Turbo Frame with `loading: :lazy`, the frame will automatically
    # fetch its content when the panel becomes visible (i.e., when the `hidden` attribute is removed).
    #
    # === How It Works
    #
    # 1. **Initial State**: Panel starts with the `hidden` attribute applied by the component.
    #    Turbo Frame is present but hasn't fetched its content yet.
    #
    # 2. **Tab Selection**: When user clicks the associated tab, the Stimulus controller
    #    removes the `hidden` attribute from the panel via `#selectTabByIndex()`.
    #
    # 3. **Automatic Fetch**: Turbo detects the frame has become visible and automatically
    #    triggers the fetch to the URL specified in the `src` attribute.
    #
    # 4. **Loading State**: While fetching, the Turbo Frame displays its fallback content
    #    (typically a loading spinner or skeleton).
    #
    # 5. **Content Morph**: Once loaded, Turbo morphs the frame's content into place,
    #    replacing the loading indicator with the actual content.
    #
    # 6. **Caching**: Turbo automatically caches the loaded content. If the user navigates
    #    away and returns to the tab, the cached content displays immediately without refetch.
    #
    # === Key Requirements
    #
    # - Panel visibility must be controlled via the native `hidden` attribute, NOT
    #   inline styles, so Turbo can detect visibility changes reliably.
    #
    # - Turbo Frame must have `loading: :lazy` attribute to defer loading until visible.
    #
    # - The `src` URL should respond with Turbo Stream format or HTML containing the
    #   matching turbo-frame tag.
    #
    # === Example Controller Response
    #
    #   # app/controllers/projects_controller.rb
    #   def details
    #     @project = Project.find(params[:id])
    #
    #     respond_to do |format|
    #       format.turbo_stream
    #       format.html
    #     end
    #   end
    #
    #   # app/views/projects/details.turbo_stream.erb
    #   <%= turbo_stream.replace "panel-details-content" do %>
    #     <%= render "projects/details_content", project: @project %>
    #   <% end %>
    #
    # === No JavaScript Needed
    #
    # The component's Stimulus controller (`pathogen--tabs`) handles panel visibility
    # by toggling the `hidden` attribute. No additional JavaScript is needed for Turbo Frame
    # integration - Turbo handles the lazy loading automatically when the panel becomes visible.
    class TabPanel < Pathogen::Component
      attr_reader :id, :tab_id

      DEFAULT_INITIALLY_HIDDEN = true

      # Initialize a new TabPanel component
      # @param id [String] Unique identifier for the panel (required)
      # @param tab_id [String] ID of the associated tab (required)
      # @param lazy_panel [Pathogen::Tabs::LazyPanel, nil] Optional LazyPanel component to render
      # @param system_arguments [Hash] Additional HTML attributes
      # @raise [ArgumentError] if id or tab_id is missing
      def initialize(id:, tab_id:, initially_hidden: DEFAULT_INITIALLY_HIDDEN, lazy_panel: nil, **system_arguments,
                     &block)
        raise ArgumentError, 'id is required' if id.blank?
        raise ArgumentError, 'tab_id is required' if tab_id.blank?

        @id = id
        @tab_id = tab_id
        @initially_hidden = initially_hidden
        @lazy_panel = lazy_panel
        @system_arguments = system_arguments
        @block = block

        setup_panel_attributes
      end

      # Allows the parent Tabs component to adjust the initial visibility so the
      # default panel remains visible when JavaScript is unavailable.
      #
      # @param hidden [Boolean] Whether the panel should start hidden
      def set_initial_visibility(hidden: DEFAULT_INITIALLY_HIDDEN)
        return if hidden == initially_hidden?

        @initially_hidden = hidden
        update_aria_hidden
        update_hidden_attribute
        update_data_state
      end

      # Returns the LazyPanel component if this is a lazy panel
      # @return [Pathogen::Tabs::LazyPanel, nil]
      attr_reader :lazy_panel

      private

      def initially_hidden?
        @initially_hidden
      end

      # Sets up HTML and ARIA attributes for the panel
      def setup_panel_attributes
        @system_arguments[:id] = @id
        @system_arguments[:role] = 'tabpanel'
        @system_arguments[:aria] ||= {}
        @system_arguments[:aria][:labelledby] = @tab_id
        update_aria_hidden # Will be updated by JavaScript
        @system_arguments[:tabindex] = 0

        setup_data_attributes
        setup_component_classes
        update_hidden_attribute
        update_data_state
      end

      # Sets up Stimulus data attributes
      def setup_data_attributes
        @system_arguments[:data] ||= {}
        @system_arguments[:data]['pathogen--tabs-target'] = 'panel'
        @system_arguments[:data]['tab-panel-id'] = @id
      end

      def update_aria_hidden
        @system_arguments[:aria][:hidden] = initially_hidden? ? 'true' : 'false'
      end

      def setup_component_classes
        @system_arguments[:class] = class_names('pathogen-tabs__panel', @system_arguments[:class])
      end

      def update_hidden_attribute
        @system_arguments[:hidden] = initially_hidden? || nil
      end

      def update_data_state
        @system_arguments[:data][:state] = initially_hidden? ? 'inactive' : 'active'
      end
    end
  end
end
