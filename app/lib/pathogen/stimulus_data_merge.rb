# frozen_string_literal: true

module Pathogen
  # Merges space-delimited Stimulus data attributes (controller, action, target).
  module StimulusDataMerge
    def merge_stimulus_data!(data, key, *values)
      string_key = key.to_s
      symbol_key = key.to_sym
      existing_values = [data.delete(string_key), data.delete(symbol_key)]
      data[string_key] = [*existing_values, *values].compact.join(' ').split.uniq.join(' ')
    end
  end
end
