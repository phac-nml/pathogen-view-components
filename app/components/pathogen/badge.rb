# frozen_string_literal: true

require_relative '../../lib/pathogen/soft_tone_styles'

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
    include Pathogen::SoftToneStyles

    INTERACTIVE_ROLES = %w[
      button checkbox combobox grid gridcell link listbox menu menuitem menuitemcheckbox menuitemradio option radio
      scrollbar searchbox slider spinbutton switch tab textbox tree treegrid treeitem
    ].freeze

    # Badge meaning lives in +text+, so anything that renames the badge for
    # assistive technology is rejected rather than silently overriding it.
    ARIA_NAME_ARGUMENTS = %w[aria-label aria-labelledby].freeze

    BASE_CLASSES = %w[
      inline-flex shrink-0 items-center gap-1 border
      rounded-[var(--pvc-radius-control)]
      px-2 py-0.5
      font-sans font-medium leading-none tracking-[0.01em]
      text-[length:var(--type-meta)]
      whitespace-nowrap
    ].join(' ').freeze

    # Optional host-owned leading icon or visual. Decorative relative to +text+;
    # wrapped with +aria-hidden="true"+ and +inert+ so the label is announced
    # once and slotted content can never take focus inside a hidden subtree.
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
        soft_tone_classes(@tone),
        custom_classes
      )
    end

    private

    def validate_system_arguments!(system_arguments)
      if system_argument_key(system_arguments, 'class')
        raise ArgumentError, '`class` is an invalid argument. Use `classes` instead.'
      end

      reject_static_only_violations!(system_arguments)
      reject_interactive_wiring!(system_arguments)
      reject_accessible_name_overrides!(system_arguments)
    end

    def reject_static_only_violations!(system_arguments)
      if system_argument_key(system_arguments, 'href')
        raise ArgumentError, '`href` is an invalid argument because badges are not links.'
      end

      if system_argument_key(system_arguments, 'tabindex')
        raise ArgumentError, '`tabindex` is an invalid argument because badges are not focusable.'
      end

      role_key = system_argument_key(system_arguments, 'role')
      role = system_arguments[role_key]
      return unless INTERACTIVE_ROLES.include?(role.to_s.downcase)

      raise ArgumentError, "`#{role}` is an interactive role. Badges are not controls."
    end

    def reject_interactive_wiring!(system_arguments)
      event_handler = system_arguments.keys.find { |key| key.to_s.match?(/\Aon[a-z]+\z/i) }
      raise ArgumentError, "`#{event_handler}` is an event handler. Badges are not interactive." if event_handler

      return unless stimulus_action?(system_arguments)

      raise ArgumentError, '`data-action` is a Stimulus action. Badges are not interactive.'
    end

    def reject_accessible_name_overrides!(system_arguments)
      override = ARIA_NAME_ARGUMENTS.find do |name|
        system_argument_key(system_arguments, name) ||
          nested_argument?(system_arguments, 'aria', name.delete_prefix('aria-'))
      end
      return unless override

      raise ArgumentError, "`#{override}` overrides the visible label. Badge meaning belongs in `text`."
    end

    def stimulus_action?(system_arguments)
      return true if system_argument_key(system_arguments, 'data-action')

      nested_argument?(system_arguments, 'data', 'action')
    end

    def system_argument_key(system_arguments, name)
      system_arguments.keys.find { |key| key.to_s.casecmp?(name) }
    end

    # Rails expands nested hashes such as `data: { action: ... }` into
    # `data-action`, so both spellings need the same guard.
    def nested_argument?(system_arguments, container, name)
      nested_arguments = system_arguments[system_argument_key(system_arguments, container)]

      nested_arguments.respond_to?(:keys) && nested_arguments.keys.any? { |key| key.to_s.casecmp?(name) }
    end
  end
end
