# frozen_string_literal: true

require_relative 'constants'
require_relative '../../../lib/pathogen/inline_code_styles'

module Pathogen
  module Typography
    # Pathogen::Typography::Code — Inline monospace value for prose and forms.
    #
    # Shares the muted inline code surface with {Pathogen::CopyableValue}. Use Code for
    # read-only inline snippets; use CopyableValue when the value includes a copy action.
    class Code < Component
      DEFAULT_TAG = :code

      CODE_CLASSES = [
        Pathogen::InlineCodeStyles::SURFACE_CLASSES,
        %w[
          inline-flex items-center gap-1 font-mono
          text-[length:var(--type-control)] leading-4
          px-1.5 py-0.5 whitespace-nowrap align-middle
        ]
      ].flatten.join(' ').freeze

      attr_reader :tag

      def initialize(tag: DEFAULT_TAG, **system_arguments)
        @tag = tag
        @system_arguments = system_arguments

        @system_arguments[:class] = class_names(
          system_arguments[:class],
          CODE_CLASSES
        )
      end
    end
  end
end
