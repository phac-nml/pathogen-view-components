# frozen_string_literal: true

require 'test_helper'

module Pathogen
  module DataGrid
    # Unit tests for ColumnComponent
    class ColumnComponentTest < ActiveSupport::TestCase
      test 'initializes with label' do
        column = ColumnComponent.new(label: 'Name')
        assert_equal 'Name', column.label
      end

      test 'initializes with all options' do
        column = ColumnComponent.new(label: 'ID', key: :id, width: 120, align: :right, sticky: true, sticky_left: 0)
        assert_equal 'ID', column.label
        assert_equal :id, column.key
        assert_equal 120, column.width
        assert_equal :right, column.align
        assert column.sticky
        assert_equal 0, column.sticky_left
      end

      test 'header_cell_attributes returns correct classes' do
        column = ColumnComponent.new(label: 'Name', key: :name)
        attrs = column.header_cell_attributes(column_index: 0)

        assert_includes attrs[:class], 'sticky'
        assert_includes attrs[:class], 'top-0'
        assert_equal 'columnheader', attrs[:role]
        assert_equal(-1, attrs[:tabindex])
      end

      test 'body_cell_attributes returns correct classes' do
        column = ColumnComponent.new(label: 'Name', key: :name)
        attrs = column.body_cell_attributes(row_index: 1, column_index: 0)

        assert_includes attrs[:class], 'min-h-10'
        assert_includes attrs[:class], 'box-border'
        assert_equal 'gridcell', attrs[:role]
        assert_equal(-1, attrs[:tabindex])
      end

      test 'attributes include sticky class when sticky' do
        column = ColumnComponent.new(label: 'ID', key: :id, sticky: true, sticky_left: 0)
        attrs = column.header_cell_attributes(column_index: 0)

        assert_equal true, attrs[:data][:sticky_cell]
        assert_includes attrs[:style], '--pvc-data-grid-sticky-left: 0px;'
      end

      test 'attributes include alignment class when align specified' do
        column = ColumnComponent.new(label: 'Amount', key: :amount, align: :right)
        attrs = column.body_cell_attributes(row_index: 1, column_index: 0)

        assert_includes attrs[:class], 'text-right'
      end

      test 'attributes include width style when width specified' do
        column = ColumnComponent.new(label: 'ID', key: :id, width: '150px')
        attrs = column.header_cell_attributes(column_index: 0)

        assert_includes attrs[:style], '--pvc-data-grid-col-width: 150px;'
      end

      test 'preserves caller HTML and ARIA attributes while protecting grid semantics' do
        column = ColumnComponent.new(
          label: 'Name', title: 'Full sample name', role: 'button', tabindex: 3,
          aria: { label: 'Sample name', colindex: 99, sort: 'ascending' }
        )
        header = column.header_cell_attributes(column_index: 1)
        body = column.body_cell_attributes(row_index: 1, column_index: 1)

        assert_equal 'Full sample name', header[:title]
        assert_equal 'Sample name', header[:aria][:label]
        assert_equal 'ascending', header[:aria][:sort]
        assert_equal 2, header[:aria][:colindex]
        assert_equal 'columnheader', header[:role]
        assert_equal(-1, header[:tabindex])
        assert_equal 'Full sample name', body[:title]
        assert_equal 'Sample name', body[:aria][:label]
        assert_not body[:aria].key?(:sort)
        assert_equal 'gridcell', body[:role]
      end

      test 'regular table cells preserve ARIA labels without adding column indexes' do
        column = ColumnComponent.new(label: 'Name', aria: { 'label' => 'Sample name', 'colindex' => 99 })

        attributes = column.header_cell_attributes(column_index: 0, aria_column_index: nil)

        assert_equal({ label: 'Sample name' }, attributes[:aria])
      end

      test 'flat caller attributes cannot override generated cell coordinates and targets' do
        column = ColumnComponent.new(
          label: 'Name', id: 'name-col', 'role' => 'button', 'tabindex' => 3, 'aria-colindex' => 99,
          'aria-sort' => 'ascending',
          'data-pathogen--data-grid-row-index' => 99, 'data-pathogen--data-grid-column-index' => 99,
          'data-pathogen--data-grid-target' => 'other', 'data-pathogen--data-grid-has-interactive' => true,
          'data-pvc-data-grid-virtual-col-index' => 99, 'data-sticky-cell' => true
        )
        header = column.header_cell_attributes(column_index: 1)
        body = column.body_cell_attributes(row_index: 2, column_index: 1)

        assert_equal 'ascending', header[:aria][:sort]
        assert_equal 'columnheader', header[:role]
        assert_equal(-1, header[:tabindex])
        assert_not header.key?(:id)
        assert_not body.key?(:id)
        assert_empty body.keys.grep(/\A(?:data-|aria-)/)
        assert_equal 2, body[:data][:'pathogen--data-grid-row-index']
        assert_equal 1, body[:data][:'pathogen--data-grid-column-index']
        assert_equal 'cell', body[:data][:'pathogen--data-grid-target']
        assert_not body[:aria].key?(:sort)
      end

      test 'caller styles are retained before generated column styles' do
        column = ColumnComponent.new(label: 'Name', width: '160px', style: 'font-style: italic')

        attributes = column.header_cell_attributes(column_index: 0)

        assert_equal 'font-style: italic; --pvc-data-grid-col-width: 160px;', attributes[:style]
      end

      test 'nested data preserves extra targets while protecting generated grid hooks' do
        column = ColumnComponent.new(label: 'Name', data: {
                                       pathogen__data_grid_target: 'extra', pathogen__data_grid_row_index: 99,
                                       pvc_data_grid_virtual_col_index: 99, sticky_cell: true
                                     })

        attributes = column.body_cell_attributes(row_index: 2, column_index: 1)

        assert_equal 'extra cell', attributes[:data][:'pathogen--data-grid-target']
        assert_equal 2, attributes[:data][:'pathogen--data-grid-row-index']
        assert_not attributes[:data].key?(:'pvc-data-grid-virtual-col-index')
        assert_not attributes[:data].key?(:'sticky-cell')
      end

      test 'body_cell_attributes marks active body cell as focus target' do
        column = ColumnComponent.new(label: 'Name', key: :name)
        attrs = column.body_cell_attributes(row_index: 1, column_index: 0, state: { active: true })

        assert_equal 0, attrs[:tabindex]
      end

      test 'body_cell_attributes sets interactive marker when interactive content is present' do
        column = ColumnComponent.new(label: 'Actions')
        attrs = column.body_cell_attributes(row_index: 1, column_index: 1, state: { interactive: true })

        assert_equal true, attrs[:data][:'pathogen--data-grid-has-interactive']
      end

      test 'interactive? returns false by default' do
        column = ColumnComponent.new(label: 'Name', key: :name)

        assert_equal false, column.interactive?
      end

      test 'interactive? returns true when declared' do
        column = ColumnComponent.new(label: 'Actions', interactive: true)

        assert_equal true, column.interactive?
      end

      test 'render_value uses renderer when provided' do
        column = ColumnComponent.new(label: 'Name', renderer: ->(row, _index) { row[:name].upcase })
        result = column.render_value({ name: 'test' }, 0)

        assert_equal 'TEST', result
      end

      test 'render_value uses block when renderer is not provided' do
        column = ColumnComponent.new(label: 'Name', key: :name) { |row, _index| row[:name].upcase }
        result = column.render_value({ name: 'test' }, 0)

        assert_equal 'TEST', result
      end

      test 'renderer takes precedence over block' do
        column = ColumnComponent.new(label: 'Name', renderer: ->(_row, _index) { 'renderer' }) do |_row, _index|
          'block'
        end
        result = column.render_value({}, 0)

        assert_equal 'renderer', result
      end

      test 'render_value uses key for hash row' do
        column = ColumnComponent.new(label: 'Name', key: :name)
        result = column.render_value({ name: 'Sample' }, 0)

        assert_equal 'Sample', result
      end

      test 'render_value uses string key for hash row' do
        column = ColumnComponent.new(label: 'Name', key: :name)
        result = column.render_value({ 'name' => 'Sample' }, 0)

        assert_equal 'Sample', result
      end

      test 'render_value uses index for array row' do
        column = ColumnComponent.new(label: 'First')
        result = column.render_value(%w[a b c], 1)

        assert_equal 'b', result
      end

      test 'normalize_width! converts numeric to px string' do
        column = ColumnComponent.new(label: 'ID', key: :id, width: 120)
        column.normalize_width!

        assert_equal '120px', column.width
      end

      test 'normalize_width! preserves string width' do
        column = ColumnComponent.new(label: 'ID', key: :id, width: '10rem')
        column.normalize_width!

        assert_equal '10rem', column.width
      end

      test 'normalize_width! handles blank width' do
        column = ColumnComponent.new(label: 'ID', key: :id)
        column.normalize_width!

        assert_nil column.width
      end

      test 'width_px extracts pixel value' do
        column = ColumnComponent.new(label: 'ID', key: :id, width: '150px')

        assert_equal 150.0, column.width_px
      end

      test 'width_px returns nil for non-px width' do
        column = ColumnComponent.new(label: 'ID', key: :id, width: '10rem')

        assert_nil column.width_px
      end

      test 'width_px handles decimal values' do
        column = ColumnComponent.new(label: 'ID', key: :id, width: '123.5px')

        assert_equal 123.5, column.width_px
      end
    end
  end
end
