# frozen_string_literal: true

require 'view_component_test_case'

module Pathogen
  module DataGrid
    # Rows endpoints render individual rows without rendering the parent grid.
    class VirtualRowComponentTest < ViewComponentTestCase
      test 'standalone rows prepare sticky columns and safely render interactive cells' do
        grid = build_grid
        grid.with_column('ID', key: :id, width: 160)
        grid.with_column('Name', width: 220, renderer: lambda { |row, _index|
          ActionController::Base.helpers.link_to(row[:name], "/samples/#{row[:id]}")
        })

        render_inline(VirtualRowComponent.new(
                        grid: grid, row: { id: 'S-021', name: '<script>Example</script>' }, global_row_index: 20
                      ))

        assert_selector '[role="row"][aria-rowindex="22"][data-pvc-data-grid-global-row-index="20"]'
        assert_selector '[data-pvc-data-grid-lane="pinned"] [data-sticky-cell]', text: 'S-021'
        assert_selector '[data-pvc-data-grid-lane="pinned"][style*="grid-template-columns: 160.0px"]'
        assert_selector '[data-pvc-data-grid-lane="center"][style*="grid-template-columns: 220.0px"]'
        assert_selector '[role="gridcell"][data-pathogen--data-grid-has-interactive="true"] a[tabindex="-1"]',
                        text: '<script>Example</script>'
        assert_no_selector 'script'
      end

      test 'standalone rows preserve escaping for plain strings' do
        grid = build_grid
        grid.with_column('ID', key: :id, width: 160)

        render_inline(VirtualRowComponent.new(
                        grid: grid, row: { id: '<button>Example</button>' }, global_row_index: 20
                      ))

        assert_selector '[role="gridcell"][data-pathogen--data-grid-has-interactive="false"]',
                        text: '<button>Example</button>'
        assert_no_selector 'button'
      end

      test 'hidden inputs and anchors without href do not mark a cell interactive' do
        grid = build_grid
        grid.with_column('ID', width: 160, renderer: lambda { |_row, _index|
          helpers = ActionController::Base.helpers
          helpers.safe_join([helpers.tag.a('Example'), helpers.hidden_field_tag('sample_id', 'S-021')])
        })

        render_inline(VirtualRowComponent.new(grid: grid, row: {}, global_row_index: 20))

        assert_selector '[role="gridcell"][data-pathogen--data-grid-has-interactive="false"]'
        assert_no_selector 'a[tabindex]'
        assert_no_selector 'input[tabindex]', visible: :all
      end

      private

      def build_grid
        Pathogen::DataGridComponent.new(
          rows: [], virtual: true, sticky_columns: 1,
          virtual_pagination: { total_count: 100, rows_url: '/samples/rows.json', row_offset: 20 }
        )
      end
    end
  end
end
