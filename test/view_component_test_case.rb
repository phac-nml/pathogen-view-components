# frozen_string_literal: true

require 'test_helper'

class ViewComponentTestCase < ViewComponent::TestCase
  def before_setup
    @request = vc_test_request
    @response = ActionDispatch::TestResponse.new
    @controller = vc_test_controller
    super
  end
end
