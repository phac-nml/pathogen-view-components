# frozen_string_literal: true

require_relative 'constants'

module Pathogen
  module Typography
    # Pathogen::Typography::Code — Code component for Pathogen Typography
    class Code < Component
      DEFAULT_TAG = :code

      CODE_CLASSES = %w[
        inline-flex items-center gap-1 font-mono text-[length:var(--type-control)]
        text-[var(--pvc-color-text)] bg-[var(--pvc-color-surface-muted)]
        border border-[var(--pvc-color-border)] rounded-[var(--pvc-radius-control)] px-1.5 py-0.5
        whitespace-nowrap align-middle
      ].join(' ').freeze

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
