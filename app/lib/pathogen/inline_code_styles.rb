# frozen_string_literal: true

module Pathogen
  # Shared surface recipe for inline monospace values (Code, CopyableValue).
  module InlineCodeStyles
    SURFACE_CLASSES = %w[
      border border-[var(--pvc-color-border)]
      bg-[var(--pvc-color-surface-muted)]
      text-[var(--pvc-color-text)]
      rounded-[var(--pvc-radius-action)]
    ].join(' ').freeze
  end
end
