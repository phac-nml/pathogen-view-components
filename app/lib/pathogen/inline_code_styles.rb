# frozen_string_literal: true

module Pathogen
  # Shared surface recipe for inline monospace values (Code, CopyableValue).
  module InlineCodeStyles
    SURFACE_CLASSES = %w[
      border border-(--pvc-color-border)
      bg-(--pvc-color-surface-muted)
      text-(--pvc-color-text)
    ].join(' ').freeze
  end
end
