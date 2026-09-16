# frozen_string_literal: true

ENV['RAILS_ENV'] ||= 'test'

require 'bundler/setup'
require 'active_support/all'
require 'rails'
require 'action_controller/railtie'
require 'action_view/railtie'
require 'rails/test_help'
require 'turbo-rails'
require 'view_component/test_helpers'
require 'view_component/test_case'
require_relative 'support/axe_assertions'
require_relative 'support/typography_assertions'

PROJECT_ROOT = Pathname(File.expand_path('..', __dir__))

class PathogenTestApplication < Rails::Application
  config.root = PROJECT_ROOT
  config.eager_load = false
  config.secret_key_base = 'pathogen-view-components-test-secret'
  config.logger = Logger.new(nil)
  config.hosts << 'www.example.com'
end

require_relative '../lib/pathogen/view_components'

PathogenTestApplication.initialize!

module ActiveSupport
  class TestCase
    include AxeAssertions
    include TypographyAssertions
  end
end
