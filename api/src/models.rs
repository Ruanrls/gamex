use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Game {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub _id: Option<mongodb::bson::oid::ObjectId>,
    pub collection_address: String,
    pub candy_machine_address: String,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub executables: HashMap<String, String>, // { "target-triple": "url", ... }
    pub platforms: Vec<String>, // ["target-triple-1", "target-triple-2", ...]
    pub creator: String,
    pub metadata_uri: String,
    pub price_lamports: i64,
    #[serde(default = "Utc::now")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGameRequest {
    pub collection_address: String,
    pub candy_machine_address: String,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub executables: HashMap<String, String>, // { "target-triple": "url", ... }
    pub platforms: Vec<String>, // ["target-triple-1", "target-triple-2", ...]
    pub creator: String,
    pub metadata_uri: String,
    pub price_lamports: i64,
}

impl From<CreateGameRequest> for Game {
    fn from(req: CreateGameRequest) -> Self {
        Game {
            _id: None,
            collection_address: req.collection_address,
            candy_machine_address: req.candy_machine_address,
            name: req.name,
            description: req.description,
            image_url: req.image_url,
            executables: req.executables,
            platforms: req.platforms,
            creator: req.creator,
            metadata_uri: req.metadata_uri,
            price_lamports: req.price_lamports,
            created_at: Utc::now(),
        }
    }
}
