use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use mongodb::{bson::doc, Database};
use serde::Deserialize;
use serde_json::json;

use crate::models::{CreateGameRequest, Game};

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub categories: Option<Vec<String>>,
    pub min_price: Option<i64>,
    pub max_price: Option<i64>,
}

pub async fn create_game(
    State(db): State<Database>,
    Json(payload): Json<CreateGameRequest>,
) -> impl IntoResponse {
    println!("[BACKEND] Received create game request:");
    println!("[BACKEND] Name: {}", payload.name);
    println!("[BACKEND] Price lamports: {}", payload.price_lamports);

    let collection = db.collection::<Game>("games");
    let game: Game = payload.into();

    println!("[BACKEND] Game struct price_lamports: {}", game.price_lamports);

    match collection.insert_one(game.clone()).await {
        Ok(result) => {
            let mut response_game = game;
            response_game._id = Some(result.inserted_id.as_object_id().unwrap());

            println!("[BACKEND] Game inserted successfully with ID: {:?}", response_game._id);
            println!("[BACKEND] Returning price_lamports: {}", response_game.price_lamports);

            (StatusCode::CREATED, Json(response_game)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": format!("Failed to insert game: {}", e)
            })),
        )
            .into_response(),
    }
}

pub async fn get_all_games(State(db): State<Database>) -> impl IntoResponse {
    let collection = db.collection::<Game>("games");

    match collection.find(doc! {}).await {
        Ok(mut cursor) => {
            let mut games = Vec::new();

            while let Ok(true) = cursor.advance().await {
                match cursor.deserialize_current() {
                    Ok(game) => {
                        println!("[BACKEND] Deserialized game: {} with price: {}", game.name, game.price_lamports);
                        games.push(game);
                    },
                    Err(e) => {
                        eprintln!("[BACKEND] Failed to deserialize game: {}", e);
                    }
                }
            }

            println!("[BACKEND] Returning {} games", games.len());
            (StatusCode::OK, Json(games)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": format!("Failed to fetch games: {}", e)
            })),
        )
            .into_response(),
    }
}

pub async fn search_games(
    State(db): State<Database>,
    Query(params): Query<SearchQuery>,
) -> impl IntoResponse {
    let collection = db.collection::<Game>("games");

    // Build filter document with $and operator
    let mut filters = Vec::new();

    // Add name filter if provided
    if let Some(q) = params.q {
        if !q.is_empty() {
            filters.push(doc! {
                "name": {
                    "$regex": q,
                    "$options": "i"
                }
            });
        }
    }

    // Add categories filter if provided (game must have ALL selected categories)
    if let Some(categories) = params.categories {
        if !categories.is_empty() {
            filters.push(doc! {
                "categories": {
                    "$all": categories
                }
            });
        }
    }

    // Add price range filter
    let mut price_filter = doc! {};
    if let Some(min_price) = params.min_price {
        price_filter.insert("$gte", min_price);
    }
    if let Some(max_price) = params.max_price {
        price_filter.insert("$lte", max_price);
    }
    if !price_filter.is_empty() {
        filters.push(doc! {
            "price_lamports": price_filter
        });
    }

    // Combine all filters with $and, or use empty filter if no filters provided
    let final_filter = if filters.is_empty() {
        doc! {}
    } else {
        doc! {
            "$and": filters
        }
    };

    match collection.find(final_filter).await {
        Ok(mut cursor) => {
            let mut games = Vec::new();

            while let Ok(true) = cursor.advance().await {
                if let Ok(game) = cursor.deserialize_current() {
                    games.push(game);
                }
            }

            (StatusCode::OK, Json(games)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": format!("Failed to search games: {}", e)
            })),
        )
            .into_response(),
    }
}
