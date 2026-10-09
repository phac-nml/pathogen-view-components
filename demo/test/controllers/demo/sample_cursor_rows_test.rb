# frozen_string_literal: true

require 'test_helper'

module Demo
  # The cursor example proves sequential continuation without pretending the array is a database.
  class SampleCursorRowsTest < ActionDispatch::IntegrationTest
    test 'cursor rows continue after a stable sample ID with absolute row positions' do
      seed = SampleCursorPage.new(limit: 20)
      get cursor_rows_demo_samples_path, params: { cursor: seed.next_cursor, limit: 20 }

      assert_response :success
      payload = response.parsed_body
      assert_equal 20, payload.fetch('rows').size
      assert_equal 'SAM-0021', payload.fetch('rows').first.fetch('id')
      assert_equal 20, payload.fetch('rows').first.fetch('index')
      assert_includes payload.fetch('rows').first.fetch('html'), 'aria-rowindex="22"'
      assert_includes payload.fetch('rows').first.fetch('html'), '<em>Staphylococcus aureus</em>'
      assert payload.fetch('next_cursor').present?
      assert_not payload.key?('pagy')
    end

    test 'the final filtered batch ends with a null continuation' do
      get cursor_rows_demo_samples_path, params: { limit: 100, name_cont: 'North Basin' }

      assert_response :success
      payload = response.parsed_body
      assert_nil payload.fetch('next_cursor')
      assert_operator payload.fetch('rows').size, :>, 0
      assert(payload.fetch('rows').all? { |row| row.fetch('html').include?('North Basin') })
    end

    test 'an empty cursor result has an empty array and no next cursor' do
      get cursor_rows_demo_samples_path, params: { name_cont: 'No matching sample' }

      assert_response :success
      assert_equal [], response.parsed_body.fetch('rows')
      assert_nil response.parsed_body.fetch('next_cursor')
    end

    test 'cursor is bound to the query and effective page size' do
      seed = SampleCursorPage.new(limit: 20)
      [{ name_cont: 'North', limit: 20 }, { limit: 50 }].each do |options|
        get cursor_rows_demo_samples_path, params: options.merge(cursor: seed.next_cursor)

        assert_response :conflict
        assert_equal 'cursor_mismatch', response.parsed_body.fetch('error')
      end
    end

    test 'invalid cursor returns a recoverable conflict' do
      get cursor_rows_demo_samples_path, params: { cursor: 'not-a-valid-cursor' }

      assert_response :conflict
      assert_equal 'cursor_mismatch', response.parsed_body.fetch('error')
    end
  end
end
