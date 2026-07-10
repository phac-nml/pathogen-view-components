# frozen_string_literal: true

module Pathogen
  # Pathogen::Avatar renders a user or entity avatar with image and deterministic fallback styling.
  class Avatar < Pathogen::Component # rubocop:disable Metrics/ClassLength
    DEFAULT_SIZE = :medium
    SIZE_OPTIONS = %i[xs small medium large].freeze

    DEFAULT_SHAPE = :circle
    SHAPE_OPTIONS = %i[circle rounded square].freeze

    TONE_OPTIONS = %i[neutral accent success warning danger].freeze

    SIZE_MAPPINGS = {
      xs: 'h-6 w-6 text-[0.625rem]',
      small: 'h-8 w-8 text-xs',
      medium: 'h-12 w-12 text-sm',
      large: 'h-16 w-16 text-base'
    }.freeze

    SIZE_PIXELS = {
      xs: 24,
      small: 32,
      medium: 48,
      large: 64
    }.freeze

    SHAPE_MAPPINGS = {
      circle: 'rounded-full',
      rounded: 'rounded-md',
      square: 'rounded-sm'
    }.freeze

    BASE_CLASSES = %w[
      relative inline-flex shrink-0 items-center justify-center overflow-hidden border
      border-[var(--pvc-color-border-strong)] font-sans font-semibold tracking-[0.01em]
      select-none text-[var(--pvc-color-text)]
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pvc-color-focus)]
      focus-visible:outline-offset-2
    ].join(' ').freeze

    FALLBACK_TONE_CLASSES = {
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
        text-[var(--pvc-color-success)]
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

    IMAGE_CLASSES = %w[size-full object-cover object-center].join(' ').freeze

    # rubocop:disable Metrics/ParameterLists, Metrics/MethodLength, Metrics/AbcSize
    def initialize(label: nil, initials: nil, colour_seed: nil, color_seed: nil, src: nil, alt: nil, url: nil,
                   size: DEFAULT_SIZE, shape: DEFAULT_SHAPE, decorative: false, **system_arguments)
      @label = label&.to_s&.strip
      @src = src
      @url = url
      @decorative = decorative
      @size = fetch_or_fallback(SIZE_OPTIONS, size, DEFAULT_SIZE)
      @shape = fetch_or_fallback(SHAPE_OPTIONS, shape, DEFAULT_SHAPE)

      validate_arguments!

      @fallback_text = normalize_initials(initials)

      fallback_seed = colour_seed.presence || color_seed.presence || @label.presence || 'avatar'
      tone = tone_for(fallback_seed)

      validate_system_arguments!(system_arguments)

      custom_classes = system_arguments.delete(:classes)

      @root_arguments = add_test_selector(system_arguments)
      @root_arguments[:href] = @url if @url.present?
      @root_arguments[:class] = class_names(
        BASE_CLASSES,
        SIZE_MAPPINGS.fetch(@size),
        SHAPE_MAPPINGS.fetch(@shape),
        FALLBACK_TONE_CLASSES.fetch(tone),
        custom_classes
      )

      apply_accessibility_arguments!

      @image_alt = image_alt_for(alt)
      @image_arguments = build_image_arguments
    end
    # rubocop:enable Metrics/ParameterLists, Metrics/MethodLength, Metrics/AbcSize

    private

    def validate_arguments!
      raise ArgumentError, 'label is required unless decorative is true' if !@decorative && @label.blank?
      raise ArgumentError, 'decorative avatars cannot be interactive links' if @decorative && @url.present?

      validate_url! if @url.present?
    end

    def validate_system_arguments!(system_arguments)
      raise ArgumentError, '`class` is an invalid argument. Use `classes` instead.' if system_arguments.key?(:class)
      raise ArgumentError, '`href` is an invalid argument. Use `url` instead.' if system_arguments.key?(:href)
    end

    def interactive?
      @url.present?
    end

    def normalize_initials(initials)
      explicit_initials = initials&.to_s&.strip
      return explicit_initials.upcase[0, 3] if explicit_initials.present?

      return if @label.blank?

      words = @label.split(/\s+/).compact_blank
      return words.first[0, 2].to_s.upcase if words.length == 1

      "#{words.first[0]}#{words.last[0]}".upcase
    end

    def tone_for(seed)
      index = seed.to_s.sum % TONE_OPTIONS.length
      TONE_OPTIONS[index]
    end

    def validate_url!
      parsed_url = URI.parse(@url)
      return if parsed_url.scheme.blank?
      return if %w[http https].include?(parsed_url.scheme.downcase)

      raise ArgumentError, "invalid url format: #{@url}"
    rescue URI::InvalidURIError
      raise ArgumentError, "invalid url format: #{@url}"
    end

    def apply_accessibility_arguments!
      if @decorative
        @root_arguments[:aria] = merge_aria_arguments(hidden: true)
      else
        @root_arguments[:aria] = merge_aria_arguments(label: @label)
        @root_arguments[:role] = :img unless interactive?
      end
    end

    def merge_aria_arguments(additions)
      existing_aria = @root_arguments[:aria]
      merged_aria = existing_aria.is_a?(Hash) ? existing_aria.dup : {}

      additions.each { |key, value| merged_aria[key] = value }
      merged_aria
    end

    def image_alt_for(alt)
      return '' if @decorative

      alt.to_s
    end

    def build_image_arguments
      return if @src.blank?

      {
        src: @src,
        class: IMAGE_CLASSES,
        width: SIZE_PIXELS.fetch(@size),
        height: SIZE_PIXELS.fetch(@size),
        loading: :lazy,
        decoding: :async
      }
    end
  end
end
