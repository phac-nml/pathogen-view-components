# frozen_string_literal: true

json.pagy do
  json.page @pagy.page
  json.limit @pagy.limit
  json.count @pagy.count
  json.pages @pagy.pages
  json.prev @pagy.previous
  json.next @pagy.next
end

if @samples.empty?
  json.rows []
else
  json.rows do
    @samples.each_with_index do |sample, index|
      row_index = @pagy.offset + index
      json.child! do
        json.index row_index
        json.html render(
          partial: 'demo/samples/row',
          formats: [:html],
          locals: { sample: sample, row_index: row_index, grid: @grid }
        )
      end
    end
  end
end
