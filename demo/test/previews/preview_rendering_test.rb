# frozen_string_literal: true

require 'test_helper'

# Renders every Lookbook preview scenario so a broken preview-only template
# (for example a bad helper call) fails here instead of 500ing in Lookbook while
# the component unit tests stay green. Covers the gap left by `render_inline`,
# which never exercises the preview `.html.erb` templates.
class PreviewRenderingTest < ActionDispatch::IntegrationTest
  # Previews are only registered as descendants once loaded; eager load so the
  # scenario list is complete whether or not the environment eager loads.
  Rails.application.eager_load! unless Rails.application.config.eager_load

  previews = ViewComponent::Preview.all
  previews.each do |preview|
    preview.examples.each do |example|
      test "#{preview.preview_name}/#{example} renders without error" do
        get "/rails/view_components/#{preview.preview_name}/#{example}"

        assert_response :success,
                        "Preview #{preview.preview_name}##{example} did not render (HTTP #{response.status})"
      end
    end
  end
end
