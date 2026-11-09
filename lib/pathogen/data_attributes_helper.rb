# frozen_string_literal: true

module Pathogen
  # Normalizes Rails data hashes and flat data attributes before component wiring is added.
  module DataAttributesHelper
    private

    def extract_data_attributes(arguments)
      data = (arguments.delete(:data) || {}).transform_keys { |key| key.to_s.dasherize }

      arguments.each_key do |key|
        next unless key.to_s.start_with?('data-')

        name = key.to_s.delete_prefix('data-')
        value = arguments.delete(key)
        data[name] = if %w[controller action].include?(name) || name.end_with?('-target')
                       class_names(data[name], value)
                     else
                       value
                     end
      end

      data
    end
  end
end
