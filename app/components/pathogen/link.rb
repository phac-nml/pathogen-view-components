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
    #   `aria-describedby`. When omitted, it is inferred: a tooltip that merely repeats the
    #   link's `aria-label` stays visual-only (no `aria-describedby`, so screen readers announce
    #   the name once); anything else is associated as a description. Links named by their
    #   visible text (no `aria-label`) always associate. Pass `describe:` to override.
    # @param system_arguments [Hash] HTML attributes to be included in the tooltip root element
    renders_one :tooltip, lambda { |placement: :top, describe: nil, **system_arguments|
      describe = describe_tooltip?(system_arguments[:text]) if describe.nil?
      @tooltip_id = Pathogen::Tooltip.generate_id
      @tooltip_associate = describe ? 'describedby' : 'none'
      if describe
        @link_system_arguments[:aria] ||= {}
        @link_system_arguments[:aria][:describedby] = [
          @link_system_arguments[:aria][:describedby],
          @tooltip_id
        ].compact.join(' ')
      end
      @link_system_arguments[:data] ||= {}
      @link_system_arguments[:data]['pathogen--tooltip-target'] = 'trigger'

      Pathogen::Tooltip.new(id: @tooltip_id, placement: placement, **system_arguments)
    }

    # Association mode passed to the tooltip Stimulus controller ("describedby" or "none").
    # Set while priming the tooltip slot; nil when the link has no tooltip.
    attr_reader :tooltip_associate

    def before_render
      tooltip if tooltip?

      raise ArgumentError, 'href is required' if @link_system_arguments[:href].blank?
      raise ArgumentError, "invalid href format: #{@link_system_arguments[:href]}" unless validate_href_format!

      setup_external_link_attributes if external_link?(@link_system_arguments[:href])
    end

    private

    # Infer whether the tooltip should be a description (`aria-describedby`) or visual-only.
    # A tooltip that only repeats the link's `aria-label` adds nothing for AT, so it stays
    # visual-only; anything else is treated as supplementary. Only `aria-label` is inspected —
    # never `content` — to stay safe while the tooltip slot is evaluated, so links named by
    # visible text always associate.
    def describe_tooltip?(tooltip_text)
      aria = @link_system_arguments[:aria]
      reference = @link_system_arguments[:'aria-label'] ||
                  (aria.is_a?(Hash) && (aria[:label] || aria['label']))
      return true unless reference.is_a?(String) && reference.present?

      tooltip_text.to_s.strip != reference.strip
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
