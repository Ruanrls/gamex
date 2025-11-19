mod db;
mod handlers;
mod models;

use axum::{
    routing::{get, post},
    Router,
};
use dotenv::dotenv;
use std::env;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    dotenv().ok();

    let database = db::connect()
        .await
        .expect("Failed to connect to MongoDB");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/games", post(handlers::create_game))
        .route("/games", get(handlers::get_all_games))
        .route("/games/search", get(handlers::search_games))
        .layer(cors)
        .with_state(database);

    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("0.0.0.0:{}", port);

    println!("GameX API server running on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
}
