# frozen_string_literal: true

require 'view_component_test_case'

module Pathogen
  # Virtual contract coverage for DataGrid lane and ARIA semantics.
  class DataGridComponentVirtualContractTest < ViewComponentTestCase
    def render_virtual_grid
      render_inline(Pathogen::DataGridComponent.new(
                      caption: 'Virtual contract grid',
                      virtual: true,
                      sticky_columns: 1,
                      rows: [
                        { id: 'S-001', name: 'Alpha', status: 'Ready' },
                        { id: 'S-002', name: 'Beta', status: 'Queued' }
                      ]
                    )) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name, width: 220)
        grid.with_column('Status', key: :status, width: 180)
      end
    end

    test 'virtual contract exposes aria-rowcount and aria-colcount with lane markers' do
      render_virtual_grid

      assert_selector 'div[role="grid"][aria-rowcount="3"][aria-colcount="3"]'
      assert_selector(
        '.pathogen-data-grid__row--header .pathogen-data-grid__lane[data-pathogen-data-grid-lane="pinned"]'
      )
      assert_selector(
        '.pathogen-data-grid__row--header .pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"]'
      )
      assert_selector(
        'div[role="row"][aria-rowindex="2"] .pathogen-data-grid__lane[data-pathogen-data-grid-lane="pinned"]'
      )
      assert_selector(
        'div[role="row"][aria-rowindex="2"] .pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"]'
      )
    end

    test 'virtual contract keeps global aria-colindex stable across pinned and center lanes' do
      render_virtual_grid

      assert_selector 'div[role="columnheader"][aria-colindex="1"]', text: 'ID'
      assert_selector 'div[role="columnheader"][aria-colindex="2"]', text: 'Name'
      assert_selector 'div[role="columnheader"][aria-colindex="3"]', text: 'Status'

      assert_selector 'div[role="row"][aria-rowindex="2"] div[role="gridcell"][aria-colindex="1"]', text: 'S-001'
      assert_selector 'div[role="row"][aria-rowindex="2"] div[role="gridcell"][aria-colindex="2"]', text: 'Alpha'
      assert_selector 'div[role="row"][aria-rowindex="2"] div[role="gridcell"][aria-colindex="3"]', text: 'Ready'

      assert_selector(
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"] ' \
        '[data-pathogen-data-grid-virtual-col-index="1"]'
      )
      assert_selector(
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"] ' \
        '[data-pathogen-data-grid-virtual-col-index="2"]'
      )
      assert_no_selector(
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="pinned"] ' \
        '[data-pathogen-data-grid-virtual-col-index]'
      )
    end

    test 'virtual contract preserves lane-scoped data column indexes through row rendering' do
      render_virtual_grid

      assert_selector(
        'div[role="row"][aria-rowindex="2"] ' \
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="pinned"] ' \
        'div[role="gridcell"][data-pathogen--data-grid-column-index="0"]'
      )
      assert_selector(
        'div[role="row"][aria-rowindex="2"] ' \
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"] ' \
        'div[role="gridcell"][data-pathogen--data-grid-column-index="1"]'
      )
      assert_selector(
        'div[role="row"][aria-rowindex="2"] ' \
        '.pathogen-data-grid__lane[data-pathogen-data-grid-lane="center"] ' \
        'div[role="gridcell"][data-pathogen--data-grid-column-index="2"]'
      )
    end
  end
end
