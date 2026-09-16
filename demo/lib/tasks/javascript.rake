# frozen_string_literal: true

namespace :javascript do
  desc 'Build demo JavaScript using the canonical demo entrypoint'
  task :build do # rubocop:disable Rails/RakeEnvironment
    sh Rails.root.join('bin/build-javascript').to_s
  end
end

Rake::Task['assets:precompile'].enhance(['javascript:build'])
Rake::Task['test:prepare'].enhance(['javascript:build'])
