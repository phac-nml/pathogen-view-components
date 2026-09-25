# frozen_string_literal: true

require_relative 'constants'

module Pathogen
  module Typography
    # Pathogen::Typography::Code — Code component for Pathogen Typography
    class Code < Component
      DEFAULT_TAG = :code

      CODE_CLASSES = %w[
        inline-flex items-center gap-1 font-mono text-(length:--type-control)
        text-(--pvc-color-text) bg-(--pvc-color-surface-muted)
        border border-(--pvc-color-border) rounded-(--pvc-radius-control) px-1.5 py-0.5
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
