# frozen_string_literal: true

json.rows @cursor_page.rows.each_with_index.to_a do |sample, index|
  row_index = @cursor_page.offset + index
  json.id sample.fetch(:puid)
  json.index row_index
  json.html render(
    partial: 'demo/samples/row',
    formats: [:html],
    locals: { sample: sample, row_index: row_index, grid: @grid }
  )
end
json.next_cursor @cursor_page.next_cursor
