# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module DataGrid
    class VirtualMetadataTest < ActiveSupport::TestCase
      test 'returns base metadata and rowcount for non-paginated virtual grids' do
        metadata = VirtualMetadata.new(
          layout: layout,
          pagination: nil,
          rows_count: 2
        )

        assert_equal(
          {
            'data-pvc-data-grid-row-height' => 40,
            'data-pvc-data-grid-row-overscan' => 10,
            'data-pvc-data-grid-column-overscan' => 2,
            'data-pvc-data-grid-pinned-count' => 1,
            'data-pvc-data-grid-column-widths' => '120,200'
          },
          metadata.attributes
        )
        assert_equal 3, metadata.rowcount
      end

      test 'offset pagination appends contract attributes and known rowcount' do
        metadata = VirtualMetadata.new(
          layout: layout,
          pagination: pagination(mode: :offset, total_count: 5000, rows_url: '/rows', page_size: 20, row_offset: 40,
                                 search_params: 'sort=name', next_cursor: nil, refresh_url: nil),
          rows_count: 20
        )

        assert_equal 'offset', metadata.attributes.fetch('data-pvc-data-grid-pagination-mode').to_s
        assert_equal 5000, metadata.attributes.fetch('data-pvc-data-grid-total-count')
        assert_equal '/rows', metadata.attributes.fetch('data-pvc-data-grid-rows-url')
        assert_equal 20, metadata.attributes.fetch('data-pvc-data-grid-page-size')
        assert_equal 40, metadata.attributes.fetch('data-pvc-data-grid-row-offset')
        assert_equal 'sort=name', metadata.attributes.fetch('data-pvc-data-grid-search-params')
        assert_equal 20, metadata.attributes.fetch('data-pvc-data-grid-loaded-count')
        assert_equal 5001, metadata.rowcount
      end

      test 'cursor pagination keeps unknown totals at -1 until exhausted' do
        metadata = VirtualMetadata.new(
          layout: layout,
          pagination: pagination(mode: :cursor, total_count: nil, rows_url: '/cursor', page_size: 20, row_offset: 0,
                                 search_params: nil, next_cursor: 'opaque', refresh_url: '/refresh'),
          rows_count: 20
        )

        assert_equal 'cursor', metadata.attributes.fetch('data-pvc-data-grid-pagination-mode').to_s
        assert_equal 'opaque', metadata.attributes.fetch('data-pvc-data-grid-next-cursor')
        assert_nil metadata.attributes['data-pvc-data-grid-total-count']
        assert_equal(-1, metadata.rowcount)
      end

      test 'cursor pagination promotes discovered rowcount once exhausted' do
        metadata = VirtualMetadata.new(
          layout: layout,
          pagination: pagination(mode: :cursor, total_count: 1000, rows_url: '/cursor', page_size: 20, row_offset: 0,
                                 search_params: nil, next_cursor: nil, refresh_url: nil),
          rows_count: 22
        )

        assert_equal 23, metadata.rowcount
      end

      private

      def pagination(**attributes)
        VirtualPaginationConfig::Config.new(**attributes)
      end

      def layout
        {
          'data-pvc-data-grid-row-height' => 40,
          'data-pvc-data-grid-row-overscan' => 10,
          'data-pvc-data-grid-column-overscan' => 2,
          'data-pvc-data-grid-pinned-count' => 1,
          'data-pvc-data-grid-column-widths' => '120,200'
        }
      end
    end
  end
end
