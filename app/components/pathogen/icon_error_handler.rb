# frozen_string_literal: true

module Pathogen
  # IconErrorHandler manages error handling and fallbacks for Pathogen::Icon.
  #
  # This class provides comprehensive error handling including fallback icons,
  # development error indicators, and icon name suggestions for improved
  # developer experience.
  class IconErrorHandler
    include ActionView::Helpers::TagHelper

    # Fallback icon names to try when primary icon fails
    FALLBACK_ICONS = %w[question-mark-circle warning].freeze

    # Common icon name patterns for suggestions
    ICON_SUGGESTIONS = {
      /check/ => %w[check check-circle check-badge],
      /arrow/ => %w[arrow-up arrow-down arrow-left arrow-right],
      /user/ => %w[user user-circle users],
      /plus/ => %w[plus plus-circle plus-square],
      /minus/ => %w[minus minus-circle minus-square],
      /x/ => %w[x x-circle x-mark],
      /eye/ => %w[eye eye-slash],
      /heart/ => %w[heart heart-fill]
    }.freeze

    attr_reader :icon_name, :rails_icons_options, :view_context

    # Initialize the error handler
    #
    # @param icon_name [String] The icon name that failed
    # @param rails_icons_options [Hash] The rails_icons options used
    # @param view_context [ActionView::Base] The view context for rendering helpers
    def initialize(icon_name, rails_icons_options, view_context)
      @icon_name = icon_name
      @rails_icons_options = rails_icons_options
      @view_context = view_context
    end

    # Handle icon rendering errors with comprehensive fallback strategy
    #
    # @param error [StandardError] The error that occurred
    # @return [ActiveSupport::SafeBuffer, nil] Fallback HTML or nil
    def handle_error(error)
      fallback_icon = attempt_fallback_icon
      return fallback_icon if fallback_icon

      return development_error_indicator(error) if Rails.env.local?

      nil
    end

    private

    # Attempt to render fallback icons when primary icon fails
    #
    # @return [ActiveSupport::SafeBuffer, nil] Fallback icon HTML or nil
    def attempt_fallback_icon
      FALLBACK_ICONS.each do |fallback_name|
        return render_fallback_icon(fallback_name)
      rescue StandardError
        next
      end

      nil
    end

    # Render a specific fallback icon
    #
    # @param fallback_name [String] The fallback icon name
    # @return [ActiveSupport::SafeBuffer] The rendered fallback icon
    def render_fallback_icon(fallback_name)
      fallback_options = rails_icons_options.except(:variant, :library)
      view_context.icon(fallback_name, **fallback_options)
    end

    # Create enhanced development error indicator with icon suggestions
    #
    # @param error [StandardError] The original error
    # @return [ActiveSupport::SafeBuffer] Error indicator HTML
    def development_error_indicator(error)
      suggestions = suggest_similar_icons
      suggestion_text = build_suggestion_text(suggestions)

      content_tag(
        :span,
        "Icon '#{icon_name}' not found#{suggestion_text}",
        class: 'inline-block rounded-md border border-red-200 bg-red-50 ' \
               'px-1.5 py-0.5 font-mono text-xs text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400',
        title: "Icon rendering error: #{error.message}"
      )
    end

    # Build suggestion text for development error indicator
    #
    # @param suggestions [Array<String>] Array of suggested icon names
    # @return [String] Formatted suggestion text
    def build_suggestion_text(suggestions)
      suggestions.any? ? " (Suggestions: #{suggestions.join(', ')})" : ''
    end

    # Suggest similar icon names based on common patterns
    #
    # @return [Array<String>] Array of suggested icon names
    def suggest_similar_icons
      ICON_SUGGESTIONS.find { |pattern, _| icon_name.match?(pattern) }&.last || []
    end
  end
end
