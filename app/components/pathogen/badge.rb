# frozen_string_literal: true

module Pathogen
  # Pathogen::Badge — compact static label for status and metadata.
  #
  # Use for short, non-interactive indicators (workflow state, enabled/disabled,
  # required, version). Do not use for dismissible filters, selection chips,
  # notification counts, or nested controls — those need a different pattern.
  #
  # Meaning lives in +text+; +tone+ reinforces it. Never rely on colour alone,
  # and never render an icon-only badge.
  #
  # @example Status in a table cell
  #   <%= pathogen_badge(text: "Ready", tone: :success) %>
  #
  # @example Metadata with a host-owned leading icon
  #   <%= pathogen_badge(text: "Required", tone: :accent) do |badge| %>
  #     <% badge.with_leading_visual { helpers.icon(:asterisk, class: "size-3") } %>
  #   <% end %>
  class Badge < Pathogen::Component
    DEFAULT_TONE = :neutral
    TONE_OPTIONS = %i[neutral accent success warning danger].freeze

    # Soft-fill + hairline recipe. Accent/danger use *-strong text on tinted fills.
    # Success/warning are base-only tokens today (#96); soft fills use --pvc-color-text
    # for AA contrast at meta type size (same approach as Avatar warning).
    TONE_CLASSES = {
      neutral: %w[
        bg-[var(--pvc-color-surface-muted)]
        text-[var(--pvc-color-text)]
        border-[var(--pvc-color-border-strong)]
      ].join(' '),
      accent: %w[
        bg-[color-mix(in_oklab,var(--pvc-color-accent)_16%,var(--pvc-color-surface))]
        text-[var(--pvc-color-accent-strong)]
        border-[color-mix(in_oklab,var(--pvc-color-accent)_45%,var(--pvc-color-border))]
      ].join(' '),
      success: %w[
        bg-[color-mix(in_oklab,var(--pvc-color-success)_20%,var(--pvc-color-surface))]
        text-[var(--pvc-color-text)]
        border-[color-mix(in_oklab,var(--pvc-color-success)_45%,var(--pvc-color-border))]
      ].join(' '),
      warning: %w[
        bg-[color-mix(in_oklab,var(--pvc-color-warning)_18%,var(--pvc-color-surface))]
        text-[var(--pvc-color-text)]
        border-[color-mix(in_oklab,var(--pvc-color-warning)_45%,var(--pvc-color-border))]
      ].join(' '),
      danger: %w[
        bg-[color-mix(in_oklab,var(--pvc-color-danger)_14%,var(--pvc-color-surface))]
        text-[var(--pvc-color-danger-strong)]
        border-[color-mix(in_oklab,var(--pvc-color-danger)_45%,var(--pvc-color-border))]
      ].join(' ')
    }.freeze

    BASE_CLASSES = %w[
      inline-flex shrink-0 items-center gap-1 border
      rounded-[var(--pvc-radius-control)]
      px-2 py-0.5
      font-sans font-medium leading-none tracking-[0.01em]
      text-[length:var(--type-meta)]
      whitespace-nowrap
    ].join(' ').freeze

    # Optional host-owned leading icon or visual. Decorative relative to +text+;
    # wrapped with +aria-hidden="true"+ so the label is announced once.
    renders_one :leading_visual

    attr_reader :text, :tone

    # @param text [String] Required visible label. Blank values raise.
    # @param tone [Symbol] Semantic tone (:neutral, :accent, :success, :warning, :danger).
    #   Defaults to :neutral.
    # @param system_arguments [Hash] Additional HTML attributes for the root +span+.
    #   Use +classes:+ for custom classes (not +class:+). Do not set a default
    #   live-region role; add +role: "status"+ only when this node itself updates live.
    def initialize(text:, tone: DEFAULT_TONE, **system_arguments)
      @text = text.to_s.strip
      raise ArgumentError, 'text is required' if @text.blank?

      @tone = fetch_or_fallback(TONE_OPTIONS, tone, DEFAULT_TONE)

      validate_system_arguments!(system_arguments)

      custom_classes = system_arguments.delete(:classes)

      @system_arguments = add_test_selector(system_arguments)
      @system_arguments[:tag] = :span
      @system_arguments[:classes] = class_names(
        BASE_CLASSES,
        TONE_CLASSES.fetch(@tone),
        custom_classes
      )
    end

    private

    def validate_system_arguments!(system_arguments)
      raise ArgumentError, '`class` is an invalid argument. Use `classes` instead.' if system_arguments.key?(:class)
    end
  end
end
