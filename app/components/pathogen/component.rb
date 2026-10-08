# frozen_string_literal: true

require_relative '../../../lib/pathogen/test_selector_helper'
require_relative '../../lib/pathogen/fetch_or_fallback_helper'

module Pathogen
  # @private
  class Component < ViewComponent::Base
    include Pathogen::FetchOrFallbackHelper
    include Pathogen::TestSelectorHelper

    def self.generate_id(base_name: name.demodulize.underscore.dasherize)
      "#{base_name}-#{SecureRandom.uuid}"
    end
  end
end
