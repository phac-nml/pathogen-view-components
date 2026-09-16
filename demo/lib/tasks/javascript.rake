# frozen_string_literal: true

namespace :javascript do
  desc 'Build demo JavaScript using the repository package and lockfile'
  task :build do # rubocop:disable Rails/RakeEnvironment
    sh 'pnpm', '--dir', Rails.root.parent.to_s, 'run', 'build:js'
  end
end

Rake::Task['assets:precompile'].enhance(['javascript:build'])
Rake::Task['test:prepare'].enhance(['javascript:build'])
