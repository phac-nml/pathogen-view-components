# frozen_string_literal: true

require_relative '../../../lib/pathogen/test_selector_helper'
require_relative '../../lib/pathogen/fetch_or_fallback_helper'

module Pathogen
  # @private
  # :nocov:
  class Component < ViewComponent::Base
    include Pathogen::FetchOrFallbackHelper
    include Pathogen::TestSelectorHelper

    INVALID_ARIA_LABEL_TAGS = %i[div span p].freeze

    def check_denylist(denylist = [], **arguments)
      return arguments unless should_raise_error?

      unpacked_denylist = unpack_denylist(denylist)
      violations = find_violations(unpacked_denylist, arguments)

      raise_violation_error(violations, unpacked_denylist) if violations.any?

      arguments
    end

    def validate_arguments(tag:, denylist_name: :system_arguments_denylist, **arguments)
      deny_single_argument(:class, 'Use `classes` instead.', **arguments)

      if (denylist = arguments[denylist_name])
        check_denylist(denylist, **arguments)

        # Remove :system_arguments_denylist key and any denied keys from system arguments
        arguments.except!(denylist_name)
        arguments.except!(*denylist.keys.flatten)
      end

      deny_aria_label(tag: tag, arguments: arguments)

      arguments
    end

    def deny_single_argument(key, help_text, **arguments)
      raise ArgumentError, "`#{key}` is an invalid argument. #{help_text}" \
        if should_raise_error? && arguments.key?(key)

      arguments.except!(key)
    end

    def deny_aria_label(tag:, arguments:)
      return arguments.except!(:skip_aria_label_check) if arguments[:skip_aria_label_check]
      return if arguments[:role]
      return unless INVALID_ARIA_LABEL_TAGS.include?(tag)

      deny_aria_key(
        :label,
        "Don't use `aria-label` on `#{tag}` elements. See https://www.tpgi.com/short-note-on-aria-label-aria-labelledby-and-aria-describedby/",
        **arguments
      )
    end

    def deny_aria_key(key, help_text, **arguments)
      raise ArgumentError, help_text if should_raise_aria_error? && aria(key, arguments)
    end

    def self.generate_id(base_name: name.demodulize.underscore.dasherize)
      "#{base_name}-#{SecureRandom.uuid}"
    end

    # Normalize only content whose accessible name can be inferred reliably without a browser.
    # Markup and encoded entities can change the computed name through attributes, hidden content,
    # image alternatives, or CSS, so callers must treat those values as unknown.
    def normalize_reliable_accessible_name(value)
      source = value.to_s
      return if source.match?(/<[^>]+>|&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/i)

      source.squish
    end

    def reliable_accessible_name(arguments, visible_text)
      return if aria_attribute(arguments, :labelledby).present?

      label = aria_attribute(arguments, :label)
      label = nil unless label.is_a?(String)
      normalize_reliable_accessible_name(label.presence || visible_text)
    end

    private

    def aria_attribute(arguments, key)
      direct_key = key == :label ? :'aria-label' : :'aria-labelledby'
      direct = arguments[direct_key] || arguments[direct_key.to_s]
      return direct if direct.present?

      aria = arguments[:aria]
      return unless aria.is_a?(Hash)

      aria[key] || aria[key.to_s]
    end

    def unpack_denylist(denylist)
      denylist.each_with_object({}) do |(keys, value), memo|
        keys.each { |key| memo[key] = value }
      end
    end

    def find_violations(unpacked_denylist, arguments)
      unpacked_denylist.keys & arguments.keys
    end

    def raise_violation_error(violations, unpacked_denylist)
      message = build_violation_message(violations, unpacked_denylist)
      raise(ArgumentError, message)
    end

    def build_violation_message(violations, unpacked_denylist)
      message = "Found #{violations.count} #{'violation'.pluralize(violations)}:"
      violations.each do |violation|
        message += "\n The #{violation} argument is not allowed here. #{unpacked_denylist[violation]}"
      end
      message
    end
  end
end
