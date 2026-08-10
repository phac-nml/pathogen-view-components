# frozen_string_literal: true

require 'test_helper'
require 'yaml'

class ShippedFilesCiTest < ActiveSupport::TestCase
  test 'CI checks shipped files before running Ruby tests' do
    workflow = YAML.safe_load(PROJECT_ROOT.join('.github/workflows/ci.yml').read)
    commands = workflow.dig('jobs', 'test', 'steps').filter_map { |step| step['run'] }
    verify_index = commands.index('bin/verify')
    test_index = commands.index('bin/test')

    assert verify_index, 'CI test job must run bin/verify'
    assert test_index, 'CI test job must run bin/test'
    assert_operator verify_index, :<, test_index
  end
end
