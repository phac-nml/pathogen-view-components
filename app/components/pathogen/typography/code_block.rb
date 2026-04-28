# frozen_string_literal: true

require_relative 'constants'

module Pathogen
  module Typography
    # Component for rendering multi-line code blocks
    #
    # Perfect for multi-line code snippets. Features a dark background, monospace font,
    # and scrollable overflow for long code examples.
    #
    # **Note on syntax highlighting**: The `language` parameter adds a CSS class
    # (`language-{language}`) to the `<code>` element. To enable syntax highlighting,
    # you must integrate a syntax highlighting library like Prism.js or Highlight.js
    # that uses these classes. Without a highlighting library, the code will display
    # as plain text with consistent styling.
    #
    # @example Code block
    #   <%= render Pathogen::Typography::CodeBlock.new(language: "ruby") do %>
    #     def example
    #       puts "Hello"
    #     end
    #   <% end %>
    #
    # @example With language class for syntax highlighting
    #   <%= render Pathogen::Typography::CodeBlock.new(language: "javascript") do %>
    #     const example = () => {
    #       console.log("Hello");
    #     };
    #   <% end %>
    class CodeBlock < Component
      attr_reader :language

      # Initialize a new CodeBlock component
      #
      # @param language [String, Symbol, nil] Programming language identifier (e.g., "ruby", "javascript").
      #   Adds a `language-{language}` CSS class for syntax highlighting libraries.
      # @param system_arguments [Hash] Additional HTML attributes applied to the wrapper
      def initialize(language: nil, **system_arguments)
        @language = language
        @system_arguments = system_arguments

        @wrapper_classes = build_wrapper_classes(system_arguments[:class])
        @pre_classes = 'pathogen-typography--code-block__pre'
        @code_classes = build_code_classes(language)
      end

      private

      def build_wrapper_classes(custom_class)
        class_names(
          custom_class,
          'pathogen-typography--code-block'
        )
      end

      def build_code_classes(language)
        class_names(
          'pathogen-typography--code-block__code',
          language_class(language)
        )
      end

      def language_class(language)
        return if language.blank?

        "language-#{language}"
      end
    end
  end
end
