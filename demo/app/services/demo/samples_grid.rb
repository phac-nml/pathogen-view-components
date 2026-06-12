# frozen_string_literal: true

module Demo
  # Shared DataGrid configuration for samples previews and row endpoints.
  module SamplesGrid
    DEFAULT_PAGE_SIZE = 50
    ROWS_URL = '/demo/samples/rows.json'

    module_function

    def build(rows:, pagination: {}, **options)
      Pathogen::DataGridComponent.new(
        virtual: true,
        sticky_columns: 2,
        rows: rows,
        virtual_pagination: pagination_defaults.merge(pagination),
        **options
      ).tap { |grid| add_columns!(grid) }
    end

    def pagination_defaults
      {
        total_count: Demo::SampleDataset::COUNT,
        rows_url: ROWS_URL,
        page_size: DEFAULT_PAGE_SIZE,
        row_offset: 0
      }
    end
    private_class_method :pagination_defaults

    def add_columns!(grid)
      grid.with_column('Sample ID', key: :puid, width: 160)
      grid.with_column('Name', key: :name, width: 260)
      grid.with_column('Organism', width: 220) { |row| helpers.tag.em(row[:organism]) }
      grid.with_column('Collected', key: :collected_at, width: 160)
      grid.with_column('Status', key: :status, width: 140)
      add_metric_columns!(grid)
    end
    private_class_method :add_columns!

    def add_metric_columns!(grid)
      (1..Demo::SampleDataset::METRIC_COLUMN_COUNT).each do |index|
        grid.with_column("Metric #{index}", key: :"metric_#{index}", width: 120)
      end
    end
    private_class_method :add_metric_columns!

    def helpers
      ActionController::Base.helpers
    end
    private_class_method :helpers
  end
end
