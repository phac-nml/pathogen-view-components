# frozen_string_literal: true

require_relative 'constants'

module Pathogen
  module Typography
    # Pathogen::Typography::CodeBlock — Code block component for Pathogen Typography
    class CodeBlock < Component
      attr_reader :language

      WRAPPER_CLASSES = %w[
        overflow-hidden rounded-[var(--pvc-radius-panel)]
        bg-neutral-950 text-white
        shadow-[inset_0_1px_3px_oklch(0_0_0/0.3),0_0_0_1px_var(--pvc-color-border-strong)]
      ].join(' ').freeze

      PRE_CLASSES = %w[
        overflow-x-auto whitespace-pre-wrap bg-transparent p-4 font-mono
        text-[length:var(--type-control)] leading-relaxed text-inherit
      ].join(' ').freeze

      CODE_CLASSES = 'block min-w-full bg-transparent font-mono text-inherit -tracking-tight'

      def initialize(language: nil, **system_arguments)
        @language = language
        @system_arguments = system_arguments

        @wrapper_classes = build_wrapper_classes(system_arguments[:class])
        @pre_classes = PRE_CLASSES
        @code_classes = build_code_classes(language)
      end

      private

      def build_wrapper_classes(custom_class)
        class_names(
          custom_class,
          WRAPPER_CLASSES
        )
      end

      def build_code_classes(language)
        class_names(
          CODE_CLASSES,
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
