use mongodb::{Client, Database};
use std::env;

pub async fn connect() -> Result<Database, mongodb::error::Error> {
    let mongodb_uri = env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());

    let client = Client::with_uri_str(&mongodb_uri).await?;

    let database_name = env::var("DATABASE_NAME")
        .unwrap_or_else(|_| "gamex".to_string());

    Ok(client.database(&database_name))
}
