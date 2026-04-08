# frozen_string_literal: true

require_relative 'constants'

module Pathogen
  module Typography
    # Component for rendering inline code snippets
    #
    # Use for short code snippets, variable names, or technical terms within paragraphs.
    # Features monospace font, background color, and rounded corners.
    #
    # @example Inline code
    #   <%= render Pathogen::Typography::Code.new do %>
    #     variable_name
    #   <% end %>
    #
    # @example In paragraph
    #   <%= render Pathogen::Typography::Text.new do %>
    #     Use the <%= render Pathogen::Typography::Code.new do %>pathogen_heading<%% end %> component.
    #   <% end %>
    class Code < Component
      DEFAULT_TAG = :code

      attr_reader :tag

      # Initialize a new Code component
      #
      # @param tag [Symbol] HTML tag to use (default: :code)
      # @param system_arguments [Hash] Additional HTML attributes
      def initialize(tag: DEFAULT_TAG, **system_arguments)
        @tag = tag
        @system_arguments = system_arguments

        @system_arguments[:class] = class_names(
          system_arguments[:class],
          'pathogen-typography--code'
        )
      end
    end
  end
end
