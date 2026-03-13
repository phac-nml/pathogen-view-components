# frozen_string_literal: true

module Pathogen
  # @label Data Grid
  class DataGridPreview < ViewComponent::Preview
    MASSIVE_ROW_COUNT = 25_000
    MASSIVE_COLUMN_COUNT = 10_000

    # @label Basic
    def basic
      render Pathogen::DataGridComponent.new(
        caption: 'Sample inventory (sticky columns preview)',
        sticky_columns: 2,
        rows: ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 140)
        grid.with_column('Name', key: :name)
        grid.with_column('Organism', key: :organism)
        grid.with_column('Collected', key: :collected_at)
        grid.with_column('Notes', key: :notes)
      end
    end

    # @label Without Caption
    def without_caption
      render Pathogen::DataGridComponent.new(
        sticky_columns: 1,
        rows: [
          { id: 'S-001', name: 'Sample one', status: 'Active' },
          { id: 'S-002', name: 'Sample two', status: 'Pending' }
        ]
      ) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name', key: :name)
        grid.with_column('Status', key: :status)
      end
    end

    # @label No Sticky Columns
    def no_sticky_columns
      render Pathogen::DataGridComponent.new(
        caption: 'Non-sticky grid',
        sticky_columns: 0,
        rows: [
          { sample_id: 'SAM-0101', name: 'Forest isolate', organism: 'E. coli' },
          { sample_id: 'SAM-0102', name: 'Wetland isolate', organism: 'Salmonella enterica' }
        ]
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id)
        grid.with_column('Name', key: :name)
        grid.with_column('Organism', key: :organism)
      end
    end

    # @label Custom Cells
    def custom_cells
      render Pathogen::DataGridComponent.new(
        caption: 'Custom cell rendering',
        sticky_columns: 1,
        rows: [
          { id: 'S-101', name: 'Aurora basin', status: 'Active', collected_at: '2026-01-19' },
          { id: 'S-102', name: 'Prairie creek', status: 'Pending', collected_at: '2026-01-27' }
        ]
      ) do |grid|
        grid.with_column('ID', key: :id, width: 120)
        grid.with_column('Name') { |row| tag.strong(row[:name]) }
        grid.with_column('Status') { |row| tag.span(row[:status], title: "Status: #{row[:status]}") }
        grid.with_column('Collected') { |row| tag.time(row[:collected_at]) }
      end
    end

    # @label Keyboard Navigation
    def keyboard_navigation
      render Pathogen::DataGridComponent.new(
        caption: 'Keyboard navigation exercise grid',
        sticky_columns: 1,
        rows: NAVIGATION_ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 160)
        grid.with_column('Name', key: :name, width: 260)
        grid.with_column('Organism', key: :organism, width: 220)
        grid.with_column('Collected', key: :collected_at, width: 160)
        grid.with_column('Status', key: :status, width: 140)
      end
    end

    # @label Keyboard Navigation with Interactive Cells
    def keyboard_navigation_with_interactive_cells
      render Pathogen::DataGridComponent.new(
        caption: 'Keyboard navigation with interactive cell content',
        sticky_columns: 1,
        rows: NAVIGATION_ROWS
      ) do |grid|
        grid.with_column('Sample ID', key: :sample_id, width: 160)
        grid.with_column('Name', key: :name, width: 260)
        grid.with_column('Organism', key: :organism, width: 220)
        grid.with_column('Actions', width: 240) { |row| interactive_actions(row) }
      end
    end

    # @label Massive Virtualized Grid (25k x 10k)
    def massive_virtualized_grid
      render_with_template(locals: {
                             massive_virtualized_component: massive_virtualized_component
                           })
    end

    ROWS = [
      {
        sample_id: 'SAM-0001',
        name: 'Northern lake isolate with extended name',
        organism: 'Listeria monocytogenes',
        collected_at: '2026-01-18',
        notes: 'Text spacing test: long content stays on one line to demonstrate auto column sizing.'
      },
      {
        sample_id: 'SAM-0002',
        name: 'Coastal sediment sample',
        organism: 'Vibrio parahaemolyticus',
        collected_at: '2026-01-24',
        notes: 'Longer notes area to validate overlap handling when sticky columns are enabled.'
      },
      {
        sample_id: 'SAM-0003',
        name: 'Prairie field isolate',
        organism: 'Campylobacter jejuni',
        collected_at: '2026-01-30',
        notes: 'Additional notes to showcase overflow behavior and sticky boundary.'
      }
    ].freeze

    NAVIGATION_ROWS = [
      {
        sample_id: 'SAM-1001', name: 'Northeast basin', organism: 'Listeria monocytogenes',
        collected_at: '2026-01-02', status: 'Review'
      },
      {
        sample_id: 'SAM-1002', name: 'East channel', organism: 'Salmonella enterica',
        collected_at: '2026-01-04', status: 'Active'
      },
      {
        sample_id: 'SAM-1003', name: 'South marsh', organism: 'Campylobacter jejuni',
        collected_at: '2026-01-05', status: 'Queued'
      },
      {
        sample_id: 'SAM-1004', name: 'West bank', organism: 'Vibrio parahaemolyticus',
        collected_at: '2026-01-07', status: 'Review'
      },
      {
        sample_id: 'SAM-1005', name: 'Delta terrace', organism: 'Escherichia coli',
        collected_at: '2026-01-09', status: 'Active'
      },
      {
        sample_id: 'SAM-1006', name: 'Upper inlet', organism: 'Yersinia enterocolitica',
        collected_at: '2026-01-10', status: 'Queued'
      },
      {
        sample_id: 'SAM-1007', name: 'Lower inlet', organism: 'Shigella sonnei',
        collected_at: '2026-01-12', status: 'Review'
      },
      {
        sample_id: 'SAM-1008', name: 'Pine ridge', organism: 'Bacillus cereus',
        collected_at: '2026-01-13', status: 'Active'
      },
      {
        sample_id: 'SAM-1009', name: 'Cedar ridge', organism: 'Staphylococcus aureus',
        collected_at: '2026-01-15', status: 'Queued'
      },
      {
        sample_id: 'SAM-1010', name: 'Willow ridge', organism: 'Klebsiella pneumoniae',
        collected_at: '2026-01-16', status: 'Review'
      },
      {
        sample_id: 'SAM-1011', name: 'North reserve', organism: 'Pseudomonas aeruginosa',
        collected_at: '2026-01-18', status: 'Active'
      },
      {
        sample_id: 'SAM-1012', name: 'South reserve', organism: 'Enterococcus faecalis',
        collected_at: '2026-01-19', status: 'Queued'
      }
    ].freeze

    private

    def massive_virtualized_component
      Pathogen::DataGridComponent.new(
        rows: [],
        caption: 'Virtualized benchmark grid',
        fill_container: true,
        virtual: true,
        virtual_dataset: massive_virtual_dataset,
        virtual_row_height: 44,
        virtual_overscan_rows: 8,
        virtual_overscan_columns: 4
      )
    end

    def massive_virtual_dataset
      {
        mode: 'synthetic',
        rowCount: MASSIVE_ROW_COUNT,
        columns: massive_virtual_columns
      }
    end

    def massive_virtual_columns
      @massive_virtual_columns ||= begin
        columns = [
          { id: 'sample_id', label: 'Sample ID', width: 180, sticky: true },
          { id: 'sample_name', label: 'Sample Name', width: 260, sticky: true },
          { id: 'details', label: 'Details', width: 200, kind: 'link' },
          { id: 'queue', label: 'Queue', width: 160, kind: 'button' }
        ]

        (MASSIVE_COLUMN_COUNT - columns.size).times do |index|
          width = 140 + ((index % 5) * 12)
          columns << { id: "meta_#{index + 1}", label: "Meta #{index + 1}", width: width }
        end

        columns
      end
    end

    def interactive_actions(row)
      helpers = ActionController::Base.helpers

      helpers.safe_join(
        [
          helpers.link_to('View', "/samples/#{row[:sample_id]}", class: 'pathogen-u-link'),
          helpers.render(Pathogen::Button.new(type: :button, size: :small)) do
            'Inspect'
          end
        ],
        ' '
      )
    end
  end
end
