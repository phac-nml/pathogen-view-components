# frozen_string_literal: true

module Pathogen
  module Form
    # Styling module for switch (checkbox role=switch) components.
    module SwitchStyles
      include FormStyles

      SWITCH_NAME_LABEL_CLASSES = %w[
        block cursor-pointer font-sans text-sm font-semibold text-neutral-800 dark:text-white
      ].join(' ').freeze

      SWITCH_CONTROL_CONTAINER_CLASSES = 'inline-flex shrink-0 items-center gap-2'

      SWITCH_TRACK_LABEL_CLASSES = %w[
        group inline-flex cursor-pointer select-none items-center gap-2 leading-none
        peer-aria-disabled:cursor-not-allowed
        peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2
        peer-focus-visible:outline-neutral-900 dark:peer-focus-visible:outline-neutral-100
        peer-checked:[&_.pathogen-switch-track]:bg-primary-600
        dark:peer-checked:[&_.pathogen-switch-track]:bg-primary-500
        peer-checked:[&_.pathogen-switch-track]:after:translate-x-5
        peer-checked:[&_.pathogen-switch-track]:after:-translate-y-1/2
        peer-aria-disabled:[&_.pathogen-switch-track]:opacity-60
        peer-checked:[&_[data-switch-state=off]]:hidden
        peer-checked:[&_[data-switch-state=on]]:inline
      ].join(' ').freeze

      SWITCH_TRACK_CLASSES = %w[
        pathogen-switch-track relative inline-block h-6 w-11 shrink-0 rounded-full border-2
        border-neutral-500 bg-neutral-200 align-middle
        after:absolute after:top-1/2 after:left-[2px] after:h-4 after:w-4 after:-translate-y-1/2
        after:rounded-full after:bg-white after:content-['']
        motion-safe:after:transition-[transform]
        dark:border-neutral-300 dark:bg-neutral-700
      ].join(' ').freeze

      SWITCH_STATE_TEXT_CLASSES = %w[
        text-sm text-neutral-500 dark:text-neutral-400
      ].join(' ').freeze

      # @param user_class [String, nil] additional user-provided classes
      # @return [String] space-separated Tailwind classes for the hidden checkbox input
      def switch_input_classes(user_class = nil)
        class_names('peer', 'sr-only', user_class)
      end

      # @return [String] CSS classes for the optional visible name label
      def switch_name_label_classes
        SWITCH_NAME_LABEL_CLASSES
      end

      # @return [String] CSS classes for the switch control wrapper
      def switch_control_container_classes
        SWITCH_CONTROL_CONTAINER_CLASSES
      end

      # @return [String] CSS classes for the track label element
      def switch_track_label_classes
        SWITCH_TRACK_LABEL_CLASSES
      end

      # @return [String] CSS classes for the visual track span
      def switch_track_classes
        SWITCH_TRACK_CLASSES
      end

      # @return [String] CSS classes for visible On/Off state text
      def switch_state_text_classes
        SWITCH_STATE_TEXT_CLASSES
      end

      # @return [String] CSS classes for the outer container when label or help text is present
      def switch_container_classes
        'flex flex-col gap-2'
      end

      # @return [String] CSS classes for the labeled row (name/help left, switch right)
      def switch_labeled_row_classes
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4'
      end

      # @return [String] CSS classes for the label and help text column
      def switch_labeled_content_classes
        'min-w-0 flex-1'
      end

      # @return [String] CSS classes for help text below the switch control
      def switch_help_container_classes
        'mt-1'
      end
    end
  end
end
