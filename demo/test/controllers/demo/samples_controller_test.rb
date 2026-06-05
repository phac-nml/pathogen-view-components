# frozen_string_literal: true

require 'test_helper'

module Demo
  # Request tests for the paginated virtual DataGrid rows endpoint.
  class SamplesControllerTest < ActionDispatch::IntegrationTest
    test 'rows returns paginated JSON with global indexes and metadata' do
      get rows_demo_samples_path, params: { page: 2, limit: 20 }, as: :json

      assert_response :success

      payload = response.parsed_body
      assert_equal 2, payload.dig('pagy', 'page')
      assert_equal 20, payload.dig('pagy', 'limit')
      assert_equal Demo::SampleDataset::COUNT, payload.dig('pagy', 'count')
      assert_equal 250, payload.dig('pagy', 'pages')
      assert_equal 1, payload.dig('pagy', 'prev')
      assert_equal 3, payload.dig('pagy', 'next')

      rows = payload.fetch('rows')
      assert_equal 20, rows.size
      assert_equal 20, rows.first.fetch('index')
      assert_includes rows.first.fetch('html'), 'role="row"'
      assert_includes rows.first.fetch('html'), 'aria-rowindex="22"'
      assert_includes rows.first.fetch('html'), 'data-pvc-data-grid-global-row-index="20"'
    end

    test 'rows clamps oversized limit values' do
      get rows_demo_samples_path, params: { page: 1, limit: 500 }, as: :json

      assert_response :success
      assert_equal 100, response.parsed_body.dig('pagy', 'limit')
    end

    test 'rows returns the final page without error' do
      get rows_demo_samples_path, params: { page: 100, limit: 50 }, as: :json

      assert_response :success

      payload = response.parsed_body
      assert_equal 100, payload.dig('pagy', 'page')
      assert_equal 100, payload.dig('pagy', 'pages')
      assert_nil payload.dig('pagy', 'next')
      assert_equal 50, payload.fetch('rows').size
      assert_equal 4999, payload.fetch('rows').last.fetch('index')
    end

    test 'rows returns empty rows for out-of-range pages' do
      get rows_demo_samples_path, params: { page: 101, limit: 50 }, as: :json

      assert_response :success, -> { "body: #{response.body}" }

      payload = response.parsed_body
      assert_equal 101, payload.dig('pagy', 'page')
      assert_equal 100, payload.dig('pagy', 'pages')
      assert_equal [], payload.fetch('rows')
    end

    test 'rows supports optional name filter' do
      get rows_demo_samples_path, params: { page: 1, limit: 20, name_cont: 'North Basin' }, as: :json

      assert_response :success

      payload = response.parsed_body
      assert_operator payload.dig('pagy', 'count'), :<, Demo::SampleDataset::COUNT
      assert(payload.fetch('rows').all? { |row| row.fetch('html').include?('North Basin') })
    end
  end
end
