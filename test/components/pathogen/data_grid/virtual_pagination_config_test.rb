# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module DataGrid
    class VirtualPaginationConfigTest < ActiveSupport::TestCase
      test 'returns nil when pagination config is omitted' do
        assert_nil VirtualPaginationConfig.build(nil, default_page_size: 20)
      end

      test 'normalizes offset pagination with defaults' do
        config = VirtualPaginationConfig.build({ rows_url: '/rows', total_count: '10' }, default_page_size: 25)

        assert_equal :offset, config.mode
        assert_equal 10, config.total_count
        assert_equal '/rows', config.rows_url
        assert_equal 25, config.page_size
        assert_equal 0, config.row_offset
        assert_nil config.search_params
        assert_nil config.next_cursor
        assert_nil config.refresh_url
      end

      test 'normalizes cursor pagination with optional total and refresh url' do
        config = VirtualPaginationConfig.build(
          {
            'mode' => 'cursor',
            'rows_url' => '/cursor',
            'page_size' => 40,
            'row_offset' => 0,
            'next_cursor' => 'opaque',
            'search_params' => { q: { status: 'active' } },
            'refresh_url' => '/samples?sort=name'
          },
          default_page_size: 20
        )

        assert_equal :cursor, config.mode
        assert_nil config.total_count
        assert_equal 40, config.page_size
        assert_equal 'q%5Bstatus%5D=active', config.search_params
        assert_equal 'opaque', config.next_cursor
        assert_equal '/samples?sort=name', config.refresh_url
      end

      test 'blank refresh url is normalized to nil' do
        config = VirtualPaginationConfig.build(
          {
            mode: :cursor,
            rows_url: '/cursor',
            next_cursor: nil,
            refresh_url: ''
          },
          default_page_size: 20
        )

        assert_nil config.refresh_url
      end

      test 'requires a hash-like object' do
        error = assert_raises(ArgumentError) do
          VirtualPaginationConfig.build('oops', default_page_size: 20)
        end

        assert_equal 'virtual_pagination must be a hash-like object', error.message
      end

      test 'validates mode rows url and numeric contracts' do
        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build({ mode: :unknown, rows_url: '/rows', total_count: 1 }, default_page_size: 20)
        end

        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build({ total_count: 1 }, default_page_size: 20)
        end

        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build({ rows_url: '/rows', total_count: -1 }, default_page_size: 20)
        end

        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build({ rows_url: '/rows', total_count: 1, page_size: 0 }, default_page_size: 20)
        end

        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build({ rows_url: '/rows', total_count: 1, row_offset: -1 }, default_page_size: 20)
        end
      end

      test 'validates cursor-only invariants' do
        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build(
            { mode: :cursor, rows_url: '/rows', next_cursor: 'opaque', row_offset: 5 },
            default_page_size: 20
          )
        end

        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build(
            { mode: :cursor, rows_url: '/rows', next_cursor: '' },
            default_page_size: 20
          )
        end

        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build(
            { mode: :cursor, rows_url: '/rows', next_cursor: 123 },
            default_page_size: 20
          )
        end
      end

      test 'rejects malformed search params but allows blank values' do
        assert_raises(ArgumentError) do
          VirtualPaginationConfig.build(
            { rows_url: '/rows', total_count: 1, search_params: Object.new },
            default_page_size: 20
          )
        end

        config = VirtualPaginationConfig.build(
          { rows_url: '/rows', total_count: 1, search_params: {} },
          default_page_size: 20
        )

        assert_nil config.search_params
      end
    end
  end
end
