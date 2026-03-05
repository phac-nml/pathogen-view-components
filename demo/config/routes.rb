Rails.application.routes.draw do
  mount Lookbook::Engine, at: '/lookbook' if defined?(Lookbook)

  root to: redirect('/lookbook')
end
