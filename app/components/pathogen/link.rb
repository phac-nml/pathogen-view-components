# frozen_string_literal: true

module Pathogen
  # Pathogen::Link renders a link with consistent styling across the application. Can be used with or without a tooltip.
  class Link < Pathogen::Component
    EXTERNAL_LINK_ATTRIBUTES = {
      target: '_blank',
      rel: 'noopener noreferrer'
    }.freeze

    LINK_CLASSES = %w[
      font-semibold text-[var(--pvc-color-text)] underline decoration-1 underline-offset-[0.12em]
      transition-[color,text-decoration-thickness]
      interactive-hover:text-[var(--pvc-color-accent-strong)] interactive-hover:decoration-2
      rounded-[var(--pvc-radius-action)]
      focus-visible:outline focus-visible:outline-2
      focus-visible:outline-[var(--pvc-color-focus)] focus-visible:outline-offset-2
    ].join(' ').freeze

    # @param href [String] The link url (required)
    # @param system_arguments [Hash] additional HTML attributes to be included in the link root element
    def initialize(href: nil, **system_arguments)
      @link_system_arguments = system_arguments
      @link_system_arguments[:tag] = :a
      @link_system_arguments[:href] = href
      @link_system_arguments[:class] =
        class_names(LINK_CLASSES, system_arguments[:class])
    end

    # The tooltip that appears on mouse hover or keyboard focus over the link. (optional)
    #
    # @param placement [Symbol] Position of tooltip (:top, :bottom, :left, :right)
    # @param describe [Boolean] Whether the tooltip is a supplementary description linked via
    #   `aria-describedby`. When omitted, matching plain-text tooltip and name values stay
    #   visual-only; different values are associated as a description. Markup, encoded entities,
    #   and `aria-labelledby` require browser context, so they conservatively default to a
    #   description. Pass `describe:` explicitly to override. Reliable names are `aria-label` and
    #   plain visible text.
    # @param system_arguments [Hash] HTML attributes to be included in the tooltip root element
    renders_one :tooltip, lambda { |placement: :top, describe: nil, **system_arguments|
      # Only record the tooltip here; the association decision needs `content`, which is not
      # safe to read while slots are evaluated, so it is deferred to #associate_tooltip!.
      @tooltip_id = Pathogen::Tooltip.generate_id
      @tooltip_describe = describe
      @tooltip_text = system_arguments[:text]

      Pathogen::Tooltip.new(id: @tooltip_id, placement: placement, **system_arguments)
    }

    # Association mode passed to the tooltip Stimulus controller ("describedby" or "none").
    # Set in before_render by #associate_tooltip!; nil when the link has no tooltip.
    attr_reader :tooltip_associate

    def before_render
      associate_tooltip!

      raise ArgumentError, 'href is required' if @link_system_arguments[:href].blank?
      raise ArgumentError, "invalid href format: #{@link_system_arguments[:href]}" unless validate_href_format!

      setup_external_link_attributes if external_link?(@link_system_arguments[:href])
    end

    private

    # Decide how the tooltip relates to the link and wire the trigger onto @link_system_arguments
    # before the link renders. Runs in before_render, where `content` is available, so the
    # inference can compare against the link's visible text as well as its aria-label.
    def associate_tooltip!
      return unless tooltip?

      tooltip # ensure the slot lambda has run (populates @tooltip_id / @tooltip_text / @tooltip_describe)
      describe = @tooltip_describe.nil? ? describe_tooltip?(@tooltip_text) : @tooltip_describe
      @tooltip_associate = describe ? 'describedby' : 'none'

      (@link_system_arguments[:data] ||= {})['pathogen--tooltip-target'] = 'trigger'
      return unless describe

      @link_system_arguments[:aria] ||= {}
      existing = @link_system_arguments[:aria][:describedby]
      @link_system_arguments[:aria][:describedby] = [existing, @tooltip_id].compact.join(' ')
    end

    # Infer whether the tooltip should be a description (`aria-describedby`) or visual-only.
    # A tooltip that only repeats the link's accessible name adds nothing for AT, so it stays
    # visual-only; anything else is treated as supplementary.
    def describe_tooltip?(tooltip_text)
      reference = tooltip_reference_name
      tooltip_name = normalize_reliable_accessible_name(tooltip_text)
      return true if reference.blank? || tooltip_name.blank?

      tooltip_name != reference
    end

    def tooltip_reference_name
      reliable_accessible_name(@link_system_arguments, content)
    end

    def setup_external_link_attributes
      @link_system_arguments.merge!(EXTERNAL_LINK_ATTRIBUTES)
      @link_system_arguments[:'aria-label'] ||= t('.aria-label', content: content.strip)
    end

    def external_link?(href)
      host = URI.parse(href).host
      host.present? && host != request.host
    rescue URI::InvalidURIError
      false
    end

    def validate_href_format!
      URI.parse(@link_system_arguments[:href])
    rescue URI::InvalidURIError
      false
    end
  end
end
