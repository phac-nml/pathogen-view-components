# frozen_string_literal: true

module Demo
  # JSON rows endpoint for paginated virtual DataGrid previews.
  class SamplesController < ApplicationController
    MAX_LIMIT = 100
    DEFAULT_LIMIT = Demo::SamplesGrid::DEFAULT_PAGE_SIZE

    def rows
      limit = clamp_limit(params.fetch(:limit, DEFAULT_LIMIT).to_i)
      page = [params.fetch(:page, 1).to_i, 1].max
      dataset = Demo::SampleDataset.filter(params)
      @pagy, @samples = pagy(:offset, dataset, limit: limit, page: page)
      @grid = Demo::SamplesGrid.build(
        rows: [],
        pagination: { total_count: dataset.size, row_offset: @pagy.offset }
      )
      @grid.before_render

      respond_to do |format|
        format.json
      end
    end

    private

    def clamp_limit(limit)
      return DEFAULT_LIMIT if limit <= 0

      [limit, MAX_LIMIT].min
    end
  end
end
