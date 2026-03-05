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

class PathogenTestApplication < Rails::Application
  config.root = Pathname.new(File.expand_path('..', __dir__))
  config.eager_load = false
  config.secret_key_base = 'pathogen-view-components-test-secret'
  config.logger = Logger.new(nil)
  config.hosts << 'www.example.com'
end

# `Pathogen::ViewComponents::Engine` expects importmap config to be present.
# In this standalone gem test app we provide a minimal stub.
PathogenTestApplication.config.importmap = ActiveSupport::OrderedOptions.new
PathogenTestApplication.config.importmap.paths = []
PathogenTestApplication.config.importmap.cache_sweepers = []

require_relative '../lib/pathogen/view_components'

PathogenTestApplication.initialize!
