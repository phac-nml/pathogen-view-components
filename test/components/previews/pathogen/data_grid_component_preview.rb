# frozen_string_literal: true

module Pathogen
  class DataGridComponentPreview < ViewComponent::Preview
    SAMPLE_ROWS = [
      { id: 1, name: "Sample A", status: "Active", created: "2024-01-15" },
      { id: 2, name: "Sample B", status: "Pending", created: "2024-02-20" },
      { id: 3, name: "Sample C", status: "Inactive", created: "2024-03-05" }
    ].freeze

    def default
      render Pathogen::DataGridComponent.new(rows: SAMPLE_ROWS, caption: "Samples") do |grid|
        grid.with_column("ID", key: :id, width: 80)
        grid.with_column("Name", key: :name, width: 200)
        grid.with_column("Status", key: :status, width: 120)
        grid.with_column("Created", key: :created, width: 160)
      end
    end

    def empty_state
      render Pathogen::DataGridComponent.new(rows: [], caption: "No Data") do |grid|
        grid.with_column("ID", key: :id)
        grid.with_column("Name", key: :name)
        grid.with_empty_state { "No records found." }
      end
    end

    def sticky_columns
      render Pathogen::DataGridComponent.new(rows: SAMPLE_ROWS, sticky_columns: 1) do |grid|
        grid.with_column("ID", key: :id, width: 80, sticky: true)
        grid.with_column("Name", key: :name, width: 200)
        grid.with_column("Status", key: :status, width: 120)
        grid.with_column("Created", key: :created, width: 160)
      end
    end
  end
end
