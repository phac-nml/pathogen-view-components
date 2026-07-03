# frozen_string_literal: true

module Pathogen
  # Semantic class recipes for Pathogen::Tabs controls and panels.
  module TabsStyles
    TAB_BASE = %w[
      appearance-none cursor-pointer bg-transparent font-sans
      text-[length:var(--type-control)] font-medium
      transition-[color,background-color,border-color]
      duration-[var(--pvc-duration-fast)] ease-out
      focus-visible:outline focus-visible:outline-2
      focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-2
      focus-visible:z-10
    ].freeze

    TAB_INACTIVE = %w[
      text-[var(--pvc-color-text-muted)] border-transparent bg-transparent
      interactive-hover:bg-[var(--pvc-color-surface-muted)]
      interactive-hover:text-[var(--pvc-color-text)]
    ].freeze

    TAB_ACTIVE_STATE_BASE = %w[
      aria-selected:font-semibold
      data-[state=active]:font-semibold
      aria-selected:text-[var(--pvc-color-text)]
      data-[state=active]:text-[var(--pvc-color-text)]
    ].freeze

    TAB_ACTIVE_STATE_HORIZONTAL = %w[
      aria-selected:border-[var(--pvc-color-accent)]
      data-[state=active]:border-[var(--pvc-color-accent)]
    ].freeze

    TAB_ACTIVE_STATE_VERTICAL = %w[
      aria-selected:bg-[var(--pvc-color-surface-muted)]
      aria-selected:border-[var(--pvc-color-accent)]
      data-[state=active]:bg-[var(--pvc-color-surface-muted)]
      data-[state=active]:border-[var(--pvc-color-accent)]
    ].freeze

    TAB_HORIZONTAL = %w[
      -mb-px rounded-t-[var(--pvc-radius-action)] px-3 py-2 min-h-9 border-b-2 border-transparent
    ].freeze

    TAB_VERTICAL = %w[
      mb-0 w-full truncate rounded-[var(--pvc-radius-action)] px-3 py-2 min-h-9 text-left
      border-l-2 border-transparent
    ].freeze

    TABLIST_HORIZONTAL = %w[
      flex flex-wrap items-stretch gap-1 border-b border-[var(--pvc-color-border)]
    ].freeze

    TABLIST_VERTICAL = %w[
      flex min-w-[11rem] flex-col items-stretch gap-1 border-r border-[var(--pvc-color-border)] pr-3
    ].freeze

    CONTAINER_HORIZONTAL = %w[block font-sans text-[var(--pvc-color-text)]].freeze

    CONTAINER_VERTICAL = %w[
      flex items-start gap-6 font-sans text-[var(--pvc-color-text)]
    ].freeze

    PANEL_BASE = %w[
      text-[length:var(--type-body)] text-[var(--pvc-color-text)] leading-[1.45]
      focus-visible:rounded-[var(--pvc-radius-action)]
      focus-visible:outline focus-visible:outline-2
      focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-2
      [&:is([hidden])]:hidden
    ].freeze

    LAZY_PANEL_SKELETON = %w[
      motion-reduce:animate-none animate-pulse
      rounded-[var(--pvc-radius-panel)] border border-[var(--pvc-color-border)]
      bg-[var(--pvc-color-surface-muted)] p-4
    ].freeze

    LAZY_PANEL_SKELETON_BAR = %w[
      rounded-[var(--pvc-radius-control)] bg-[color-mix(in_oklab,var(--pvc-color-text-muted)_35%,transparent)]
    ].freeze

    module_function

    def tab_classes(orientation:)
      [
        TAB_BASE,
        TAB_INACTIVE,
        TAB_ACTIVE_STATE_BASE,
        orientation == :vertical ? TAB_VERTICAL : TAB_HORIZONTAL,
        orientation == :vertical ? TAB_ACTIVE_STATE_VERTICAL : TAB_ACTIVE_STATE_HORIZONTAL
      ].flatten.join(' ')
    end
  end
end
