# frozen_string_literal: true

require 'open3'
require 'test_helper'

class VerifyCommandTest < ActiveSupport::TestCase
  test 'checks files shipped to applications' do
    stdout, stderr, status = Open3.capture3(
      PROJECT_ROOT.join('bin/verify').to_s,
      chdir: PROJECT_ROOT.to_s
    )

    assert status.success?, "bin/verify failed:\n#{stdout}#{stderr}"
    assert_includes stdout, 'Shipped files verified.'
  end
end
