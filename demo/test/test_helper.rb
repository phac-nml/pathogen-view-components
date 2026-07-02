# frozen_string_literal: true

ENV['RAILS_ENV'] ||= 'test'

require_relative '../config/environment'
require 'rails/test_help'

module ActiveSupport
  # Base test case for the demo application.
  class TestCase
    parallelize(workers: :number_of_processors)
  end
end
